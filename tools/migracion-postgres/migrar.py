#!/usr/bin/env python3
"""
Migracion de los datos de HealthArchive desde el backup de SQL Server al Postgres nuevo.

Va en dos etapas separadas a proposito:

  extraer   lee el .bak y deja todo en archivos locales. No toca la red ni la base.
  cargar    inserta lo relacional en Postgres, en una sola transaccion.
  archivos  sube los adjuntos (varios GB), aparte y de a lotes reanudables.

La separacion existe porque lo relacional son unos pocos MB y se puede repetir barato,
y los adjuntos son 3,6 GB que conviene mirar de cerca antes de mandar.

Uso: ver README.md.
"""

from __future__ import annotations

import argparse
import base64
import collections
import csv
import datetime
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import esquema  # noqa: E402
import identity_hash  # noqa: E402
from sqlserver_bak import BackupSqlServer, PunteroLob  # noqa: E402

# Doctor que queda como Admin ademas del usuario nuevo. Acordado con el consultorio.
ADMIN_EXISTENTE = "fazar@intramed.net"

ROL_DOCTOR = "Doctor"
ROL_ADMIN = "Admin"

# Fecha a partir de la cual una fecha de nacimiento deja de ser plausible y pasa al
# reporte. No se corrige nada: son datos de carga del consultorio, no corrupcion.
ANIO_MINIMO_PLAUSIBLE = 1900

# Espacio que hay que dejarle al WAL dentro del volumen. Medido: una carga masiva de
# 3 GB deja pg_wal en ~1 GB. `pg_database_size` no lo ve, y el tamano del volumen no se
# puede consultar por SQL, asi que el operador lo declara con --volumen-gb.
RESERVA_WAL_GB = 1.2

TABLAS_DESTINO = ["Consultorios", "Doctors", "RefreshTokens", "Patients", "HCEs", "Evolutions", "HCEFiles"]

# Conteos acotados al consultorio destino. Importa porque la base puede tener otros
# consultorios legitimos: el modelo de aislamiento es justamente ese, y una migracion
# no tiene por que ser la unica cosa viva en la base. HCE, Evolution y HCEFile no
# llevan ConsultorioId propio (lo heredan por HCE -> Patient), asi que se llega por join.
CONTEO_EN_CONSULTORIO = {
    "Doctors": 'SELECT count(*) FROM "Doctors" WHERE "ConsultorioId" = %s',
    "Patients": 'SELECT count(*) FROM "Patients" WHERE "ConsultorioId" = %s',
    "RefreshTokens": 'SELECT count(*) FROM "RefreshTokens" t '
                     'JOIN "Doctors" d ON d."Id" = t."DoctorId" WHERE d."ConsultorioId" = %s',
    "HCEs": 'SELECT count(*) FROM "HCEs" h '
            'JOIN "Patients" p ON p."Id" = h."PatientId" WHERE p."ConsultorioId" = %s',
    "Evolutions": 'SELECT count(*) FROM "Evolutions" e JOIN "HCEs" h ON h."Id" = e."HCEId" '
                  'JOIN "Patients" p ON p."Id" = h."PatientId" WHERE p."ConsultorioId" = %s',
    "HCEFiles": 'SELECT count(*) FROM "HCEFiles" f JOIN "HCEs" h ON h."Id" = f."HCEId" '
                'JOIN "Patients" p ON p."Id" = h."PatientId" WHERE p."ConsultorioId" = %s',
}


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #

class _JsonExtra(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, uuid.UUID):
            return str(o)
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        return super().default(o)


def _escribir_ndjson(ruta: Path, filas) -> int:
    n = 0
    with ruta.open("w", encoding="utf-8") as f:
        for fila in filas:
            f.write(json.dumps(fila, cls=_JsonExtra, ensure_ascii=False))
            f.write("\n")
            n += 1
    return n


def _leer_ndjson(ruta: Path):
    with ruta.open(encoding="utf-8") as f:
        for linea in f:
            if linea.strip():
                yield json.loads(linea)


def _conectar():
    """Abre la conexion a Postgres. La URL siempre viene del entorno, nunca del repo."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit(
            "Falta DATABASE_URL.\n"
            "  export DATABASE_URL='postgresql://usuario:clave@host:puerto/base'\n"
            "En Railway esta en la pestana Variables del servicio de Postgres."
        )
    try:
        import psycopg
    except ImportError:
        sys.exit(
            "Falta psycopg. Desde la raiz del repo:\n"
            "  python3 -m venv .venv\n"
            "  .venv/bin/pip install -r tools/migracion-postgres/requirements.txt\n"
            "  .venv/bin/python tools/migracion-postgres/migrar.py ..."
        )
    return psycopg.connect(url)


def _abrir_backup(args) -> BackupSqlServer:
    """
    Abre el .bak diciendo en voz alta que backup set se esta usando.

    Un mismo archivo puede tener varios sets encadenados (`BACKUP DATABASE` agrega si no
    le pasan `WITH INIT`). Por defecto se usa el ultimo, que es el mas reciente; elegir
    mal significa migrar datos viejos, asi que conviene que se vea.
    """
    bak = BackupSqlServer(str(Path(args.bak).expanduser()), backup_set=getattr(args, "backup_set", None))
    if len(bak.streams) > 1:
        print(f"El archivo tiene {len(bak.streams)} backup sets; usando el {bak.backup_set} "
              f"({'el mas reciente' if bak.backup_set == len(bak.streams) else 'elegido a mano'}).")
    return bak


def _tamanio_base(cur) -> int:
    cur.execute("SELECT pg_database_size(current_database())")
    return cur.fetchone()[0]


def _gb(n: int) -> str:
    return f"{n / 2**30:.2f} GB"


# --------------------------------------------------------------------------- #
# extraer
# --------------------------------------------------------------------------- #

def _password_admin_nuevo() -> tuple[str, bool]:
    """Devuelve (password, generada). Si no viene por entorno, se genera una."""
    desde_entorno = os.environ.get("ADMIN_PASSWORD")
    if desde_entorno:
        return desde_entorno, False
    return identity_hash.password_aleatoria(), True


def _extraer_doctores(bak: BackupSqlServer, salida: Path) -> tuple[int, str | None]:
    """
    Escribe Doctors.ndjson con las contrasenas ya hasheadas y agrega el admin nuevo.

    Las contrasenas del origen estan en texto plano (el login viejo las comparaba tal
    cual); se hashean aca y el texto plano no se guarda en ningun lado.
    """
    filas = []
    for fila in bak.filas(esquema.DOCTORS):
        email = fila["Email"]
        filas.append(
            {
                "Id": fila["Id"],
                "Name": fila["Name"],
                "LastName": fila["LastName"],
                "Email": email,
                "Password": identity_hash.hashear(fila["Password"]),
                "PhoneNumber_CountryCode": fila["PhoneNumber_CountryCode"],
                "PhoneNumber_PhoneNumber": fila["PhoneNumber_PhoneNumber"],
                "Tuition": fila["Tuition"],
                "Description": fila["Description"],
                "Role": ROL_ADMIN if email.lower() == ADMIN_EXISTENTE else ROL_DOCTOR,
                "ConsultorioId": esquema.CONSULTORIO_INICIAL,
            }
        )

    if not any(f["Role"] == ROL_ADMIN for f in filas):
        sys.exit(f"No aparecio {ADMIN_EXISTENTE} entre los doctores: nadie quedaria como Admin.")

    email_admin = os.environ.get("ADMIN_EMAIL", "fernandeznicolas1801psn@gmail.com")
    if any(f["Email"].lower() == email_admin.lower() for f in filas):
        sys.exit(f"{email_admin} ya existe entre los doctores del backup; elegi otro ADMIN_EMAIL.")

    password, generada = _password_admin_nuevo()
    filas.append(
        {
            # Determinístico sobre el email: repetir la extraccion da el mismo Id y no
            # duplica el usuario.
            "Id": uuid.uuid5(uuid.NAMESPACE_URL, f"healtharchive:doctor:{email_admin.lower()}"),
            "Name": "Nicolas",
            "LastName": "Fernandez",
            "Email": email_admin,
            "Password": identity_hash.hashear(password),
            "PhoneNumber_CountryCode": None,
            "PhoneNumber_PhoneNumber": None,
            "Tuition": "ADMIN",
            "Description": "Administrador del sistema",
            "Role": ROL_ADMIN,
            "ConsultorioId": esquema.CONSULTORIO_INICIAL,
        }
    )

    n = _escribir_ndjson(salida / "Doctors.ndjson", filas)
    return n, (password if generada else None)


def _desambiguar_dni(pacientes: list[dict], evos_por_paciente, archivos_por_paciente, salida: Path) -> int:
    """
    Resuelve los DNI repetidos, que el indice unico del esquema nuevo no acepta.

    Conserva el DNI original el paciente con mas evoluciones (desempate: mas archivos,
    despues el Id, para que el resultado no dependa del orden de lectura). A los demas
    se les agrega sufijo y salen en un CSV para unificarlos a mano desde la app.
    """
    por_dni = collections.defaultdict(list)
    for p in pacientes:
        por_dni[p["DNI"]].append(p)

    filas_reporte = []
    for dni, grupo in por_dni.items():
        if len(grupo) == 1:
            continue
        grupo.sort(
            key=lambda p: (-evos_por_paciente[p["Id"]], -archivos_por_paciente[p["Id"]], str(p["Id"]))
        )
        for i, p in enumerate(grupo):
            nuevo = dni if i == 0 else f"{dni}-{i + 1}"
            filas_reporte.append(
                {
                    "DNI_original": dni,
                    "DNI_asignado": nuevo,
                    "Id": str(p["Id"]),
                    "Nombre": p["Name"],
                    "Apellido": p["LastName"],
                    "FechaNacimiento": p["BirthDate"].date().isoformat(),
                    "Evoluciones": evos_por_paciente[p["Id"]],
                    "Archivos": archivos_por_paciente[p["Id"]],
                    "Conserva_DNI": "si" if i == 0 else "no",
                }
            )
            p["DNI"] = nuevo

    if filas_reporte:
        with (salida / "reporte-dni-duplicados.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(filas_reporte[0]))
            w.writeheader()
            w.writerows(filas_reporte)

    return len(filas_reporte)


def cmd_extraer(args) -> None:
    salida = Path(args.out).expanduser()
    salida.mkdir(parents=True, exist_ok=True)

    resumen: dict = {"backup": str(Path(args.bak).expanduser()), "tablas": {}}

    with _abrir_backup(args) as bak:
        resumen["backup_set"] = bak.backup_set
        print("Leyendo el backup...")

        # Primero las tablas que no necesitan transformacion, que ademas dan los
        # conteos que hacen falta para desambiguar los DNI.
        hces = list(bak.filas(esquema.HCES))
        evoluciones = list(bak.filas(esquema.EVOLUTIONS))
        archivos = list(bak.filas(esquema.HCEFILES))
        pacientes = list(bak.filas(esquema.PATIENTS))

        # Un backup mas nuevo trae mas filas y eso esta bien. Menos filas no: o se leyo
        # mal, o se apunto a un backup set viejo, que es justo el error que hay que
        # evitar cuando el .bak tiene varios encadenados.
        nuevas = []
        for tabla, filas in (
            (esquema.HCES, hces),
            (esquema.EVOLUTIONS, evoluciones),
            (esquema.HCEFILES, archivos),
            (esquema.PATIENTS, pacientes),
        ):
            if len(filas) < tabla.filas_esperadas:
                sys.exit(
                    f"{tabla.nombre}: se leyeron {len(filas)} filas y el backup de "
                    f"referencia tenia {tabla.filas_esperadas}. Faltan filas: revisar que "
                    f"el backup set sea el correcto (--backup-set) antes de seguir.\n"
                    f"El archivo tiene {len(bak.streams)} sets y se uso el {bak.backup_set}."
                )
            if len(filas) > tabla.filas_esperadas:
                nuevas.append(f"{tabla.nombre} +{len(filas) - tabla.filas_esperadas}")
        if nuevas:
            print(f"Filas nuevas respecto del backup de referencia: {', '.join(nuevas)}")

        paciente_de_hce = {h["Id"]: h["PatientId"] for h in hces}
        ids_pacientes = {p["Id"] for p in pacientes}

        # Integridad referencial del origen. Deberia estar limpia (las FK las hacia
        # cumplir SQL Server), pero si el lector se equivoco en algo aparece aca.
        huerfanos = {
            "HCEs sin paciente": sum(1 for h in hces if h["PatientId"] not in ids_pacientes),
            "Evolutions sin HCE": sum(1 for e in evoluciones if e["HCEId"] not in paciente_de_hce),
            "HCEFiles sin HCE": sum(1 for a in archivos if a["HCEId"] not in paciente_de_hce),
        }
        if any(huerfanos.values()):
            sys.exit(f"El origen tiene filas huerfanas: {huerfanos}")
        if len({h["PatientId"] for h in hces}) != len(hces):
            sys.exit("Hay pacientes con mas de una HCE; el indice unico del esquema nuevo lo rechaza.")

        evos_por_paciente = collections.Counter(paciente_de_hce[e["HCEId"]] for e in evoluciones)
        archivos_por_paciente = collections.Counter(paciente_de_hce[a["HCEId"]] for a in archivos)

        # -- doctores ------------------------------------------------------- #
        n_doctores, password_generada = _extraer_doctores(bak, salida)
        resumen["tablas"]["Doctors"] = n_doctores

        # -- pacientes ------------------------------------------------------ #
        renombrados = _desambiguar_dni(pacientes, evos_por_paciente, archivos_por_paciente, salida)

        sospechosas = [
            {
                "Id": str(p["Id"]),
                "Nombre": p["Name"],
                "Apellido": p["LastName"],
                "DNI": p["DNI"],
                "FechaNacimiento": p["BirthDate"].isoformat(),
            }
            for p in pacientes
            if p["BirthDate"].year < ANIO_MINIMO_PLAUSIBLE
        ]
        if sospechosas:
            with (salida / "reporte-fechas-sospechosas.csv").open("w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=list(sospechosas[0]))
                w.writeheader()
                w.writerows(sospechosas)

        for p in pacientes:
            p["ConsultorioId"] = esquema.CONSULTORIO_INICIAL

        resumen["tablas"]["Patients"] = _escribir_ndjson(salida / "Patients.ndjson", pacientes)
        resumen["tablas"]["HCEs"] = _escribir_ndjson(salida / "HCEs.ndjson", hces)
        resumen["tablas"]["Evolutions"] = _escribir_ndjson(salida / "Evolutions.ndjson", evoluciones)

        # De los adjuntos solo los metadatos: el contenido se sube directo desde el
        # backup en la etapa `archivos`, sin pasar por el disco.
        bytes_adjuntos = 0
        metadatos = []
        for a in archivos:
            contenido = a["Content"]
            largo = contenido.largo if isinstance(contenido, PunteroLob) else len(contenido)
            bytes_adjuntos += largo
            metadatos.append(
                {"Id": a["Id"], "FileName": a["FileName"], "HCEId": a["HCEId"], "Bytes": largo}
            )
        resumen["tablas"]["HCEFiles"] = _escribir_ndjson(salida / "HCEFiles.ndjson", metadatos)
        resumen["bytes_adjuntos"] = bytes_adjuntos
        resumen["dni_renombrados"] = renombrados
        resumen["fechas_sospechosas"] = len(sospechosas)

    (salida / "resumen.json").write_text(json.dumps(resumen, indent=2), encoding="utf-8")

    print()
    for nombre, n in resumen["tablas"].items():
        print(f"  {nombre:<12} {n:>6} filas")
    print(f"  adjuntos     {_gb(bytes_adjuntos)} (etapa `archivos`)")
    print()
    if renombrados:
        print(f"  {renombrados} pacientes con DNI repetido: ver reporte-dni-duplicados.csv")
    if sospechosas:
        print(f"  {len(sospechosas)} fechas de nacimiento implausibles: ver reporte-fechas-sospechosas.csv")
    print(f"\nSalida en {salida}")
    print("OJO: son datos clinicos reales. No va al repo ni a ningun lado compartido.")

    if password_generada:
        print("\n" + "=" * 68)
        print(f"  Usuario admin nuevo: {os.environ.get('ADMIN_EMAIL', 'fernandeznicolas1801psn@gmail.com')}")
        print(f"  Contrasena:          {password_generada}")
        print("  Se muestra una sola vez. Guardala ahora; no queda escrita en ningun archivo.")
        print("=" * 68)


# --------------------------------------------------------------------------- #
# preflight
# --------------------------------------------------------------------------- #

def cmd_preflight(args) -> None:
    with _conectar() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        presentes = {r[0] for r in cur.fetchall()}
        faltantes = [t for t in TABLAS_DESTINO if t not in presentes]
        if faltantes:
            sys.exit(
                f"Faltan tablas en el destino: {faltantes}\n"
                "Correr las migraciones primero (RunMigrationsOnStartup=true o `dotnet ef database update`)."
            )

        print("Tablas presentes: todas.\n")
        print(f"  {'tabla':<16} {'destino':>8} {'otros':>8}")
        con_datos = []
        for t, sql in CONTEO_EN_CONSULTORIO.items():
            cur.execute(sql, (esquema.CONSULTORIO_INICIAL,))
            propias = cur.fetchone()[0]
            cur.execute(f'SELECT count(*) FROM "{t}"')
            otras = cur.fetchone()[0] - propias
            print(f"  {t:<16} {propias:>8} {otras:>8}")
            if propias:
                con_datos.append(t)

        cur.execute('SELECT "Name", "CodeHash" <> \'\' FROM "Consultorios" WHERE "Id" = %s',
                    (esquema.CONSULTORIO_INICIAL,))
        fila = cur.fetchone()
        print()
        if not fila:
            sys.exit(
                f"No existe el consultorio inicial {esquema.CONSULTORIO_INICIAL}. "
                "Lo crea la migracion `Consultorios`; sin el no hay a que colgar doctores y pacientes."
            )
        print(f"Consultorio inicial: {fila[0]!r}, codigo sembrado: {'si' if fila[1] else 'NO'}")
        if not fila[1]:
            print("  (el CodeHash lo completa Program.cs al arrancar con Registration__ConsultoryCode)")

        print(f"Tamano actual de la base: {_gb(_tamanio_base(cur))}")

        if con_datos:
            sys.exit(
                f"\nEl consultorio destino ya tiene filas en {con_datos}. `cargar` lo espera "
                "vacio: si no, se duplican los datos. Las filas de OTROS consultorios no "
                "molestan y por eso solo se informan."
            )
        print("\nDestino listo.")


# --------------------------------------------------------------------------- #
# cargar
# --------------------------------------------------------------------------- #

COLUMNAS = {
    "Doctors": ["Id", "Name", "LastName", "Email", "Password", "PhoneNumber_CountryCode",
                "PhoneNumber_PhoneNumber", "Tuition", "Description", "Role", "ConsultorioId"],
    "Patients": ["Id", "Name", "LastName", "DNI", "BirthDate", "Country", "Email",
                 "PhoneNumber_CountryCode", "PhoneNumber_PhoneNumber", "Ocupation",
                 "HomeAddress", "Note", "MedicalCoverage_Number", "MedicalCoverage_Coverage",
                 "ConsultorioId"],
    "HCEs": ["Id", "PatientId"],
    "Evolutions": ["Id", "HCEId", "Notes", "EvolutionInfo_ModifiedBy", "EvolutionInfo_Tuition",
                   "ModifiedDate"],
}


def _valor(fila: dict, columna: str):
    v = fila.get(columna)
    if v is None:
        return None
    if columna in ("BirthDate", "ModifiedDate"):
        return datetime.datetime.fromisoformat(v)
    return v


def cmd_cargar(args) -> None:
    entrada = Path(args.entrada).expanduser()

    with _conectar() as conn:
        with conn.cursor() as cur:
            antes = _tamanio_base(cur)

            # El nombre del consultorio va en la misma transaccion que los datos: o
            # queda todo consistente o no queda nada.
            if args.nombre_consultorio:
                cur.execute(
                    'UPDATE "Consultorios" SET "Name" = %s WHERE "Id" = %s',
                    (args.nombre_consultorio, esquema.CONSULTORIO_INICIAL),
                )
                if cur.rowcount != 1:
                    sys.exit(f"No se encontro el consultorio {esquema.CONSULTORIO_INICIAL} para renombrar.")
                print(f'  consultorio    renombrado a {args.nombre_consultorio!r}')

            # Una sola transaccion para las cuatro tablas: si algo falla a mitad de
            # camino la base queda como estaba, no a medio migrar.
            for tabla in ("Doctors", "Patients", "HCEs", "Evolutions"):
                columnas = COLUMNAS[tabla]
                lista = ", ".join(f'"{c}"' for c in columnas)
                n = 0
                with cur.copy(f'COPY "{tabla}" ({lista}) FROM STDIN') as copy:
                    for fila in _leer_ndjson(entrada / f"{tabla}.ndjson"):
                        copy.write_row([_valor(fila, c) for c in columnas])
                        n += 1
                print(f"  {tabla:<12} {n:>6} filas")
        conn.commit()

        with conn.cursor() as cur:
            print(f"\nBase: {_gb(antes)} -> {_gb(_tamanio_base(cur))}")

    print("\nListo. Los adjuntos van aparte: `migrar.py archivos`.")


# --------------------------------------------------------------------------- #
# archivos
# --------------------------------------------------------------------------- #

def cmd_archivos(args) -> None:
    entrada = Path(args.entrada).expanduser()
    metadatos = {uuid.UUID(m["Id"]): m for m in _leer_ndjson(entrada / "HCEFiles.ndjson")}

    # El tope real es el del VOLUMEN, no el de la base: ahi viven tambien el WAL y el
    # resto de PGDATA. Postgres no lo puede informar, asi que lo declara el operador
    # mirando el dashboard. Sin esto la subida avanza a ciegas y lo unico que avisa que
    # no entraba es que el servidor se cae con el disco lleno.
    limite = int((args.limite_gb if args.limite_gb else args.volumen_gb - RESERVA_WAL_GB) * 2**30)

    with _conectar() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT "Id" FROM "HCEFiles"')
            ya_estan = {r[0] for r in cur.fetchall()}
            tamanio = _tamanio_base(cur)

        pendientes = [i for i in metadatos if i not in ya_estan]
        print(f"{len(ya_estan)} ya cargados, {len(pendientes)} pendientes.")
        print(f"Base: {_gb(tamanio)}   limite: {_gb(limite)}\n")
        if not pendientes:
            print("No hay nada que subir.")
            return
        if tamanio > limite:
            sys.exit(
                f"La base ya esta por encima del limite. Agrandar el volumen en Railway "
                f"o subir --limite-gb si {_gb(tamanio)} es esperable."
            )

        # Proyeccion antes de escribir un solo byte. Se usan los bytes crudos, que
        # sobreestiman (TOAST comprime algo), porque para un guard conviene errar por
        # exceso.
        pendiente = sum(metadatos[i]["Bytes"] for i in pendientes)
        volumen = int(args.volumen_gb * 2**30)
        proyectado = tamanio + pendiente + int(RESERVA_WAL_GB * 2**30)
        print(f"Proyeccion: {_gb(tamanio)} de base + {_gb(pendiente)} de adjuntos + "
              f"{RESERVA_WAL_GB} GB de WAL = {_gb(proyectado)} sobre un volumen de {_gb(volumen)}")
        if proyectado > volumen:
            sys.exit(
                f"\nNo entra: harian falta {_gb(proyectado)} y el volumen declarado es "
                f"{_gb(volumen)}.\n\n"
                "En Railway: servicio Postgres -> Volume -> Settings -> Grow. Ojo que el\n"
                "volumen creado en Trial queda en 0,5 GB y NO se agranda solo al pasar a un\n"
                "plan pago: subir de plan sube el techo, no el volumen.\n\n"
                "Si el volumen ya es mas grande, corregir --volumen-gb."
            )
        print()

        pendientes_set = set(pendientes)
        subidos = 0
        bytes_subidos = 0

        with _abrir_backup(args) as bak:
            lote: list[tuple] = []
            for fila in bak.filas(esquema.HCEFILES):
                if fila["Id"] not in pendientes_set:
                    continue
                contenido = fila["Content"]
                datos = bak.leer_lob(contenido) if isinstance(contenido, PunteroLob) else contenido
                lote.append((fila["Id"], fila["FileName"], datos, fila["HCEId"]))
                bytes_subidos += len(datos)

                if len(lote) >= args.lote:
                    subidos += _subir_lote(conn, lote, subidos)
                    lote = []
                    with conn.cursor() as cur:
                        tamanio = _tamanio_base(cur)
                    print(f"  {subidos}/{len(pendientes)} archivos, base {_gb(tamanio)}")
                    if tamanio > limite:
                        print(
                            f"\nCortado: la base paso el limite de {_gb(limite)}. "
                            "Agrandar el volumen en Railway y volver a correr; retoma donde quedo."
                        )
                        return

            if lote:
                subidos += _subir_lote(conn, lote, subidos)

        with conn.cursor() as cur:
            print(f"\n{subidos} archivos subidos ({_gb(bytes_subidos)}). Base: {_gb(_tamanio_base(cur))}")


def _subir_lote(conn, lote, subidos_antes: int) -> int:
    """
    Sube un lote y lo commitea. Si el disco se lleno, lo dice en criollo.

    `--limite-gb` no alcanza para prevenirlo: mide el tamano de la BASE, y el volumen
    tiene ademas el WAL y no se puede consultar desde SQL. En Railway el tamano del
    volumen se mira en el dashboard, y el default de Trial (0,5 GB) NO se agranda solo
    al pasar a un plan pago.
    """
    import psycopg

    try:
        with conn.cursor() as cur:
            with cur.copy('COPY "HCEFiles" ("Id", "FileName", "Content", "HCEId") FROM STDIN') as copy:
                for fila in lote:
                    copy.write_row(fila)
        conn.commit()
    except psycopg.errors.DiskFull:
        conn.rollback()
        sys.exit(
            f"\nSE LLENO EL DISCO del servidor. El lote se descarto entero (rollback), "
            f"asi que quedaron {subidos_antes} archivos completos y consistentes.\n\n"
            "El tope no es el tamano de la base sino el del VOLUMEN, que incluye el WAL.\n"
            "En Railway: servicio Postgres -> Volume -> Settings -> Grow. Ojo que el volumen\n"
            "creado en Trial queda en 0,5 GB y NO se agranda solo al pasar a un plan pago.\n\n"
            "Despues volve a correr el mismo comando: retoma donde quedo."
        )
    return len(lote)


# --------------------------------------------------------------------------- #
# verificar
# --------------------------------------------------------------------------- #

def cmd_verificar(args) -> None:
    entrada = Path(args.entrada).expanduser()
    resumen = json.loads((entrada / "resumen.json").read_text(encoding="utf-8"))
    problemas: list[str] = []

    with _conectar() as conn, conn.cursor() as cur:
        print("Conteos (dentro del consultorio destino)")
        for tabla, esperado in resumen["tablas"].items():
            cur.execute(CONTEO_EN_CONSULTORIO[tabla], (esquema.CONSULTORIO_INICIAL,))
            real = cur.fetchone()[0]
            if tabla == "HCEFiles":
                # Los adjuntos son una etapa aparte y opcional: quedarse corto no es error.
                print(f"  {tabla:<12} {real:>6}  " + ("OK" if real == esperado else f"de {esperado} (etapa aparte)"))
                if real > esperado:
                    problemas.append(f"HCEFiles tiene {real} filas, mas de las {esperado} del backup")
                elif real < esperado:
                    print(f"  (faltan {esperado - real} adjuntos: correr `migrar.py archivos`)")
                continue
            print(f"  {tabla:<12} {real:>6}  " + ("OK" if real == esperado else f"!= {esperado}"))
            if real != esperado:
                problemas.append(f"{tabla}: {real} filas en el consultorio destino, se esperaban {esperado}")

        print("\nIntegridad")
        cons = esquema.CONSULTORIO_INICIAL
        chequeos = [
            # El DNI unico es por consultorio, asi que este va sobre toda la tabla.
            ('DNI repetidos', 'SELECT count(*) FROM (SELECT 1 FROM "Patients" '
                              'GROUP BY "ConsultorioId", "DNI" HAVING count(*) > 1) t', None),
            ('HCEs sin paciente', 'SELECT count(*) FROM "HCEs" h LEFT JOIN "Patients" p '
                                  'ON p."Id" = h."PatientId" WHERE p."Id" IS NULL', None),
            ('evoluciones sin HCE', 'SELECT count(*) FROM "Evolutions" e LEFT JOIN "HCEs" h '
                                    'ON h."Id" = e."HCEId" WHERE h."Id" IS NULL', None),
            ('contrasenas sin hashear', 'SELECT count(*) FROM "Doctors" WHERE "ConsultorioId" = %s '
                                        'AND "Password" NOT LIKE \'AQAAAA%%\'', (cons,)),
            ('doctores sin rol valido', 'SELECT count(*) FROM "Doctors" WHERE "ConsultorioId" = %s '
                                        'AND "Role" NOT IN (\'Doctor\', \'Admin\')', (cons,)),
            ('emails de doctor duplicados', 'SELECT count(*) FROM (SELECT 1 FROM "Doctors" '
                                            'GROUP BY lower("Email") HAVING count(*) > 1) t', None),
        ]
        for etiqueta, sql, params in chequeos:
            cur.execute(sql, params)
            n = cur.fetchone()[0]
            print(f"  {etiqueta:<40} {n}")
            if n:
                problemas.append(f"{etiqueta}: {n}")

        cur.execute('SELECT count(*) FROM "Doctors" WHERE "ConsultorioId" = %s AND "Role" = \'Admin\'', (cons,))
        admins = cur.fetchone()[0]
        print(f"  {'administradores en el consultorio':<40} {admins}")
        if admins != 2:
            problemas.append(f"se esperaban 2 administradores y hay {admins}")

        # Muestreo campo por campo contra lo que se extrajo del backup.
        print("\nMuestreo de pacientes")
        campos = [c for c in COLUMNAS["Patients"] if c not in ("Id", "BirthDate")]
        muestra = []
        for i, fila in enumerate(_leer_ndjson(entrada / "Patients.ndjson")):
            if i % 700 == 0:
                muestra.append(fila)
        for fila in muestra:
            lista = ", ".join(f'"{c}"' for c in campos)
            cur.execute(f'SELECT {lista}, "BirthDate" FROM "Patients" WHERE "Id" = %s', (fila["Id"],))
            fila_bd = cur.fetchone()
            if fila_bd is None:
                problemas.append(f"paciente {fila['Id']} no esta en la base")
                continue
            for campo, valor in zip(campos, fila_bd):
                # El NDJSON guarda los uuid como texto; la base los devuelve tipados.
                if isinstance(valor, uuid.UUID):
                    valor = str(valor)
                if valor != fila.get(campo):
                    problemas.append(f"paciente {fila['Id']}: {campo} {valor!r} != {fila.get(campo)!r}")
            if fila_bd[-1] != datetime.datetime.fromisoformat(fila["BirthDate"]):
                problemas.append(f"paciente {fila['Id']}: BirthDate no coincide")
        print(f"  {len(muestra)} pacientes comparados campo por campo")

    print()
    if problemas:
        print(f"{len(problemas)} problemas:")
        for p in problemas[:30]:
            print(f"  - {p}")
        sys.exit(1)
    print("Todo bien.")


# --------------------------------------------------------------------------- #
# verificar-hashes
# --------------------------------------------------------------------------- #

def cmd_verificar_hashes(args) -> None:
    """
    Prueba que los hashes generados validen contra el PasswordHasher real de .NET.

    Las contrasenas en claro salen del backup y van por pipe: no se escriben nunca.
    El proceso corre desde un directorio neutro porque el global.json del repo pide un
    SDK que puede no estar instalado, y para este chequeo no hace falta.
    """
    entrada = Path(args.entrada).expanduser()
    hashes = {f["Id"]: f for f in _leer_ndjson(entrada / "Doctors.ndjson")}

    lineas = []
    with _abrir_backup(args) as bak:
        for fila in bak.filas(esquema.DOCTORS):
            destino = hashes.get(str(fila["Id"]))
            if destino is None:
                sys.exit(f"El doctor {fila['Email']} del backup no esta en Doctors.ndjson")
            lineas.append(
                "\t".join(
                    [
                        destino["Email"],
                        destino["Password"],
                        base64.b64encode(fila["Password"].encode("utf-8")).decode("ascii"),
                    ]
                )
            )

    guion = Path(__file__).resolve().parent / "verificar_hash.cs"
    proc = subprocess.run(
        ["dotnet", "run", str(guion)],
        input="\n".join(lineas),
        text=True,
        capture_output=True,
        cwd=Path.home(),
    )
    salida = "\n".join(l for l in proc.stdout.splitlines() if "warning" not in l.lower())
    print(salida or proc.stderr)
    if proc.returncode != 0:
        sys.exit(proc.returncode)


# --------------------------------------------------------------------------- #

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="comando", required=True)

    e = sub.add_parser("extraer", help="lee el .bak y deja los datos en archivos locales")
    e.add_argument("--bak", required=True)
    e.add_argument("--out", required=True)
    e.add_argument("--backup-set", type=int, help="cual usar si el .bak tiene varios (por defecto, el ultimo)")
    e.set_defaults(func=cmd_extraer)

    f = sub.add_parser("preflight", help="chequea el destino sin modificar nada")
    f.set_defaults(func=cmd_preflight)

    c = sub.add_parser("cargar", help="inserta lo relacional, en una transaccion")
    c.add_argument("--in", dest="entrada", required=True)
    c.add_argument("--nombre-consultorio", help="renombra el consultorio destino en la misma transaccion")
    c.set_defaults(func=cmd_cargar)

    a = sub.add_parser("archivos", help="sube los adjuntos, de a lotes reanudables")
    a.add_argument("--bak", required=True)
    a.add_argument("--in", dest="entrada", required=True)
    a.add_argument("--backup-set", type=int)
    # 3.5 GB de base, no de volumen: el plan Hobby de Railway da 5 GB de volumen y el
    # pg_wal se come cerca de 1 GB durante una carga masiva. Con este tope la migracion
    # completa (2,98 GB medidos) entra sin acercarse al borde.
    a.add_argument("--volumen-gb", type=float, required=True,
                   help="tamano del volumen de Postgres, tal cual lo muestra el dashboard "
                        "de Railway. Postgres no lo puede informar y es el limite que importa")
    a.add_argument("--limite-gb", type=float,
                   help=f"tope de tamano de la BASE; por defecto --volumen-gb menos "
                        f"{RESERVA_WAL_GB} GB reservados para el WAL")
    a.add_argument("--lote", type=int, default=50)
    a.set_defaults(func=cmd_archivos)

    v = sub.add_parser("verificar", help="compara el destino contra lo extraido")
    v.add_argument("--in", dest="entrada", required=True)
    v.set_defaults(func=cmd_verificar)

    h = sub.add_parser("verificar-hashes", help="valida los hashes contra el PasswordHasher de .NET")
    h.add_argument("--bak", required=True)
    h.add_argument("--in", dest="entrada", required=True)
    h.add_argument("--backup-set", type=int)
    h.set_defaults(func=cmd_verificar_hashes)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
