# Adjuntos clínicos a object storage — plan

Plan (todavía no ejecutado) para mover el contenido de los adjuntos de las historias
clínicas — hoy `HCEFiles.Content`, un `bytea` en Postgres — a un bucket de object storage.
El objetivo es doble: sacar ~3 GB del volumen de Railway antes de que se llene, y de paso
corregir que los adjuntos viajen enteros en el JSON de la historia clínica.

## El punto de partida

**4.950 archivos, 3,63 GB crudos, 2,98 GB de base** (TOAST comprime). `HCEFiles` es el
99% del tamaño de la base; sin los adjuntos, queda en ~50 MB. El volumen de Postgres en
Railway es de 5 GB — tope duro del plan Hobby — y está al ~80%. Al ritmo de carga del
consultorio, el margen se agota entre 1 y 3 años. La mayoría son PDFs de estudios, más
JPEGs, PNGs y algún ZIP/DOCX. Ningún archivo pasa de 3,8 MB.

El defecto que se corrige de paso: hoy el único camino de lectura es
`GET /api/Patient/GetClinicHistory/{dni}`, cuyo repositorio hace
`.ThenInclude(ch => ch.Files)` (`PatientRepository.GetClinicHistory`) y el controller
devuelve el grafo de entidades tal cual. `System.Text.Json` serializa cada `byte[]` como
base64, así que abrir un paciente con 5 PDFs baja los 5 enteros aunque el médico no abra
ninguno. En el front, `FilesCollection.tsx` hace `atob(content)` → `Blob` para descargar
lo que ya tiene en memoria.

## La decisión de fondo: streaming por la API, no URLs prefirmadas

Es la decisión que condiciona todo lo demás, y se resuelve contra el modelo de seguridad.

El aislamiento por consultorio se implementa en tres capas (ver `CLAUDE.md`): el claim
`consultorio` del JWT, los repositorios que filtran por `consultorioId`, y — para todo lo
que llega por GUID en la ruta — la validación explícita de pertenencia. Para los adjuntos
esa validación es `IHceRepository.FileBelongsToConsultorio(fileId, consultorioId)`, que
recorre `HCEFile → HCE → Patient → ConsultorioId`, y el controller responde **404, no
403**, para no confirmar que el recurso existe (`HceController.DeleteFile` +
`LogAccesoAjeno` son el patrón exacto).

Una URL prefirmada rompe eso por diseño: es un *capability token*. Quien la tenga —
durante todo su TTL — descarga el objeto, sin cookie, sin claim, sin
`FileBelongsToConsultorio`. Y las URLs se filtran solas: quedan en el historial del
navegador, en logs de proxies corporativos, en un mensaje reenviado. La autenticación de
esta app vive en cookies httpOnly justamente para que ningún token viaje por lugares
visibles; emitir prefirmadas sería crear la primera excepción.

**Se evaluó la variante intermedia** — prefirmadas de vida corta (60 s) emitidas *después*
de validar la pertenencia — y también se descarta, por costo/beneficio:

- Lo que ahorra: el egreso y la CPU de Railway por servir las descargas. Con el supuesto
  de ~1,5 GB/mes de descargas (≈400 descargas de un archivo promedio; **no hay métricas
  en el repo, ajustar con los datos reales de Railway**) y egreso a $0,05/GB, son
  **~$0,08/mes**. La CPU de streamear archivos de ≤3,8 MB para un consultorio es trivial.
- Lo que cuesta: configurar CORS en el bucket (hoy el bucket no necesita saber que Vercel
  existe), un flujo de dos pasos en el front (pedir la URL, después pedir el objeto), y
  una ventana de 60 s en la que la URL es un secreto con patas.

**Recomendación: streaming por la API.** Un endpoint nuevo:

```
GET /api/Hce/DownloadFile/{fileId}
  → User.GetConsultorioId() ?? 403
  → FileBelongsToConsultorio(fileId, consultorioId) ?? 404 + LogAccesoAjeno
  → File(streamDelBucket, contentType, fileName)
```

Idéntico en estructura a `DeleteFile`, que ya valida así. Beneficios laterales: las
credenciales del bucket viven **solo en Railway** (Vercel no cambia ni una variable), y la
cookie httpOnly sigue siendo la única autenticación del sistema.

Queda documentada la salida de emergencia: si el egreso creciera dos órdenes de magnitud,
el mismo endpoint puede pasar a validar la pertenencia y responder un redirect a una
prefirmada de 60 s. La validación no se pierde; solo se abarata el transporte. No hay que
decidirlo hoy.

## Qué bucket: Cloudflare R2

Comparación para 3,63 GB almacenados, ~0,4 GB/mes de subidas, ~1,5 GB/mes de descargas
(el supuesto de arriba) y unos cientos de operaciones por mes. Precios a agosto 2026:

| | Cloudflare R2 | AWS S3 Standard | Backblaze B2 |
|---|---|---|---|
| Storage | $0,015/GB-mes, **10 GB-mes gratis** | $0,023/GB-mes (free tier solo 12 meses) | $0,006/GB-mes |
| Operaciones | 1M Class A + 10M Class B gratis/mes | $0,005/1000 PUT, $0,0004/1000 GET | similares a S3 |
| Egreso | **$0, siempre** | $0,09/GB (100 GB/mes gratis) | gratis hasta 3× el storage |
| **Costo mensual del caso** | **$0,00** | ~$0,08–0,09 | ~$0,02 |

Los tres son regalados en términos absolutos; la diferencia no es la plata sino lo que el
egreso gratis de R2 habilita **operativamente**: la verificación del backfill (bajar de
vuelta los 3,63 GB para comparar hashes, ver más abajo) y un eventual rollback completo
(bajar todo de nuevo a Postgres) cuestan $0 y se pueden repetir las veces que haga falta
sin mirar el medidor. Además R2 expone la API de S3, así que no hay lock-in de código: si
mañana conviene B2 o S3, cambia el endpoint y las credenciales, no el cliente.

Caveats de R2 a tener presentes:

- Requiere **habilitar billing** en la cuenta de Cloudflare (tarjeta cargada) aunque el
  uso quede en $0.
- Las versiones recientes del SDK de S3 mandan checksums CRC32 que R2 rechaza: el cliente
  se configura con `RequestChecksumCalculation`/`ResponseChecksumValidation` en
  `WHEN_REQUIRED`, y `ForcePathStyle = true`.
- Sobre residencia de datos: ni el Postgres de Railway ni R2 están en Argentina, así que
  este cambio **no altera** la postura actual respecto de la Ley 25.326 — los datos ya
  viven afuera. R2 acepta un *location hint* pero no da garantía dura de región.

## El esquema de claves

```
consultorio/{ConsultorioId}/hce/{HCEId}/{FileId}
```

Tres GUIDs y nada más. El `FileName` **no** va en la clave: los médicos nombran los
archivos con datos del paciente ("RMN-perez-juan.pdf"), y la clave aparece en logs,
métricas y paneles del proveedor. El nombre real queda en la base y sale en el
`Content-Disposition` de la descarga.

El prefijo por consultorio permite razonar el bucket con las mismas fronteras que la
base: listar, contar o borrar lo de un consultorio es un `ListObjects` con prefijo.

La clave se **guarda** en la columna `StorageKey`, no se deriva al vuelo. Dos razones: si
el esquema de claves cambia algún día, las filas viejas siguen apuntando bien; y —más
importante— **la autorización nunca sale de la clave**. Aunque la clave contenga el
`ConsultorioId`, la pertenencia se valida siempre contra la base
(`FileBelongsToConsultorio`), que es la única fuente de verdad.

## El esquema de base y las dos migraciones

`HCEFile` pasa a tener esta forma:

```csharp
public string FileName { get; set; }
[JsonIgnore] public byte[]? Content { get; set; }   // transitorio: se dropea en la migración B
[JsonIgnore] public string? StorageKey { get; set; }
public string? ContentType { get; set; }
public long? SizeBytes { get; set; }
[JsonIgnore] public string? Sha256 { get; set; }    // hex; verificación de backfill y rollback
```

- **Migración A — `HCEFileStorageMetadata`**: agrega `StorageKey text`, `ContentType
  text`, `SizeBytes bigint`, `Sha256 text` (todas nullable) y vuelve `Content` nullable.
  No toca datos: es instantánea.
- **Migración B — `DropHCEFileContent`**: dropea `Content`. Recién semanas después, con
  el backfill verificado y el espacio ya liberado (el drop de columna en Postgres es solo
  metadata; el espacio lo devuelve el `VACUUM FULL` de la sección del backfill). El
  `Down` re-agrega la columna vacía — parcial y documentado, como el precedente de
  `MultipleMedicalCoverages`.

Los `[JsonIgnore]` siguen el precedente de `Doctor.Password`: como `GetClinicHistory`
serializa la entidad directo, un atributo protege todos los endpoints a la vez, presentes
y futuros. Sobre `Content` corta el base64 del JSON desde el primer deploy (el front deja
de recibir los archivos aunque el backfill no haya empezado); sobre `StorageKey` y
`Sha256` evita exponer internals que el front no necesita. `ContentType` y `SizeBytes` sí
salen: sirven para mostrar el tipo y el peso en la lista de archivos.

Entre A y B el código funciona en **dual-read**: si `StorageKey != null` se lee del
bucket; si no, del `bytea`. Los uploads nuevos van **solo al bucket** — no hay
dual-write: escribir también en una base al 80% sería regar el problema que se está
apagando. El `Id` del archivo se pasa a generar en código, antes del `PUT` (hoy es
`DatabaseGenerated`, pero EF acepta un valor explícito): hace falta conocer la clave
antes de insertar la fila.

## Los cambios en la API

**La interfaz va en `Application`** (que sigue sin paquetes NuGet), la implementación en
`Infrastructure`, como todo lo demás:

```csharp
public interface IFileStorage
{
    Task PutAsync(string key, Stream content, string contentType, long length);
    Task<Stream> GetAsync(string key);
    Task DeleteAsync(string key);
}
```

- **`R2FileStorage`** (`HealthArchive.Infrastructure/Services/`) la implementa con
  **`AWSSDK.S3`** — la única dependencia nueva del backend, y va justificada porque este
  proyecto las minimiza a propósito: es Apache-2.0, mantenida por AWS, y la alternativa
  "sin dependencia" es firmar SigV4 a mano sobre `HttpClient`, que es más código, más
  frágil y más difícil de auditar que el SDK. Se registra **singleton** en `Program.cs`
  (`AmazonS3Client` es thread-safe y reutiliza conexiones).
- **`HceController.UploadFile`**: deja el `MemoryStream.ToArray()` y pasa
  `file.OpenReadStream()` directo al `PUT` (con `file.ContentType`, default
  `application/octet-stream`). Después inserta la fila con la metadata. El límite de
  tamaño lo sigue poniendo Kestrel (30 MB por defecto), holgado para archivos de ≤4 MB.
- **`HceController.DownloadFile`** (nuevo): el flujo de la sección de la decisión de
  fondo. Siempre con `Content-Disposition: attachment` — el `ContentType` lo declara el
  browser al subir y no es de confianza para renderizar inline.
- **`HceController.DeleteFile`**: ver la sección de consistencia.
- **`IHceRepository`** suma `GetFileMeta(Guid fileId)` — `FileName`, `ContentType`,
  `StorageKey`, `SizeBytes`, sin materializar `Content` — y para el dual-read un
  `GetFileContent(Guid fileId)` que sí trae el `bytea` (solo se usa mientras exista la
  columna; muere con la migración B).
- **`GetClinicHistory` no se toca**: el `[JsonIgnore]` resuelve la serialización y las
  columnas nuevas salen solas en el JSON.

## Consistencia sin transacción

El bucket y la base no comparten transacción, así que la invariante se elige de antemano:
**la base es la fuente de verdad; el bucket puede tener objetos de más, nunca de menos.**
Un objeto huérfano en el bucket es invisible (nadie tiene su fila) y cuesta centavos; una
fila cuyo objeto no existe es un error 500 en la cara del médico. Todo el diseño empuja
los fallos hacia el primer caso:

- **Upload**: primero `PUT` al bucket, después `INSERT` de la fila. Si el `INSERT` falla,
  queda un huérfano; si se invirtiera el orden y fallara el `PUT`, quedaría una fila
  mentirosa.
- **Delete**: primero un `SELECT` liviano de `StorageKey` (sin `Content`), después el
  `ExecuteDelete()` de la fila — **se mantiene**, y con `Content` dropeado su razón
  original (no materializar MBs para borrar) desaparece pero sigue siendo lo más simple —
  y al final `DeleteObject` *best-effort*: si falla, se loguea la clave con `Warning` y
  queda huérfano. No se reintenta en línea ni se revierte el borrado: para el médico el
  archivo ya no existe, y eso es lo correcto.
- **Reconciliación**: un comando de la herramienta de backfill (`reconciliar`, ver abajo)
  lista las claves del bucket contra los `StorageKey` de la base y borra los huérfanos
  con más de 24 horas (margen para uploads en curso). **Nunca borra filas en la base** —
  la invariante solo se repara en una dirección.

## El backfill, paso a paso

Herramienta nueva en **`tools/adjuntos-bucket/`** (`backfill.py`, `reconciliar.py`,
`requirements.txt` con `psycopg[binary]` y `boto3`). No se toca
`tools/migracion-postgres/`: esa herramienta lee el `.bak` de SQL Server y quedó
congelada tal como se corrió; esta lee Postgres y escribe un bucket. Sí se le calca el
patrón completo de su comando `archivos`, que ya demostró funcionar con estos mismos
4.950 archivos: inventario de metadatos, marcador de reanudación en el destino, lotes con
commit, verificación de contenido y fail-fast con mensaje operativo.

Prerrequisitos: bucket creado con su token, migración A aplicada, API nueva deployada
(dual-read funcionando), y `DATABASE_URL` + `R2_*` en el entorno de quien lo corre.

1. **Inventario y reanudación.** `SELECT "Id", "FileName", "HCEId",
   length("Content")` + join a `Patients` por el `ConsultorioId`, con `WHERE "StorageKey"
   IS NULL`. Esa condición **es** el marcador de reanudación (el equivalente del set
   `ya_estan` de `migrar.py`): si el proceso se corta, re-correrlo retoma donde quedó.
2. **Por lote de ~25 archivos** (~100 MB): leer el `bytea`, calcular **sha256**, validar
   **magic bytes contra la extensión** (los mismos cuatro de la migración: `%PDF`,
   `\xFF\xD8\xFF`, `\x89PNG`, `PK\x03\x04`), `PUT` a R2, **`GET` de vuelta y comparar el
   sha256** — con egreso gratis la verificación puede ser del 100%, no un muestreo —,
   `UPDATE` de `StorageKey`/`ContentType`/`SizeBytes`/`Sha256`, y commit del lote.
   Progreso por lote (`N/M archivos`).
3. **Verificación global.** Conteo de objetos en el bucket == filas con `StorageKey NOT
   NULL` == 4.950; muestreo adicional re-descargando y re-hasheando 1 de cada 100.
4. **Soak de 2–4 semanas.** La app sirve todo desde el bucket (dual-read con todas las
   `StorageKey` pobladas) pero `Content` sigue intacto: cualquier problema se resuelve
   revirtiendo el deploy, gratis. El margen del volumen banca la espera.
5. **Backup frío antes de liberar.** `pg_dump -t '"HCEFiles"'` a disco local (~3 GB). Es
   la segunda red, independiente del bucket.
6. **Liberar:** `UPDATE "HCEFiles" SET "Content" = NULL WHERE "StorageKey" IS NOT NULL`,
   en lotes de ~200 filas para acotar el WAL. Poner NULL no duplica espacio: los chunks
   TOAST quedan muertos, a la espera del vacuum.
7. **`VACUUM "HCEFiles"` y después `VACUUM FULL "HCEFiles"`.** El orden con el paso 6 es
   la trampa del volumen al 80%: `VACUUM FULL` escribe una **copia nueva** de la tabla
   con solo las filas vivas y recién entonces suelta la vieja — con `Content` poblado
   necesitaría ~3 GB libres que no existen; con `Content` en NULL la copia pesa unos MB y
   entra sobrada. Se corre por `psql` con la `DATABASE_URL` pública de Railway, fuera de
   horario de consultorio (toma un lock exclusivo, pero sobre una tabla ya sin contenido
   es cuestión de segundos).
8. **Verificar `pg_database_size` ≈ 50 MB.** El volumen de Railway no se achica (solo
   crece), pero deja de importar: lo que cuenta es el espacio usado, que queda al ~1%.
9. **Semanas después: migración B** (drop de `Content`) y borrar el camino de dual-read
   (`GetFileContent` y la rama del `bytea`).

## Rollback, por fase

| Fase | Vuelta atrás |
|---|---|
| Código deployado, sin backfill | Redeploy de la imagen anterior. Ventana: los archivos subidos al bucket en el ínterin no tienen `Content` — re-subirlos desde la app o correr un backfill inverso puntual (el sha256 está para verificarlo). |
| Backfill hecho, `Content` intacto (pasos 1–5) | Revertir el deploy y listo: la base sigue completa. **Gratis** — por eso el soak va antes de liberar. Las `StorageKey` pobladas no molestan. |
| `Content` en NULL (pasos 6–8) | Script inverso bucket → `bytea`, verificando contra `Sha256` fila por fila; el volumen tiene espacio de sobra (recién se vació). Segunda red: el `pg_dump` local del paso 5. |
| Columna dropeada (paso 9) | Re-aplicar la migración A + el mismo script inverso. El punto de no retorno real es perder el bucket **y** el `pg_dump` a la vez. |

## El front

Cuatro archivos, todos cambios chicos:

- **`web-app/src/Types/HCEFile.ts`**: fuera `content: string`; entran `contentType?:
  string` y `sizeBytes?: number`.
- **`web-app/src/api/client.ts`**: un helper nuevo, sobre `apiFetch` para heredar las
  cookies y el retry del 401:

  ```ts
  export const apiGetBlob = async (path: string): Promise<Blob> => {
    const res = await apiFetch(path);
    if (!res.ok) throw await toApiError(res, path, 'GET', ...);
    return res.blob();
  };
  ```

- **`FilesCollection.tsx`**: `handleDownload` deja el `atob` y pasa a
  `apiGetBlob(`/api/Hce/DownloadFile/${file.id}`)` → `createObjectURL` → click. La UX no
  cambia; lo que cambia es que baja **un** archivo cuando el médico lo pide, no los cinco
  al abrir la historia.
- **`HistoriaClinica.tsx`**: el mapping de `data.files` sin `content`.
- **`AddHCEFile.tsx`**: solo el tipo de la respuesta (el `HCEFile` nuevo).

## Secretos y config por ambiente

Sección nueva `Storage` en la configuración del backend, con el mismo tratamiento que
`Jwt`: **fail-fast en Production** desde `Program.cs` si falta algo (mejor que no
arranque a que falle en la primera descarga).

| | Dónde | Claves |
|---|---|---|
| Local (backend) | user-secrets (patrón `Jwt:Key`) | `Storage:ServiceUrl`, `Storage:Bucket`, `Storage:AccessKey`, `Storage:SecretKey` |
| Railway | env vars | `Storage__ServiceUrl`, `Storage__Bucket`, `Storage__AccessKey`, `Storage__SecretKey` |
| Herramienta de backfill | env vars de quien la corre | `DATABASE_URL` (patrón `migrar.py`) + `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET` |
| Vercel | — | **sin cambios** (consecuencia directa de elegir streaming) |

Dos buckets — `healtharchive-adjuntos` (prod) y `healtharchive-adjuntos-dev` — con
**tokens de API scoped cada uno a su bucket**: el token de dev no puede tocar prod, y
`appsettings.json` sigue sin llevar ni un secreto.

## Lo que queda desalineado

El comando `archivos` de `tools/migracion-postgres/` escribe directo a
`HCEFiles.Content`. Después de la migración A sigue funcionando (la columna existe,
nullable, y el dual-read serviría esos archivos); después de la B, no. La regla es la
misma que ya rige para `MultipleMedicalCoverages`: **si hay que volver a correr la carga
del `.bak`, tiene que ser antes de aplicar estas migraciones**, y después correr el
backfill de este plan para subir lo cargado al bucket. No se modifica la herramienta
ahora: es la bitácora ejecutable de una migración ya hecha.

## Archivos a tocar en la implementación

| Capa | Archivo | Cambio |
|---|---|---|
| Domain | `HealthArchive.Domain/HCEFile.cs` | columnas nuevas, `Content` nullable, `[JsonIgnore]` |
| Application | `Interfaces/IFileStorage.cs` | **nuevo** |
| Application | `Interfaces/IHceRepository.cs` | `GetFileMeta`, `GetFileContent` (transitorio) |
| Infrastructure | `Services/R2FileStorage.cs` | **nuevo** |
| Infrastructure | `Repositories/HceRepository.cs` | métodos nuevos; `DeleteFile` devuelve la `StorageKey` |
| Infrastructure | `HealthArchive.Infrastructure.csproj` | + `AWSSDK.S3` |
| Infrastructure | `Migrations/` | migración A; migración B semanas después |
| API | `Controllers/HceController.cs` | `UploadFile` a streaming, `DownloadFile` nuevo, `DeleteFile` + objeto |
| API | `Program.cs` | DI de `IFileStorage`, fail-fast de `Storage:*` en Production |
| API | `appsettings*.json` | sección `Storage` (vacía en el base, como `ConnectionStrings`) |
| Front | `Types/HCEFile.ts`, `api/client.ts`, `FilesCollection.tsx`, `HistoriaClinica.tsx`, `AddHCEFile.tsx` | lo de la sección del front |
| Tools | `tools/adjuntos-bucket/` | **nuevo**: `backfill.py`, `reconciliar.py`, `requirements.txt` |

## Orden de ejecución

1. Crear la cuenta/bucket en R2 (prod y dev) con sus tokens scoped.
2. Implementar backend (incluida la migración A) y front; probar en local contra el
   bucket dev.
3. Deploy: variables `Storage__*` en Railway, deploy de API y front. La migración A se
   aplica con `RunMigrationsOnStartup=true`, como siempre.
4. Smoke test en prod: subir, descargar y borrar un archivo nuevo (nace en el bucket).
5. Backfill (pasos 1–3 de su sección) y verificación global.
6. Soak de 2–4 semanas con `Content` intacto.
7. `pg_dump` local → `Content = NULL` por lotes → `VACUUM FULL` → verificar ~50 MB.
8. Semanas después: migración B (drop) y limpieza del dual-read.
9. Dejar `reconciliar` como tarea manual periódica (o cuando un log de delete fallido lo
   pida).
