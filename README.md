# 🚀 HealthArchive - Setup Universal

## Requisitos Previos

### Software necesario:
- **Docker Desktop** (Windows/Mac/Linux)
- **Git** para clonar el repositorio

### Verificar instalación:
```bash
docker --version
docker-compose --version
git --version
```

## 📥 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/Nico-Fer/HealthArchive.git
cd HealthArchive
```

### 2. Levantar la aplicación
```bash
# Un solo comando para todo
docker-compose up -d

# Ver el progreso
docker-compose logs -f
```

### 3. Acceder a la aplicación
- **Aplicación completa**: http://localhost
- **API directa**: http://localhost:5000
- **Solo Frontend**: http://localhost:3000

## ⚡ Comandos Esenciales

```bash
# Levantar todo
docker-compose up -d

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs api        # Logs del backend
docker-compose logs frontend   # Logs del frontend
docker-compose logs -f         # Todos los logs en tiempo real

# Parar todo
docker-compose down

# Reconstruir tras cambios
docker-compose up -d --build

# Limpiar todo (¡cuidado! borra la BD)
docker-compose down -v
```

## 🛠️ Desarrollo

### Para modificar el código:

1. **Backend (.NET)**:
   ```bash
   # Hacer cambios en /api/HealthArchiveAPI/
   docker-compose up -d --build api
   ```

2. **Frontend (React)**:
   ```bash
   # Hacer cambios en /web-app/
   docker-compose up -d --build frontend
   ```

### Para desarrollo local (sin Docker):
- Ver `README-Docker.md` para setup tradicional

## 🌐 Accesos

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Aplicación completa** | http://localhost | Frontend + API via Nginx |
| **API directa** | http://localhost:5000 | Backend .NET directo |
| **Frontend directo** | http://localhost:3000 | React app directo |
| **Base de datos** | localhost:1433 | SQL Server (sa/HealthArchive123!) |

## 🐛 Solución de Problemas

### "No se puede conectar"
```bash
# Verificar que Docker está corriendo
docker ps

# Reiniciar servicios
docker-compose restart
```

### "Puerto en uso"
```bash
# Ver qué está usando el puerto
netstat -an | findstr :80
netstat -an | findstr :5000

# Cambiar puertos en docker-compose.yml si es necesario
```

### "Error de migraciones de base de datos"
```bash
# Ejecutar migraciones manualmente
docker-compose exec api dotnet ef database update
```

### "Contenedor unhealthy"
```bash
# Ver logs específicos
docker-compose logs [servicio]

# Reiniciar servicio específico
docker-compose restart [servicio]
```

## 📊 Verificar que Todo Funciona

```bash
# 1. Estado de servicios
docker-compose ps

# 2. Test de API
curl http://localhost/api/Doctor/GetDoctors

# 3. Abrir en navegador
# http://localhost
```

## 🔧 Configuración Avanzada

### Variables de entorno personalizadas:
Crear archivo `.env` en la raíz:
```env
# Base de datos
SA_PASSWORD=TuPasswordPersonalizada
DATABASE_NAME=HealthArchive

# API
ASPNETCORE_ENVIRONMENT=Production
API_PORT=5000

# Frontend
FRONTEND_PORT=3000
NGINX_PORT=80
```

### Para producción:
1. Cambiar passwords en `.env`
2. Configurar SSL/HTTPS
3. Usar volúmenes externos para backup

## ✅ Compatibilidad

- ✅ **Windows** (Docker Desktop)
- ✅ **macOS** (Docker Desktop)  
- ✅ **Linux** (Docker CE)
- ✅ **WSL2** (Windows Subsystem for Linux)

## 🎯 ¿Necesitas ayuda?

1. Verificar [Issues en GitHub](https://github.com/Nico-Fer/HealthArchive/issues)
2. Revisar logs: `docker-compose logs -f`
3. Verificar que Docker Desktop esté corriendo

---

**¡Con estos pasos, cualquier persona puede tener HealthArchive funcionando en 5 minutos! 🚀**