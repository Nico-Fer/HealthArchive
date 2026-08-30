"""
Lector del backup nativo de SQL Server (.bak) sin SQL Server.

Un .bak es un contenedor MTF (Microsoft Tape Format) que, para un backup no
comprimido, lleva adentro las paginas del MDF tal cual, de 8192 bytes. Este modulo
ubica donde arranca ese stream y de ahi para abajo trabaja con el formato de pagina
y de registro de SQL Server, que es estable desde 2005.

Un mismo .bak puede contener VARIOS backup sets, uno atras del otro: `BACKUP DATABASE`
agrega al archivo si no le pasan `WITH INIT`. Por eso el lector los enumera todos y usa
el ultimo (el mas reciente) en vez del primero que encuentra; agarrar el primero
significaria migrar datos viejos sin que nada avise.

Alcance deliberadamente chico: solo lo que hace falta para migrar HealthArchive.
- Paginas de datos (tipo 1) y de LOB (tipos 3 y 4).
- Registros PRIMARY. En este backup no hay forwarded ni ghost (verificado), asi que
  cualquier otro tipo de registro es una sorpresa y se reporta en vez de ignorarse.
- Un solo archivo de datos (file_id 1).

Referencia del formato: la cabecera de pagina son 96 bytes y el array de slots
crece desde el final de la pagina hacia atras.
"""

from __future__ import annotations

import datetime
import struct
import uuid
from dataclasses import dataclass, field

PAGE_SIZE = 8192
HEADER_SIZE = 96
BLOQUE_LECTURA = 1024 * PAGE_SIZE  # 8 MB por read: el barrido completo es I/O puro

# Tipos de pagina que nos interesan.
PAGE_DATA = 1
PAGE_TEXT_MIX = 3
PAGE_TEXT_TREE = 4
PAGE_FILE_HEADER = 15

# Tipos de registro, en los bits 1-3 del status byte A.
REC_PRIMARY = 0
REC_FORWARDED = 1
REC_FORWARDING_STUB = 2
REC_INDEX = 3
REC_BLOB_FRAGMENT = 4
REC_GHOST_INDEX = 5
REC_GHOST_DATA = 6
REC_GHOST_VERSION = 7

REC_NAMES = {
    REC_PRIMARY: "PRIMARY",
    REC_FORWARDED: "FORWARDED",
    REC_FORWARDING_STUB: "FORWARDING_STUB",
    REC_INDEX: "INDEX",
    REC_BLOB_FRAGMENT: "BLOB_FRAGMENT",
    REC_GHOST_INDEX: "GHOST_INDEX",
    REC_GHOST_DATA: "GHOST_DATA",
    REC_GHOST_VERSION: "GHOST_VERSION",
}


class FormatoInesperado(Exception):
    """El backup no tiene la forma que este lector sabe leer."""


@dataclass
class Registro:
    """Una fila cruda, ya separada en sus tres partes."""

    fijas: bytes                       # datos de longitud fija, sin los 4 bytes de cabecera
    ncols: int
    nulos: list[bool]                  # una entrada por columna fisica
    variables: list[tuple[bytes, bool]]  # (bytes, es_complejo) en orden de columna

    def es_nulo(self, pos: int) -> bool:
        # Una posicion fuera del bitmap solo puede pasar si el registro esta cortado.
        return self.nulos[pos] if pos < len(self.nulos) else True


# --------------------------------------------------------------------------- #
# Descripcion de tablas
# --------------------------------------------------------------------------- #

@dataclass
class Columna:
    nombre: str
    pos: int                    # posicion fisica, la que indexa el null bitmap
    tipo: str                   # 'uuid' | 'datetime2' | 'text' | 'lob'
    offset: int | None = None   # byte inicial dentro de las columnas fijas
    var: int | None = None      # indice dentro del array de variables


@dataclass
class Tabla:
    nombre: str
    objid: int
    filas_esperadas: int
    ncols: int
    largo_fijas: int            # el campo del registro, incluye los 4 bytes de cabecera
    columnas: list[Columna] = field(default_factory=list)


def _uuid(raw: bytes) -> uuid.UUID:
    # uniqueidentifier guarda los tres primeros grupos en little-endian.
    return uuid.UUID(bytes_le=raw)


_EPOCA = datetime.datetime(1, 1, 1)


def _datetime2(raw: bytes) -> datetime.datetime:
    """
    datetime2(7) son 8 bytes: 5 de hora (ticks de 100 ns desde medianoche) y 3 de
    fecha (dias desde 0001-01-01), los dos little-endian.

    Postgres llega a microsegundos, asi que los ticks se dividen por 10. En esta base
    todos los valores son segundos o milisegundos enteros, con lo cual no se pierde nada.
    """
    ticks = int.from_bytes(raw[0:5], "little")
    dias = int.from_bytes(raw[5:8], "little")
    return _EPOCA + datetime.timedelta(days=dias, microseconds=ticks // 10)


# --------------------------------------------------------------------------- #
# Lector
# --------------------------------------------------------------------------- #

class BackupSqlServer:
    def __init__(self, ruta: str, backup_set: int | None = None):
        """
        `backup_set` es 1-based; por defecto se usa el ultimo, que es el mas reciente.
        """
        self.ruta = ruta
        self._f = open(ruta, "rb")

        self.streams = self._buscar_streams()
        if not self.streams:
            raise FormatoInesperado(
                f"{ruta}: no se encontro ningun stream de MDF. El backup podria estar "
                "comprimido o encriptado, y en ese caso hay que restaurarlo con SQL Server."
            )

        if backup_set is None:
            self.backup_set = len(self.streams)
        elif 1 <= backup_set <= len(self.streams):
            self.backup_set = backup_set
        else:
            raise FormatoInesperado(
                f"{ruta}: se pidio el backup set {backup_set} y el archivo tiene "
                f"{len(self.streams)}."
            )

        self._base = self.streams[self.backup_set - 1]
        self._indice: dict[int, list[int]] | None = None

    def close(self) -> None:
        self._f.close()

    def __enter__(self) -> "BackupSqlServer":
        return self

    def __exit__(self, *_exc) -> None:
        self.close()

    # -- ubicacion de los streams del MDF ------------------------------------ #

    @staticmethod
    def _confirmar(f, base: int) -> bool:
        """
        Confirma que en `base` arranca de verdad un stream de MDF.

        Las paginas siguientes tienen que autoidentificarse con su propio numero. El
        backup incluye paginas reservadas y todavia sin usar, que vienen en cero: esas
        se saltean, pero una cabecera que no cierra descarta el candidato. Hace falta
        porque el patron de la pagina 0 aparece por casualidad dentro de los adjuntos.
        """
        validas = 0
        for k in range(1, 64):
            f.seek(base + k * PAGE_SIZE)
            cab = f.read(HEADER_SIZE)
            if len(cab) < HEADER_SIZE:
                return False
            if cab[0] == 0:  # pagina sin usar
                continue
            if cab[0] != 1 or struct.unpack_from("<IH", cab, 32) != (k, 1):
                return False
            validas += 1
        return validas >= 16

    def _buscar_streams(self) -> list[int]:
        """
        Enumera los offsets donde arranca cada stream de MDF del archivo, en orden.

        Uno por backup set. Se reconocen por la pagina 0 del archivo de datos: cabecera
        version 1, tipo 15 (file header) y m_pageId/m_fileId diciendo que es la pagina 0
        del archivo 1.
        """
        ANCLA = b"\x01\x0f\x00\x00"
        encontrados: list[int] = []

        self._f.seek(0)
        arrastre = b""
        offset_arrastre = 0
        while True:
            bloque = self._f.read(BLOQUE_LECTURA)
            if not bloque:
                break
            datos = arrastre + bloque
            i = -1
            while True:
                i = datos.find(ANCLA, i + 1)
                if i < 0 or i + HEADER_SIZE > len(datos):
                    break
                if struct.unpack_from("<IH", datos, i + 32) != (0, 1):
                    continue
                base = offset_arrastre + i
                if self._confirmar(self._f, base):
                    encontrados.append(base)
            # Solaparse para no perder una cabecera partida entre dos lecturas.
            conservar = min(HEADER_SIZE, len(datos))
            offset_arrastre += len(datos) - conservar
            arrastre = datos[len(datos) - conservar :]
            self._f.seek(offset_arrastre + conservar)

        return encontrados

    # -- acceso a paginas ---------------------------------------------------- #

    def pagina(self, page_id: int, file_id: int = 1) -> bytes:
        if file_id != 1:
            raise FormatoInesperado(
                f"pagina {page_id} apunta al archivo {file_id}; este lector solo "
                "maneja bases de un solo archivo de datos"
            )
        self._f.seek(self._base + page_id * PAGE_SIZE)
        pag = self._f.read(PAGE_SIZE)
        if len(pag) < PAGE_SIZE:
            raise FormatoInesperado(f"pagina {page_id} fuera del backup")
        return pag

    def recorrer_paginas(self, tipo: int | None = None):
        """
        Recorre el backup de punta a punta.

        De a bloques grandes a proposito: son medio millon de paginas y leerlas de a
        8 KB convierte un barrido de segundos en uno de minutos.
        """
        self._f.seek(self._base)
        numero = 0
        while True:
            buf = self._f.read(BLOQUE_LECTURA)
            if len(buf) < PAGE_SIZE:
                return
            for i in range(0, len(buf) - PAGE_SIZE + 1, PAGE_SIZE):
                if buf[i] == 1 and (tipo is None or buf[i + 1] == tipo):
                    yield numero, buf[i : i + PAGE_SIZE]
                numero += 1

    def _indice_datos(self) -> dict[int, list[int]]:
        """
        Mapea objId -> numeros de sus paginas de datos, con un solo barrido.

        Sin esto cada tabla se lleva por delante los 4 GB del backup; con esto se paga
        un barrido y despues cada tabla lee solo sus paginas.
        """
        if self._indice is None:
            indice: dict[int, list[int]] = {}
            for numero, pag in self.recorrer_paginas(PAGE_DATA):
                indice.setdefault(struct.unpack_from("<i", pag, 24)[0], []).append(numero)
            self._indice = indice
        return self._indice

    # -- registros ----------------------------------------------------------- #

    @staticmethod
    def _slots(pagina: bytes):
        for i in range(struct.unpack_from("<H", pagina, 22)[0]):
            off = struct.unpack_from("<H", pagina, PAGE_SIZE - 2 * (i + 1))[0]
            if 0 < off < PAGE_SIZE:
                yield off

    @staticmethod
    def parsear_registro(pagina: bytes, off: int) -> Registro:
        status_a = pagina[off]
        largo_fijas = struct.unpack_from("<H", pagina, off + 2)[0]
        fijas = pagina[off + 4 : off + largo_fijas]

        cursor = off + largo_fijas
        ncols = struct.unpack_from("<H", pagina, cursor)[0]
        cursor += 2

        bytes_bitmap = (ncols + 7) // 8
        bitmap = pagina[cursor : cursor + bytes_bitmap]
        cursor += bytes_bitmap
        nulos = [bool(bitmap[i // 8] >> (i % 8) & 1) for i in range(ncols)]

        variables: list[tuple[bytes, bool]] = []
        if status_a & 0x20:  # el registro trae columnas de longitud variable
            nvar = struct.unpack_from("<H", pagina, cursor)[0]
            cursor += 2
            finales = [
                struct.unpack_from("<H", pagina, cursor + 2 * i)[0] for i in range(nvar)
            ]
            cursor += 2 * nvar
            anterior = cursor - off
            for fin in finales:
                # El bit alto marca "columna compleja": no es el dato sino un puntero
                # (LOB o row-overflow).
                complejo = bool(fin & 0x8000)
                fin &= 0x7FFF
                variables.append((pagina[off + anterior : off + fin], complejo))
                anterior = fin

        return Registro(fijas=fijas, ncols=ncols, nulos=nulos, variables=variables)

    def recorrer_filas(self, tabla: Tabla):
        """
        Devuelve los registros PRIMARY de una tabla.

        Cualquier registro de otro tipo se acumula y se reporta al final: en este
        backup no hay ninguno, y si aparecieran significaria que el lector se esta
        salteando filas reales (un FORWARDED tiene datos).
        """
        inesperados: dict[str, int] = {}
        for numero in self._indice_datos().get(tabla.objid, []):
            pag = self.pagina(numero)
            for off in self._slots(pag):
                tipo = (pag[off] >> 1) & 7
                if tipo != REC_PRIMARY:
                    nombre = REC_NAMES.get(tipo, str(tipo))
                    inesperados[nombre] = inesperados.get(nombre, 0) + 1
                    continue
                yield self.parsear_registro(pag, off)

        if inesperados:
            raise FormatoInesperado(
                f"{tabla.nombre}: aparecieron registros que este lector no maneja "
                f"({inesperados}). Habria que extenderlo antes de migrar, o se pierden filas."
            )

    def decodificar(self, tabla: Tabla, reg: Registro) -> dict:
        """Convierte un registro crudo a un dict con los nombres del esquema nuevo."""
        if reg.ncols != tabla.ncols:
            raise FormatoInesperado(
                f"{tabla.nombre}: fila con {reg.ncols} columnas, se esperaban {tabla.ncols}"
            )

        fila: dict = {}
        for col in tabla.columnas:
            if col.offset is not None:
                crudo = reg.fijas[col.offset : col.offset + (16 if col.tipo == "uuid" else 8)]
                fila[col.nombre] = _uuid(crudo) if col.tipo == "uuid" else _datetime2(crudo)
                continue

            # Columna variable. SQL Server recorta las del final que no tienen datos,
            # asi que "ausente" no es un caso raro: hay que resolverlo con el bitmap.
            if col.var is None or col.var >= len(reg.variables):
                fila[col.nombre] = None if reg.es_nulo(col.pos) else ("" if col.tipo == "text" else b"")
                continue

            crudo, complejo = reg.variables[col.var]
            if reg.es_nulo(col.pos):
                fila[col.nombre] = None
            elif col.tipo == "lob":
                fila[col.nombre] = PunteroLob.desde(crudo) if complejo else bytes(crudo)
            elif complejo:
                # nvarchar(max) que no entro en la fila: el texto vive en paginas de LOB.
                fila[col.nombre] = self.leer_lob(PunteroLob.desde(crudo)).decode("utf-16-le")
            else:
                fila[col.nombre] = crudo.decode("utf-16-le")

        return fila

    def filas(self, tabla: Tabla):
        for reg in self.recorrer_filas(tabla):
            yield self.decodificar(tabla, reg)

    # -- LOBs ---------------------------------------------------------------- #

    def leer_lob(self, puntero: "PunteroLob") -> bytes:
        """
        Reensambla un varbinary(max) / nvarchar(max) que vive fuera de la fila.

        El puntero en fila ya lista los pedazos de primer nivel; cada uno puede ser
        una hoja con bytes o un nodo interno que a su vez lista mas pedazos. El orden
        de recorrido es el orden del contenido.
        """
        partes: list[bytes] = []
        for page_id, file_id, slot in puntero.hijos:
            self._recolectar(page_id, file_id, slot, partes, 0)

        datos = b"".join(partes)
        if len(datos) != puntero.largo:
            raise FormatoInesperado(
                f"LOB {puntero.hijos[0]}: se reensamblaron {len(datos)} bytes pero el "
                f"puntero declara {puntero.largo}"
            )
        return datos

    def _recolectar(
        self, page_id: int, file_id: int, slot: int, partes: list[bytes], nivel: int
    ) -> None:
        if nivel > 8:
            raise FormatoInesperado(f"arbol de LOB demasiado profundo en la pagina {page_id}")

        pag = self.pagina(page_id, file_id)
        if pag[1] not in (PAGE_TEXT_MIX, PAGE_TEXT_TREE):
            raise FormatoInesperado(
                f"pagina {page_id}: se esperaba una pagina de LOB y es de tipo {pag[1]}"
            )

        off = struct.unpack_from("<H", pag, PAGE_SIZE - 2 * (slot + 1))[0]
        if not 0 < off < PAGE_SIZE:
            raise FormatoInesperado(f"pagina {page_id}: slot {slot} vacio")

        # Cabecera comun: 2 bytes de status, 4 con el largo del registro, 4 de blob id
        # y, tras dos bytes sin usar, 2 con el tipo de nodo.
        largo_reg = struct.unpack_from("<I", pag, off + 2)[0]
        tipo = struct.unpack_from("<H", pag, off + 12)[0]

        if tipo == LOB_DATA:
            partes.append(bytes(pag[off + 14 : off + largo_reg]))
            return

        if tipo == LOB_INTERNAL:
            hijos = struct.unpack_from("<H", pag, off + 16)[0]
            for i in range(hijos):
                # Cada entrada son 16 bytes: 8 del offset acumulado (u64, porque un LOB
                # puede pasar los 4 GB) y 8 del rowid del hijo.
                base = off + 20 + 16 * i
                hp, hf, hs = struct.unpack_from("<IHH", pag, base + 8)
                self._recolectar(hp, hf, hs, partes, nivel + 1)
            return

        raise FormatoInesperado(
            f"pagina {page_id} slot {slot}: nodo de LOB de tipo {tipo}, no soportado"
        )


# Tipos de nodo dentro de una pagina de LOB.
LOB_INTERNAL = 2   # indice: lista (offset acumulado, rowid) de sus hijos
LOB_DATA = 3       # hoja: los bytes en si


@dataclass
class PunteroLob:
    """
    El puntero que queda en la fila cuando la columna vive fuera.

    Son 12 bytes de cabecera (tipo 4, un contador y el blob id) y despues una entrada
    de 12 bytes por pedazo: 4 del offset acumulado y 8 del rowid. El largo total del
    LOB es el ultimo offset acumulado.
    """

    largo: int
    hijos: list[tuple[int, int, int]]  # (page_id, file_id, slot)

    @staticmethod
    def desde(crudo: bytes) -> "PunteroLob":
        if len(crudo) < 24 or (len(crudo) - 12) % 12 != 0:
            raise FormatoInesperado(
                f"puntero de LOB de {len(crudo)} bytes: no es cabecera de 12 mas entradas de 12"
            )
        tipo = struct.unpack_from("<H", crudo, 0)[0]
        if tipo != 4:
            raise FormatoInesperado(f"puntero de LOB de tipo {tipo}, se esperaba 4")

        largo = 0
        hijos: list[tuple[int, int, int]] = []
        for i in range((len(crudo) - 12) // 12):
            base = 12 + 12 * i
            largo = struct.unpack_from("<I", crudo, base)[0]
            page_id, file_id, slot = struct.unpack_from("<IHH", crudo, base + 4)
            hijos.append((page_id, file_id, slot))
        return PunteroLob(largo=largo, hijos=hijos)
