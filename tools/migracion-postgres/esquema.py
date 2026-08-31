"""
Layout fisico de las tablas de HealthArchive en la base SQL Server vieja.

El orden fisico de las columnas NO es el del entity de EF: es el que fue dejando el
historial de migraciones de `api/HealthArchiveAPI/HealthArchiveAPI/Migrations/`.
Las columnas agregadas despues van al final, y las borradas siguen ocupando su lugar
en las filas que ya existian. Cada layout de aca esta derivado de esas migraciones y
validado contra los datos reales del backup.

`pos` es la posicion fisica (la que indexa el null bitmap). `offset` es el byte inicial
dentro de la porcion de longitud fija. `var` es el indice dentro del array de columnas
variables, que solo cuenta columnas variables.

`filas_esperadas` es la referencia del ultimo backup analizado (30/08/2026). Un backup
mas nuevo va a traer mas filas y eso esta bien; menos filas significa que algo se leyo
mal o que se apunto a un backup set viejo, y ahi la extraccion corta.
"""

from sqlserver_bak import Columna, Tabla

# El consultorio que siembra la migracion `Consultorios` y que hereda todos los datos
# que ya existian. El Guid esta fijado ahi y en el seeder de Program.cs.
CONSULTORIO_INICIAL = "11111111-1111-1111-1111-111111111111"


def _txt(nombre: str, pos: int, var: int) -> Columna:
    return Columna(nombre=nombre, pos=pos, tipo="text", var=var)


DOCTORS = Tabla(
    nombre="Doctors",
    objid=223,
    filas_esperadas=15,
    ncols=10,
    largo_fijas=28,
    columnas=[
        Columna("Id", 0, "uuid", offset=0),
        _txt("Name", 1, 0),
        _txt("Email", 2, 1),
        _txt("Password", 3, 2),
        _txt("PhoneNumber_PhoneNumber", 4, 3),
        # pos 5 son los 8 bytes de la columna BirthDate que borro la migracion
        # `Tuition Added`. El hueco sigue ahi (por eso ncols es 10 y no 9) pero el
        # dato no se migra: la entidad nueva no tiene fecha de nacimiento del doctor.
        _txt("Description", 6, 4),
        _txt("LastName", 7, 5),
        _txt("PhoneNumber_CountryCode", 8, 6),
        _txt("Tuition", 9, 7),
    ],
)

PATIENTS = Tabla(
    nombre="Patients",
    objid=226,
    filas_esperadas=6138,
    ncols=14,
    largo_fijas=28,
    columnas=[
        Columna("Id", 0, "uuid", offset=0),
        _txt("Name", 1, 0),
        _txt("LastName", 2, 1),
        _txt("DNI", 3, 2),
        Columna("BirthDate", 4, "datetime2", offset=16),
        _txt("Country", 5, 3),
        _txt("PhoneNumber_CountryCode", 6, 4),
        _txt("PhoneNumber_PhoneNumber", 7, 5),
        _txt("HomeAddress", 8, 6),
        _txt("MedicalCoverage_Coverage", 9, 7),
        _txt("MedicalCoverage_Number", 10, 8),
        _txt("Email", 11, 9),
        _txt("Note", 12, 10),
        _txt("Ocupation", 13, 11),
    ],
)

HCES = Tabla(
    nombre="HCEs",
    objid=229,
    filas_esperadas=6138,
    ncols=2,
    largo_fijas=36,
    columnas=[
        Columna("Id", 0, "uuid", offset=0),
        Columna("PatientId", 1, "uuid", offset=16),
    ],
)

EVOLUTIONS = Tabla(
    nombre="Evolutions",
    objid=237,
    filas_esperadas=17719,
    ncols=6,
    largo_fijas=44,
    columnas=[
        Columna("Id", 0, "uuid", offset=0),
        Columna("HCEId", 1, "uuid", offset=16),
        _txt("EvolutionInfo_ModifiedBy", 2, 0),
        Columna("ModifiedDate", 3, "datetime2", offset=32),
        _txt("Notes", 4, 1),
        _txt("EvolutionInfo_Tuition", 5, 2),
    ],
)

HCEFILES = Tabla(
    nombre="HCEFiles",
    objid=241,
    filas_esperadas=4950,
    ncols=4,
    largo_fijas=36,
    columnas=[
        Columna("Id", 0, "uuid", offset=0),
        _txt("FileName", 1, 0),
        Columna("Content", 2, "lob", var=1),
        Columna("HCEId", 3, "uuid", offset=16),
    ],
)

# En orden de foreign key: asi se insertan y asi se verifican.
RELACIONALES = [DOCTORS, PATIENTS, HCES, EVOLUTIONS]
TODAS = RELACIONALES + [HCEFILES]
