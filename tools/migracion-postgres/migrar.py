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

TABLAS_DESTINO = ["Consultorios", "Doctors", "RefreshTokens", "Patients", "HCEs", "Evolutions", "HCEFiles"]


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

    with BackupSqlServer(str(Path(args.bak).expanduser())) as bak:
        print("Leyendo el backup...")

        # Primero las tablas que no necesitan transformacion, que ademas dan los
        # conteos que hacen falta para desambiguar los DNI.
        hces = list(bak.filas(esquema.HCES))
        evoluciones = list(bak.filas(esquema.EVOLUTIONS))
        archivos = list(bak.filas(esquema.HCEFILES))
        pacientes = list(bak.filas(esquema.PATIENTS))

        for tabla, filas in (
            (esquema.HCES, hces),
            (esquema.EVOLUTIONS, evoluciones),
            (esquema.HCEFILES, archivos),
            (esquema.PATIENTS, pacientes),
        ):
            if len(filas) != tabla.filas_esperadas:
                sys.exit(
                    f"{tabla.nombre}: se leyeron {len(filas)} filas y se esperaban "
                    f"{tabla.filas_esperadas}. El backup no es el que espera esta "
                    "herramienta; revisar esquema.py antes de seguir."
                )

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
        print("  tabla            filas")
        con_datos = []
        for t in TABLAS_DESTINO:
            cur.execute(f'SELECT count(*) FROM "{t}"')
            n = cur.fetchone()[0]
            print(f"  {t:<16} {n:>6}")
            # Consultorios trae la fila que siembra la migracion; el resto tiene que
            # estar vacio o `cargar` va a chocar contra las claves primarias.
            if n and t != "Consultorios":
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
            sys.exit(f"\nEstas tablas ya tienen filas: {con_datos}. `cargar` espera el destino vacio.")
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
    limite = int(args.limite_gb * 2**30)

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

        pendientes_set = set(pendientes)
        subidos = 0
        bytes_subidos = 0

        with BackupSqlServer(str(Path(args.bak).expanduser())) as bak:
            lote: list[tuple] = []
            for fila in bak.filas(esquema.HCEFILES):
                if fila["Id"] not in pendientes_set:
                    continue
                contenido = fila["Content"]
                datos = bak.leer_lob(contenido) if isinstance(contenido, PunteroLob) else contenido
                lote.append((fila["Id"], fila["FileName"], datos, fila["HCEId"]))
                bytes_subidos += len(datos)

                if len(lote) >= args.lote:
                    subidos += _subir_lote(conn, lote)
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
                subidos += _subir_lote(conn, lote)

        with conn.cursor() as cur:
            print(f"\n{subidos} archivos subidos ({_gb(bytes_subidos)}). Base: {_gb(_tamanio_base(cur))}")


def _subir_lote(conn, lote) -> int:
    with conn.cursor() as cur:
        with cur.copy('COPY "HCEFiles" ("Id", "FileName", "Content", "HCEId") FROM STDIN') as copy:
            for fila in lote:
                copy.write_row(fila)
    conn.commit()
    return len(lote)


# --------------------------------------------------------------------------- #
# verificar
# --------------------------------------------------------------------------- #

def cmd_verificar(args) -> None:
    entrada = Path(args.entrada).expanduser()
    resumen = json.loads((entrada / "resumen.json").read_text(encoding="utf-8"))
    problemas: list[str] = []

    with _conectar() as conn, conn.cursor() as cur:
        print("Conteos")
        for tabla, esperado in resumen["tablas"].items():
            cur.execute(f'SELECT count(*) FROM "{tabla}"')
            real = cur.fetchone()[0]
            if tabla == "HCEFiles":
                marca = "OK" if real == esperado else f"de {esperado} (etapa aparte)"
            else:
                marca = "OK" if real == esperado else f"!= {esperado}"
                if real != esperado:
                    problemas.append(f"{tabla}: {real} filas, se esperaban {esperado}")
            print(f"  {tabla:<12} {real:>6}  {marca}")
        # Los adjuntos son una etapa aparte y opcional, asi que quedarse corto no es un
        # error: se informa cuanto falta y listo.
        cur.execute('SELECT count(*) FROM "HCEFiles"')
        cargados = cur.fetchone()[0]
        faltan = resumen["tablas"]["HCEFiles"] - cargados
        if faltan > 0:
            print(f"  (faltan {faltan} adjuntos: correr `migrar.py archivos`)")
        elif faltan < 0:
            problemas.append(f"HCEFiles tiene {cargados} filas, mas de las {resumen['tablas']['HCEFiles']} del backup")

        print("\nIntegridad")
        chequeos = [
            ('doctores fuera del consultorio inicial',
             f'SELECT count(*) FROM "Doctors" WHERE "ConsultorioId" <> \'{esquema.CONSULTORIO_INICIAL}\''),
            ('pacientes fuera del consultorio inicial',
             f'SELECT count(*) FROM "Patients" WHERE "ConsultorioId" <> \'{esquema.CONSULTORIO_INICIAL}\''),
            ('DNI repetidos', 'SELECT count(*) FROM (SELECT "DNI" FROM "Patients" '
                              'GROUP BY "ConsultorioId", "DNI" HAVING count(*) > 1) t'),
            ('HCEs sin paciente', 'SELECT count(*) FROM "HCEs" h LEFT JOIN "Patients" p '
                                  'ON p."Id" = h."PatientId" WHERE p."Id" IS NULL'),
            ('evoluciones sin HCE', 'SELECT count(*) FROM "Evolutions" e LEFT JOIN "HCEs" h '
                                    'ON h."Id" = e."HCEId" WHERE h."Id" IS NULL'),
            ('contrasenas sin hashear', 'SELECT count(*) FROM "Doctors" WHERE "Password" NOT LIKE \'AQAAAA%\''),
            ('doctores sin rol valido', 'SELECT count(*) FROM "Doctors" WHERE "Role" NOT IN (\'Doctor\', \'Admin\')'),
        ]
        for etiqueta, sql in chequeos:
            cur.execute(sql)
            n = cur.fetchone()[0]
            print(f"  {etiqueta:<40} {n}")
            if n:
                problemas.append(f"{etiqueta}: {n}")

        cur.execute('SELECT count(*) FROM "Doctors" WHERE "Role" = \'Admin\'')
        admins = cur.fetchone()[0]
        print(f"  {'administradores':<40} {admins}")
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
    with BackupSqlServer(str(Path(args.bak).expanduser())) as bak:
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
    e.set_defaults(func=cmd_extraer)

    f = sub.add_parser("preflight", help="chequea el destino sin modificar nada")
    f.set_defaults(func=cmd_preflight)

    c = sub.add_parser("cargar", help="inserta lo relacional, en una transaccion")
    c.add_argument("--in", dest="entrada", required=True)
    c.set_defaults(func=cmd_cargar)

    a = sub.add_parser("archivos", help="sube los adjuntos, de a lotes reanudables")
    a.add_argument("--bak", required=True)
    a.add_argument("--in", dest="entrada", required=True)
    a.add_argument("--limite-gb", type=float, default=8.0)
    a.add_argument("--lote", type=int, default=50)
    a.set_defaults(func=cmd_archivos)

    v = sub.add_parser("verificar", help="compara el destino contra lo extraido")
    v.add_argument("--in", dest="entrada", required=True)
    v.set_defaults(func=cmd_verificar)

    h = sub.add_parser("verificar-hashes", help="valida los hashes contra el PasswordHasher de .NET")
    h.add_argument("--bak", required=True)
    h.add_argument("--in", dest="entrada", required=True)
    h.set_defaults(func=cmd_verificar_hashes)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
