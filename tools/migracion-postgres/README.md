# Migración de datos: SQL Server → Postgres

Pasa los datos del consultorio desde el backup de la base vieja de SQL Server
(`HealthArchive.bak`) al Postgres nuevo que corre en Railway.

Lee el `.bak` **directamente**, sin SQL Server: un backup no comprimido guarda las
páginas del MDF tal cual, y `sqlserver_bak.py` las interpreta. Así la migración se puede
correr desde cualquier máquina y repetir las veces que haga falta.

## Qué migra

| Tabla | Filas | Notas |
|---|---:|---|
| `Doctors` | 15 + 1 | las contraseñas pasan de texto plano a hash de ASP.NET Core Identity |
| `Patients` | 6.138 | 26 DNI repetidos se desambiguan; van todos al consultorio inicial |
| `HCEs` | 6.138 | |
| `Evolutions` | 17.719 | |
| `HCEFiles` | 4.950 | 3,63 GB de adjuntos, en una etapa aparte |

(Conteos del backup del 30/08/2026, que es la referencia en `esquema.py`.)

`RefreshTokens` no se migra: son tokens de sesión y la tabla no existía en el origen.

## Ojo con los backup sets

`BACKUP DATABASE ... TO DISK` **agrega** un backup set al archivo si no le pasan
`WITH INIT`. Un `.bak` que crece de golpe al doble seguramente tiene dos backups
encadenados, no el doble de datos.

El lector los enumera y usa **el último**, que es el más reciente, y avisa por consola
cuál eligió. Si hiciera falta otro, `--backup-set N` (1-based). Además, si alguna tabla
trae **menos** filas que el backup de referencia de `esquema.py`, `extraer` corta: es la
señal de que se apuntó a un set viejo.

## Antes de empezar

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/migracion-postgres/requirements.txt
```

La conexión sale de `DATABASE_URL`, nunca del repo. En Railway está en la pestaña
Variables del servicio de Postgres (usar la URL **pública**, no la `.internal`):

```bash
export DATABASE_URL='postgresql://usuario:clave@host:puerto/railway'
```

Para el usuario admin nuevo, poner la contraseña antes de extraer. Si no se pone, el
script genera una y la imprime **una sola vez**:

```bash
export ADMIN_EMAIL='tu@email.com'      # opcional
export ADMIN_PASSWORD='...'            # opcional
```

## Los pasos, en orden

```bash
# 1. Leer el backup. No toca la red ni la base.
.venv/bin/python tools/migracion-postgres/migrar.py extraer \
    --bak ~/Downloads/HealthArchive.bak --out ~/migracion-healtharchive

# 2. Confirmar que los hashes validan contra el PasswordHasher real de .NET.
.venv/bin/python tools/migracion-postgres/migrar.py verificar-hashes \
    --bak ~/Downloads/HealthArchive.bak --in ~/migracion-healtharchive

# 3. Mirar el destino sin tocarlo.
.venv/bin/python tools/migracion-postgres/migrar.py preflight

# 4. Cargar lo relacional. Una transacción: o entra todo o no entra nada.
.venv/bin/python tools/migracion-postgres/migrar.py cargar --in ~/migracion-healtharchive

# 5. Verificar.
.venv/bin/python tools/migracion-postgres/migrar.py verificar --in ~/migracion-healtharchive

# 6. Los adjuntos. --volumen-gb es el tamaño del volumen segun el dashboard de Railway.
.venv/bin/python tools/migracion-postgres/migrar.py archivos \
    --bak ~/Downloads/HealthArchive.bak --in ~/migracion-healtharchive --volumen-gb 5
```

**`~/migracion-healtharchive` tiene historias clínicas reales.** Queda fuera del repo a
propósito. No subirlo a ningún lado y borrarlo cuando la migración esté confirmada.

### Sobre los adjuntos

Son 3,63 GB de PDFs, JPEGs y algún ZIP que van a `HCEFiles.Content` (`bytea`). Medido
contra un Postgres 16 real, la migración completa ocupa:

| | |
|---|---:|
| base de datos (`HCEFiles` es el 99%) | **2,98 GB** |
| `pg_wal` después de la carga masiva | ~1,0 GB |
| **total del volumen (`PGDATA`)** | **~4,0 GB** |

TOAST comprime parte de los PDFs, así que la base pesa menos que los archivos crudos.
Entra en los 5 GB del plan Hobby de Railway, pero deja poco margen.

**Postgres no puede ver el tamaño de su propio volumen**, y `pg_database_size` no cuenta el
WAL. Por eso `archivos` pide `--volumen-gb`: mirás el número en el dashboard de Railway y
lo declarás. Con eso el comando proyecta el total antes de escribir un solo byte y se
niega a arrancar si no entra, en vez de descubrirlo a mitad de camino cuando el servidor
se cae con el disco lleno.

> **Subir de plan no agranda el volumen.** Sube el techo. El volumen creado en Trial se
> queda en 0,5 GB hasta que lo agrandes a mano: servicio Postgres → Volume → Settings →
> Grow. Si el volumen está al 100%, el resize es offline y reinicia el servicio.

`archivos` va de a lotes con commit por lote, chequea el tamaño de la base después de cada
uno y corta si pasa `--limite-gb`. **Es reanudable**: al volver a correr saltea lo que ya
está, así que si se corta (por límite, por red o a mano) alcanza con repetir el comando.

## Decisiones que toma el script

- **Contraseñas.** En el origen estaban en texto plano (el login viejo las comparaba tal
  cual). Se hashean con el formato de ASP.NET Core Identity v3 —PBKDF2-HMACSHA512,
  100.000 iteraciones, salt de 16 bytes—, que es exactamente lo que produce y valida
  `PasswordHasherService`. **Cada doctor mantiene su contraseña de siempre.** El texto
  plano no se escribe en ningún archivo; `verificar-hashes` lo pasa por pipe.

- **Consultorio.** Todos los doctores y pacientes quedan en el consultorio
  `11111111-1111-1111-1111-111111111111` ("Consultorio principal"), que crea la migración
  `Consultorios` justamente para heredar los datos que ya existían.

- **Roles.** `fazar@intramed.net` y el usuario admin nuevo quedan como `Admin`; los otros
  14 como `Doctor`.

- **DNI repetidos.** El esquema nuevo tiene un índice único `(ConsultorioId, DNI)` y el
  origen no lo tenía. Entran los 6.108 pacientes: conserva el DNI original el que tiene más
  evoluciones, y a los otros se les agrega sufijo (`14630380-2`). Sale todo en
  `reporte-dni-duplicados.csv` para unificarlos a mano desde la app. Ningún dato clínico
  se descarta.

- **Fechas de nacimiento implausibles.** Hay 22 con años de una o tres cifras (`0963`,
  `0025`), típicos de tipeo al cargar. Se migran **tal cual** —son datos del consultorio,
  no corrupción— y salen listadas en `reporte-fechas-sospechosas.csv`.

- **Campos vacíos.** El origen no tiene NULLs en `Patients`: lo que falta está como cadena
  vacía, y así se migra. En `Doctors` los únicos NULL son las dos columnas de teléfono, que
  en el esquema nuevo son nullable.

## Archivos

| Archivo | Qué hace |
|---|---|
| `migrar.py` | la CLI: `extraer`, `verificar-hashes`, `preflight`, `cargar`, `archivos`, `verificar` |
| `sqlserver_bak.py` | lee el `.bak`: ubica el MDF, parsea páginas, registros y árboles de LOB |
| `esquema.py` | el layout físico de las tablas viejas, derivado del historial de migraciones |
| `identity_hash.py` | el hash formato Identity v3 |
| `verificar_hash.cs` | chequea los hashes contra el `PasswordHasher` real de .NET |

`verificar_hash.cs` corre desde el home y no desde el repo: el `global.json` de la raíz
pide el SDK 10.0.301 y para este chequeo alcanza con cualquier .NET 10. `migrar.py
verificar-hashes` ya lo llama así.

## Si algo no cierra

`extraer` corta si los conteos por tabla no dan los esperados, si aparecen filas huérfanas
o si el `.bak` tiene tipos de registro que el lector no maneja. Un backup distinto de este
—otra versión del esquema, o comprimido— hace fallar el paso 1 en vez de cargar datos
mal: el layout físico de las columnas está fijado en `esquema.py` y depende del historial
exacto de migraciones de la base vieja.
