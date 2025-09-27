#!/bin/bash

# Esperar a que SQL Server esté listo
echo "Esperando a que SQL Server esté listo..."
sleep 30s

# Crear la base de datos si no existe
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P $SA_PASSWORD -Q "
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HealthArchive')
BEGIN
    CREATE DATABASE HealthArchive
    PRINT 'Base de datos HealthArchive creada exitosamente'
END
ELSE
BEGIN
    PRINT 'Base de datos HealthArchive ya existe'
END"

echo "Inicialización de base de datos completada"