# HealthArchive - Guía de Producción

## 🚀 Setup Completado

Tu aplicación HealthArchive está completamente configurada con Docker. Los componentes incluyen:

- **SQL Server 2022** - Base de datos con persistencia
- **.NET 8 API** - Backend con Entity Framework
- **React Frontend** - Aplicación web con Create React App
- **Nginx** - Proxy reverso para acceso unificado

## 📋 Comandos Principales

```bash
# Levantar toda la aplicación
docker-compose up -d

# Ver el estado de los servicios
docker-compose ps

# Ver logs de un servicio específico
docker-compose logs api
docker-compose logs frontend
docker-compose logs nginx

# Parar toda la aplicación
docker-compose down

# Reconstruir tras cambios en el código
docker-compose up -d --build
```

## 🌐 Acceso a la Aplicación

- **Frontend**: http://localhost (puerto 80)
- **API directa**: http://localhost:5000
- **Base de datos**: localhost:1433

## 🔧 Optimizaciones Implementadas

### Health Checks Configurados
- ✅ **SQL Server**: Health check nativo
- ✅ **API**: Health check usando endpoint `/api/Doctor/GetDoctors`
- ✅ **Frontend**: Health check con wget
- ✅ **Nginx**: Health check básico

### Seguridad
- ✅ Usuario no-root en contenedor API
- ✅ Variables de entorno para credenciales
- ✅ Red interna para comunicación entre servicios

### Performance
- ✅ Multi-stage builds para imágenes optimizadas
- ✅ Cache de capas Docker para builds rápidos
- ✅ Nginx como proxy reverso eficiente

## 🏗️ Arquitectura

```
Usuario → Nginx (puerto 80) → Frontend (React) + API (.NET)
                                     ↓
                               SQL Server (puerto 1433)
```

## 📊 Monitoreo

Para verificar que todo funciona correctamente:

1. **Health Status**: `docker-compose ps`
2. **API Test**: `curl http://localhost/api/Doctor/GetDoctors`
3. **Frontend**: Abrir http://localhost en el navegador

## 🛠️ Desarrollo

### Para desarrollo local (sin Docker):
- API: `dotnet run` en `/api/HealthArchiveAPI/HealthArchiveAPI`
- Frontend: `npm start` en `/web-app`
- DB: Usar connection string local en `appsettings.Development.json`

### Para producción:
- Usar el setup Docker actual
- Variables de entorno de producción
- SSL/TLS certificate para HTTPS

## 🚨 Troubleshooting

### Si un servicio está "unhealthy":
```bash
# Ver logs del servicio
docker-compose logs [servicio]

# Reiniciar un servicio específico
docker-compose restart [servicio]
```

### Si hay problemas de red:
```bash
# Recrear la red
docker-compose down
docker-compose up -d
```

### Si Entity Framework necesita migraciones:
```bash
# Ejecutar migrations manualmente
docker-compose exec api dotnet ef database update
```

## ✅ Estado Final

Tu setup Docker está **production-ready** con:
- ✅ Todos los servicios funcionando
- ✅ Base de datos migrada y funcional
- ✅ API respondiendo correctamente
- ✅ Frontend servido por Nginx
- ✅ Health checks configurados
- ✅ Networking optimizado

¡Tu aplicación HealthArchive está lista para usar! 🎉