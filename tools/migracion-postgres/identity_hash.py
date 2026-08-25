"""
Hash de contrasenas en el formato de ASP.NET Core Identity (version 3).

`PasswordHasherService` del proyecto usa `PasswordHasher<Doctor>`, asi que las
contrasenas migradas tienen que quedar en ese formato exacto o el login no valida.
El layout, en base64:

    0x01 | PRF (uint32 BE) | iteraciones (uint32 BE) | largo del salt (uint32 BE)
         | salt | subkey

`VerifyHashedPassword` lee el PRF, las iteraciones y el salt del propio hash, asi que
lo unico que tiene que coincidir es el formato; los parametros de abajo son los
defaults de .NET 8+, que es contra lo que corre el proyecto (net10.0).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import struct

FORMATO_V3 = 0x01

# PRF: 0 = HMACSHA1, 1 = HMACSHA256, 2 = HMACSHA512.
PRF_HMACSHA512 = 2
_HASHLIB = {0: "sha1", 1: "sha256", 2: "sha512"}

ITERACIONES = 100_000
BYTES_SALT = 16
BYTES_SUBKEY = 32


def hashear(password: str, salt: bytes | None = None) -> str:
    """Devuelve el hash en base64, listo para la columna Doctors.Password."""
    salt = salt if salt is not None else os.urandom(BYTES_SALT)
    subkey = hashlib.pbkdf2_hmac(
        _HASHLIB[PRF_HMACSHA512], password.encode("utf-8"), salt, ITERACIONES, BYTES_SUBKEY
    )
    cabecera = struct.pack(">BIII", FORMATO_V3, PRF_HMACSHA512, ITERACIONES, len(salt))
    return base64.b64encode(cabecera + salt + subkey).decode("ascii")


def verificar(hash_b64: str, password: str) -> bool:
    """
    Misma logica que `VerifyHashedPassword`, para poder chequear sin levantar .NET.

    No reemplaza a `verificar_hash.cs`: eso es lo que prueba que el formato coincide
    con la implementacion real. Esto es la red de seguridad barata.
    """
    crudo = base64.b64decode(hash_b64)
    if not crudo or crudo[0] != FORMATO_V3:
        return False

    prf, iteraciones, largo_salt = struct.unpack_from(">III", crudo, 1)
    algoritmo = _HASHLIB.get(prf)
    if algoritmo is None or largo_salt < 8:
        return False

    salt = crudo[13 : 13 + largo_salt]
    esperado = crudo[13 + largo_salt :]
    if len(esperado) < 16:
        return False

    calculado = hashlib.pbkdf2_hmac(
        algoritmo, password.encode("utf-8"), salt, iteraciones, len(esperado)
    )
    return hmac.compare_digest(calculado, esperado)


def password_aleatoria(largo: int = 20) -> str:
    """Contrasena para el admin que se crea de cero, cuando no viene por variable."""
    alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alfabeto) for _ in range(largo))


if __name__ == "__main__":
    # Chequeo de ida y vuelta, mas el caso obvio de que una contrasena distinta falle.
    h = hashear("una contrasena de prueba")
    assert verificar(h, "una contrasena de prueba")
    assert not verificar(h, "otra cosa")
    assert len(base64.b64decode(h)) == 13 + BYTES_SALT + BYTES_SUBKEY
    print("identity_hash OK:", h)
