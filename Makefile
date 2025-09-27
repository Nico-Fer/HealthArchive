# Makefile para HealthArchive Docker

# Variables
COMPOSE_FILE := docker-compose.yml
PROJECT_NAME := healtharchive

# Comandos principales
.PHONY: help build up down restart logs clean

help: ## Mostrar esta ayuda
	@echo "Comandos disponibles para HealthArchive:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Construir todas las imágenes
	docker-compose -f $(COMPOSE_FILE) build --no-cache

up: ## Levantar todos los servicios
	docker-compose -f $(COMPOSE_FILE) up -d

down: ## Bajar todos los servicios
	docker-compose -f $(COMPOSE_FILE) down

restart: ## Reiniciar todos los servicios
	docker-compose -f $(COMPOSE_FILE) restart

logs: ## Ver logs de todos los servicios
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-api: ## Ver logs del API
	docker-compose -f $(COMPOSE_FILE) logs -f api

logs-frontend: ## Ver logs del frontend
	docker-compose -f $(COMPOSE_FILE) logs -f frontend

logs-db: ## Ver logs de la base de datos
	docker-compose -f $(COMPOSE_FILE) logs -f sqlserver

status: ## Ver el estado de los servicios
	docker-compose -f $(COMPOSE_FILE) ps

clean: ## Limpiar contenedores, imágenes y volúmenes
	docker-compose -f $(COMPOSE_FILE) down -v --rmi all

dev: ## Modo desarrollo - construcción y ejecución
	make build && make up && make logs

migrate: ## Ejecutar migraciones de Entity Framework
	docker-compose -f $(COMPOSE_FILE) exec api dotnet ef database update

seed: ## Ejecutar seed de datos (si existe)
	docker-compose -f $(COMPOSE_FILE) exec api dotnet run --seed-data

shell-api: ## Abrir shell en el contenedor del API
	docker-compose -f $(COMPOSE_FILE) exec api bash

shell-db: ## Abrir shell en el contenedor de la base de datos
	docker-compose -f $(COMPOSE_FILE) exec sqlserver bash

backup-db: ## Crear backup de la base de datos
	docker-compose -f $(COMPOSE_FILE) exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P HealthArchive123! -Q "BACKUP DATABASE HealthArchive TO DISK = '/var/opt/mssql/data/HealthArchive_backup_$$(date +%Y%m%d_%H%M%S).bak'"