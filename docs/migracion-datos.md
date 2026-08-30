# Migración de los datos del consultorio a Postgres

Bitácora de cómo se pasaron los datos reales desde la base SQL Server vieja al Postgres
de Railway. La herramienta está en [`tools/migracion-postgres/`](../tools/migracion-postgres/),
con su propio README para correrla.

## El punto de partida

`HealthArchive.bak` (4,14 GB), backup completo tomado en `DESKTOP-TN6T5JQ\Usuario`.
Contiene el esquema anterior a la modernización: sin `Consultorios`, sin `RefreshTokens`,
sin `Doctors.Role`, y con las contraseñas en texto plano.

## Por qué no se restauró en SQL Server

No hay SQL Server disponible en las máquinas de desarrollo (macOS arm64, sin Docker), y
levantarlo bajo emulación para leer una base de unos pocos MB de datos relacionales no se
justificaba.

Un backup **no comprimido** de SQL Server guarda las páginas del archivo MDF tal cual
dentro del contenedor MTF. Verificado en este backup: el stream arranca en el offset
`0x2200` y de ahí en adelante son páginas de 8192 bytes con el formato de siempre. El
lector de `sqlserver_bak.py` trabaja sobre eso.

Chequeos que hicieron seguro ese camino:

- **0 registros forwarded y 0 ghost** en las cinco tablas. Un `FORWARDED` tiene datos
  reales, así que si hubiera habido alguno el lector estaría perdiendo filas en silencio;
  hoy corta con error si aparece uno.
- **0 filas huérfanas** en las tres foreign keys, y `PatientId` único en `HCEs`.
- Los **4.950 adjuntos** se reensamblan del árbol de LOB y los 3,63 GB validan dos veces:
  el largo coincide con el que declara el puntero en fila, y los magic bytes coinciden con
  la extensión del archivo (`%PDF`, `\xFF\xD8\xFF`, `\x89PNG`, `PK\x03\x04`).
- Los **15 hashes** generados validan contra el `PasswordHasher<T>` real de ASP.NET Core
  Identity, que es el que usa `PasswordHasherService`.

## Varios backup sets en un mismo archivo

El `.bak` del 30/08/2026 pesa el doble que el anterior y, sin embargo, trae casi los
mismos datos: son **dos backup sets encadenados** en el mismo archivo. `BACKUP DATABASE`
agrega al final si no le pasan `WITH INIT`, así que el archivo quedó con el backup viejo
en el offset `0x2200` y el nuevo en `0xf6b78600`.

Importa porque la primera versión del lector se quedaba con el primer stream que
encontraba, que es **el viejo**: habría migrado datos de una semana atrás sin que nada
avisara. Ahora los enumera todos, usa el último e informa cuál eligió; y `extraer` corta
si alguna tabla trae menos filas que la referencia de `esquema.py`, que es exactamente lo
que pasa al apuntar a un set viejo.

Para el consultorio, la recomendación es hacer los backups con `WITH INIT` (o a un archivo
nuevo cada vez) para que un `.bak` sea siempre un backup solo.

## El orden físico de las columnas

Es la parte delicada. El orden de las columnas dentro de una fila de SQL Server no es el
de la entidad de EF: es el que fue dejando el historial de migraciones. Las columnas que
se agregan van al final, y las que se borran **siguen ocupando su lugar** en las filas que
ya existían.

El caso más claro es `Doctors`: la migración `Tuition Added` borró `BirthDate` y agregó
`Tuition`. Las filas siguen teniendo 10 columnas y 8 bytes muertos donde estaba la fecha.
Leerla como si tuviera 9 columnas corre todo un lugar y mezcla contraseñas con teléfonos.

El layout de las cinco tablas está en `esquema.py`, derivado de las migraciones de
`api/HealthArchiveAPI/HealthArchiveAPI/Migrations/` y contrastado contra los datos.

## Lo que cambió al migrar

| | Origen | Destino |
|---|---|---|
| Contraseñas | texto plano | Identity v3 (PBKDF2-HMACSHA512, 100k iteraciones) — la contraseña de cada doctor sigue siendo la misma |
| `Doctors.Role` | no existía | `Admin` para `fazar@intramed.net` y el admin nuevo; `Doctor` para el resto |
| `ConsultorioId` | no existía | `11111111-1111-1111-1111-111111111111` para todos |
| `uniqueidentifier` | 16 bytes, primeros 3 grupos little-endian | `uuid` |
| `datetime2(7)` | 5 bytes de ticks de 100 ns + 3 de días | `timestamp without time zone` (microsegundos) |
| `nvarchar(max)` | UTF-16LE, en fila o en páginas de LOB | `text` |
| `varbinary(max)` | árbol de LOB | `bytea` |

## Lo que quedó pendiente de resolver a mano

Dos reportes que genera la extracción y que **no** se corrigen automáticamente:

- **`reporte-dni-duplicados.csv`** — 26 DNI repetidos, 59 pacientes. Son altas duplicadas
  (mismo nombre y misma fecha de nacimiento cargados dos o más veces). El esquema nuevo
  tiene un índice único `(ConsultorioId, DNI)` que el viejo no tenía, así que los
  duplicados entran con sufijo (`14630380-2`) para no perder ninguna historia clínica.
  Hay que unificarlos desde la app y devolverles el DNI real.

- **`reporte-fechas-sospechosas.csv`** — 22 fechas de nacimiento con año de una o tres
  cifras (`0963-04-01`, `0025-01-02`), típicos de tipeo. Se migraron tal cual.

## Volver a correrla

Es idempotente por diseño: `extraer` no toca la base, `cargar` exige el destino vacío y va
en una sola transacción, y `archivos` saltea lo que ya subió. Si hay que rehacer la
migración, vaciar las tablas destino en orden de foreign key y repetir desde `preflight`.
