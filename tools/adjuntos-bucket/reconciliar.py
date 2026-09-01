#!/usr/bin/env python3
"""Reconciliación bucket ↔ base para los adjuntos clínicos.

La invariante del plan (docs/adjuntos-object-storage.md) es que la base es la
fuente de verdad y el bucket puede tener objetos DE MÁS, nunca de menos: los
huérfanos aparecen cuando un upload hizo el PUT pero el INSERT falló, o cuando
un delete borró la fila pero el DeleteObject no llegó (queda logueado como
warning en la API). Este script los lista y, con --borrar, los elimina del
bucket si tienen más de 24 horas (margen para uploads en curso).

NUNCA toca la base: la invariante se repara en una sola dirección.

Uso (mismas variables de entorno que backfill.py):
    python reconciliar.py            # solo reporta
    python reconciliar.py --borrar   # borra huérfanos > 24 h
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone

from backfill import _bucket, _conectar


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--borrar", action="store_true", help="borra los huérfanos > 24 h")
    args = parser.parse_args()

    conn = _conectar()
    s3, bucket = _bucket()

    cur = conn.cursor()
    cur.execute('SELECT "StorageKey" FROM "HCEFiles" WHERE "StorageKey" IS NOT NULL')
    claves_en_base = {fila[0] for fila in cur.fetchall()}

    huerfanos = []   # (clave, fecha) en el bucket sin fila
    faltantes = 0    # filas cuyo objeto no existe — el caso grave

    claves_en_bucket = set()
    for pagina in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket):
        for obj in pagina.get("Contents", []):
            claves_en_bucket.add(obj["Key"])
            if obj["Key"] not in claves_en_base:
                huerfanos.append((obj["Key"], obj["LastModified"]))

    for clave in claves_en_base:
        if clave not in claves_en_bucket:
            print(f"  ✗ FALTA en el bucket: {clave}")
            faltantes += 1

    print(f"Filas con clave: {len(claves_en_base)} | objetos: {len(claves_en_bucket)} | huérfanos: {len(huerfanos)}")

    if faltantes:
        # Una fila sin objeto es un 500 en la cara del médico: no se sigue de largo.
        sys.exit(f"✗ {faltantes} filas apuntan a objetos inexistentes. Restaurar del pg_dump o investigar.")

    limite = datetime.now(timezone.utc) - timedelta(hours=24)
    viejos = [(c, f) for c, f in huerfanos if f < limite]
    for clave, fecha in huerfanos:
        marca = "borrable" if fecha < limite else "reciente (se deja: puede ser un upload en curso)"
        print(f"  huérfano [{marca}]: {clave}")

    if args.borrar:
        for clave, _ in viejos:
            s3.delete_object(Bucket=bucket, Key=clave)
        print(f"Borrados {len(viejos)} huérfanos.")
    elif viejos:
        print(f"{len(viejos)} borrables. Re-correr con --borrar para eliminarlos.")


if __name__ == "__main__":
    main()
