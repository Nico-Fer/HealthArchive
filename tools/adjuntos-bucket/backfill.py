#!/usr/bin/env python3
"""Backfill de los adjuntos clínicos: HCEFiles.Content (bytea) → bucket R2.

Plan completo en docs/adjuntos-object-storage.md. Calca el patrón del comando
`archivos` de tools/migracion-postgres/migrar.py, que ya movió estos mismos
archivos una vez: lotes con commit, reanudable, verificación de contenido.

La unidad de reanudación es la fila: el marcador de "ya subido" es
StorageKey IS NOT NULL, así que cortar el proceso (red, a mano) y volver a
correrlo retoma donde quedó. Cada archivo se sube, se descarga de vuelta y se
compara el SHA-256 antes de escribir la fila — con el egreso gratis de R2 la
verificación puede ser del 100%, no un muestreo.

Este script NO vacía Content: liberar el espacio (UPDATE ... SET Content=NULL
+ VACUUM FULL) es un paso posterior y manual del plan, después del soak.

Uso:
    export DATABASE_URL="postgresql://usuario:clave@host:puerto/base"
    export R2_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
    export R2_BUCKET="healtharchive-adjuntos"
    export R2_ACCESS_KEY="..." R2_SECRET="..."

    python backfill.py subir [--lote 25]
    python backfill.py verificar [--muestra 100]
"""

import argparse
import hashlib
import os
import sys

# Magic bytes por extensión, los mismos que validó la migración original
# (tools/migracion-postgres). Extensión desconocida = warning, no error: hay
# DOCX/ZIP y otros formatos legítimos.
MAGIC = {
    ".pdf": b"%PDF",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG",
    ".zip": b"PK\x03\x04",
    ".docx": b"PK\x03\x04",
}


def _env(nombre):
    valor = os.environ.get(nombre)
    if not valor:
        sys.exit(
            f"Falta la variable de entorno {nombre}.\n"
            "Ver el encabezado de este script para la lista completa."
        )
    return valor


def _conectar():
    try:
        import psycopg
    except ImportError:
        sys.exit("Falta psycopg. Instalar con: pip install -r requirements.txt")
    return psycopg.connect(_env("DATABASE_URL"))


def _bucket():
    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        sys.exit("Falta boto3. Instalar con: pip install -r requirements.txt")

    cliente = boto3.client(
        "s3",
        endpoint_url=_env("R2_ENDPOINT"),
        aws_access_key_id=_env("R2_ACCESS_KEY"),
        aws_secret_access_key=_env("R2_SECRET"),
        # R2 rechaza los checksums CRC32 que el SDK manda por defecto.
        config=Config(
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )
    return cliente, _env("R2_BUCKET")


def _sha256(datos):
    return hashlib.sha256(datos).hexdigest()


def _chequear_magic(nombre, datos):
    ext = os.path.splitext(nombre.lower())[1]
    firma = MAGIC.get(ext)
    if firma is None:
        print(f"  aviso: extensión sin firma conocida ({nombre}), se sube igual")
        return
    if not datos.startswith(firma):
        sys.exit(
            f"El contenido de {nombre} no coincide con su extensión "
            f"(esperaba {firma!r}). Se corta: hay que mirar ese archivo a mano."
        )


def _content_type(nombre):
    ext = os.path.splitext(nombre.lower())[1]
    return {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".zip": "application/zip",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }.get(ext, "application/octet-stream")


def _pendientes(cur):
    """Inventario de filas sin subir, con el ConsultorioId que necesita la clave."""
    cur.execute(
        """
        SELECT f."Id", f."FileName", f."HCEId", length(f."Content") AS bytes,
               p."ConsultorioId"
        FROM "HCEFiles" f
        JOIN "HCEs" h ON h."Id" = f."HCEId"
        JOIN "Patients" p ON p."Id" = h."PatientId"
        WHERE f."StorageKey" IS NULL
        ORDER BY f."Id"
        """
    )
    return cur.fetchall()


def cmd_subir(args):
    conn = _conectar()
    s3, bucket = _bucket()
    cur = conn.cursor()

    pendientes = _pendientes(cur)
    if not pendientes:
        print("No hay archivos pendientes: el backfill ya está completo.")
        return

    total = len(pendientes)
    total_bytes = sum(fila[3] or 0 for fila in pendientes)
    print(f"{total} archivos pendientes ({total_bytes / 1024**3:.2f} GB). Lote de {args.lote}.")

    subidos = 0
    for i in range(0, total, args.lote):
        lote = pendientes[i : i + args.lote]
        for file_id, nombre, hce_id, _, consultorio_id in lote:
            # El contenido se trae de a un archivo: nunca hay más de un lote en memoria.
            cur.execute('SELECT "Content" FROM "HCEFiles" WHERE "Id" = %s', (file_id,))
            datos = cur.fetchone()[0]
            if datos is None:
                sys.exit(f"El archivo {file_id} tiene Content NULL y StorageKey NULL: estado inconsistente.")

            _chequear_magic(nombre, datos)
            hash_local = _sha256(datos)
            clave = f"consultorio/{consultorio_id}/hce/{hce_id}/{file_id}"
            content_type = _content_type(nombre)

            s3.put_object(Bucket=bucket, Key=clave, Body=datos, ContentType=content_type)

            # Verificación total: se baja de vuelta y se compara el hash. Con el
            # egreso gratis de R2 esto cuesta $0 y es la garantía antes de que,
            # en un paso posterior, Content se vacíe.
            devuelto = s3.get_object(Bucket=bucket, Key=clave)["Body"].read()
            if _sha256(devuelto) != hash_local:
                sys.exit(
                    f"El objeto {clave} no coincide con lo subido (hash distinto). "
                    "Se corta sin marcar la fila: re-correr sube este archivo de nuevo."
                )

            cur.execute(
                """
                UPDATE "HCEFiles"
                SET "StorageKey" = %s, "ContentType" = %s, "SizeBytes" = %s, "Sha256" = %s
                WHERE "Id" = %s
                """,
                (clave, content_type, len(datos), hash_local, file_id),
            )

        # Commit por lote: si se corta, lo commiteado no se rehace.
        conn.commit()
        subidos += len(lote)
        print(f"  {subidos}/{total} archivos subidos y verificados")

    print("Backfill completo. Correr ahora: python backfill.py verificar")


def cmd_verificar(args):
    conn = _conectar()
    s3, bucket = _bucket()
    cur = conn.cursor()

    cur.execute('SELECT count(*) FROM "HCEFiles"')
    total = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "HCEFiles" WHERE "StorageKey" IS NOT NULL')
    con_clave = cur.fetchone()[0]

    objetos = 0
    for pagina in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket):
        objetos += pagina.get("KeyCount", 0)

    print(f"Filas: {total} | con StorageKey: {con_clave} | objetos en el bucket: {objetos}")
    if con_clave != total:
        print(f"  ⚠ faltan {total - con_clave} filas por subir (re-correr `subir`)")
    if objetos < con_clave:
        sys.exit("  ✗ hay MENOS objetos que filas con clave: investigar antes de seguir.")
    if objetos > con_clave:
        print(f"  aviso: {objetos - con_clave} objetos de más (¿huérfanos? ver reconciliar.py)")

    # Muestreo: re-descarga 1 de cada N y compara contra el Sha256 persistido.
    cur.execute(
        """
        SELECT "Id", "StorageKey", "Sha256"
        FROM (
            SELECT "Id", "StorageKey", "Sha256",
                   row_number() OVER (ORDER BY "Id") AS n
            FROM "HCEFiles" WHERE "StorageKey" IS NOT NULL
        ) t WHERE n %% %s = 0
        """,
        (args.muestra,),
    )
    muestras = cur.fetchall()
    for file_id, clave, hash_guardado in muestras:
        devuelto = s3.get_object(Bucket=bucket, Key=clave)["Body"].read()
        if _sha256(devuelto) != hash_guardado:
            sys.exit(f"  ✗ {clave} no coincide con el Sha256 de la base.")
    print(f"  ✓ muestreo de {len(muestras)} archivos re-descargados: todos coinciden")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(required=True)

    p_subir = sub.add_parser("subir", help="sube los pendientes (reanudable)")
    p_subir.add_argument("--lote", type=int, default=25, help="archivos por commit (default 25)")
    p_subir.set_defaults(func=cmd_subir)

    p_verificar = sub.add_parser("verificar", help="conteos + muestreo re-hasheado")
    p_verificar.add_argument("--muestra", type=int, default=100, help="re-verifica 1 de cada N (default 100)")
    p_verificar.set_defaults(func=cmd_verificar)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
