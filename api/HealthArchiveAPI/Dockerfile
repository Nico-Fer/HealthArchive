# Build context = api/HealthArchiveAPI (el directorio de la solución).
# En Railway: Root Directory = api/HealthArchiveAPI.

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar solo los .csproj primero: la capa de restore se cachea mientras no
# cambien las referencias de paquetes.
COPY HealthArchiveAPI/HealthArchiveAPI.csproj HealthArchiveAPI/
COPY HealthArchive.Application/HealthArchive.Application.csproj HealthArchive.Application/
COPY HealthArchive.Domain/HealthArchive.Domain.csproj HealthArchive.Domain/
COPY HealthArchive.Infrastructure/HealthArchive.Infrastructure.csproj HealthArchive.Infrastructure/
RUN dotnet restore HealthArchiveAPI/HealthArchiveAPI.csproj

COPY . .
RUN dotnet publish HealthArchiveAPI/HealthArchiveAPI.csproj \
    -c Release -o /app/publish --no-restore

# ---- runtime ----
# Imagen Debian (no Alpine) a propósito: el csproj usa InvariantGlobalization=false
# y necesita ICU, que Alpine no trae.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production

# Fallback: si el host no inyecta PORT, Program.cs deja el default del runtime.
EXPOSE 8080

ENTRYPOINT ["dotnet", "HealthArchiveAPI.dll"]
