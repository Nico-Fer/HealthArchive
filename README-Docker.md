# HealthArchive - Docker Setup

Este proyecto incluye una configuración completa de Docker Compose para ejecutar el sistema HealthArchive con todos sus componentes.

## Componentes

- **Backend**: API .NET 8 con Entity Framework
- **Frontend**: Aplicación React
- **Base de datos**: SQL Server 2022 Express
- **Reverse Proxy**: Nginx (opcional)

## Requisitos previos

- Docker Desktop instalado
- Docker Compose disponible
- Al menos 4GB de RAM disponible
- Puertos 80, 3000, 5000, 1433 disponibles

## Configuración rápida

### Opción 1: Usando Make (recomendado)

```bash
# Construir y ejecutar todo
make dev

# Ver logs en tiempo real
make logs

# Ver estado de servicios
make status
```

### Opción 2: Usando Docker Compose directamente

```bash
# Construir las imágenes
docker-compose build

# Ejecutar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## Acceso a los servicios

Una vez que todos los contenedores estén corriendo:

- **Aplicación completa**: http://localhost (con nginx proxy)
- **Frontend directo**: http://localhost:3000
- **API directo**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger
- **Base de datos**: localhost:1433 (sa/HealthArchive123!)

## Comandos útiles

### Gestión de servicios

```bash
# Parar todos los servicios
make down
# o
docker-compose down

# Reiniciar servicios
make restart

# Ver logs específicos
make logs-api        # Solo API
make logs-frontend   # Solo Frontend
make logs-db         # Solo Base de datos
```

### Desarrollo

```bash
# Ejecutar migraciones
make migrate
# o
docker-compose exec api dotnet ef database update

# Acceder al contenedor del API
make shell-api

# Acceder a la base de datos
make shell-db
```

### Limpieza

```bash
# Limpiar todo (contenedores, imágenes, volúmenes)
make clean
# o
docker-compose down -v --rmi all
```

## Estructura de archivos

```
HealthArchive/
├── docker-compose.yml          # Configuración principal
├── Dockerfile.backend          # Imagen del API
├── Dockerfile.frontend         # Imagen del frontend
├── Makefile                    # Comandos simplificados
├── .dockerignore              # Archivos excluidos del build
└── docker/
    ├── nginx.conf             # Config nginx para frontend
    ├── nginx-proxy.conf       # Config nginx para reverse proxy
    └── init-db.sh            # Script de inicialización de DB
```

## Configuración de base de datos

La base de datos se configurará automáticamente con:
- **Usuario**: sa
- **Contraseña**: HealthArchive123!
- **Base de datos**: HealthArchive
- **Puerto**: 1433

Los datos se persistirán en un volumen Docker llamado `healtharchive_sqlserver_data`.

## Troubleshooting

### El API no puede conectarse a la base de datos

1. Verificar que el servicio sqlserver esté corriendo:
   ```bash
   docker-compose ps
   ```

2. Verificar logs de la base de datos:
   ```bash
   make logs-db
   ```

3. Verificar que la conexión funcione:
   ```bash
   docker-compose exec api dotnet ef database update --verbose
   ```

### El frontend no carga

1. Verificar que el build de React completó correctamente:
   ```bash
   make logs-frontend
   ```

2. Verificar que nginx esté corriendo:
   ```bash
   docker-compose ps nginx
   ```

### Puertos ocupados

Si algún puerto está ocupado, puedes modificar los puertos en `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Cambiar 3000 por 8080
  
  api:
    ports:
      - "8001:80"  # Cambiar 5000 por 8001
```

## Desarrollo local

Para desarrollo local sin Docker:

1. **Base de datos**: Usar el contenedor de SQL Server:
   ```bash
   docker-compose up sqlserver -d
   ```

2. **API**: Ejecutar localmente apuntando a la DB en Docker:
   ```bash
   cd api/HealthArchiveAPI/HealthArchiveAPI
   dotnet run
   ```

3. **Frontend**: Ejecutar localmente:
   ```bash
   cd web-app
   npm start
   ```

## Variables de entorno

Puedes personalizar la configuración creando un archivo `.env`:

```env
# Base de datos
SA_PASSWORD=TuPasswordSegura123!
DB_NAME=HealthArchive

# API
ASPNETCORE_ENVIRONMENT=Development
API_PORT=5000

# Frontend
FRONTEND_PORT=3000

# Nginx
NGINX_PORT=80
```

## Backup y Restore

### Crear backup

```bash
make backup-db
```

### Restore desde backup

```bash
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P HealthArchive123! -Q "RESTORE DATABASE HealthArchive FROM DISK = '/var/opt/mssql/data/tu_backup.bak' WITH REPLACE"
```

## Monitoreo

Para monitorear el estado de salud de los servicios:

```bash
# Estado general
docker-compose ps

# Logs en tiempo real
make logs

# Verificar health checks
docker inspect healtharchive-api --format='{{.State.Health.Status}}'
```