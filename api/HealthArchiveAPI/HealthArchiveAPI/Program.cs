using HealthArchive.Application.Interfaces;
using HealthArchive.Infrastructure.Data;
using HealthArchive.Infrastructure.Repositories;
using HealthArchive.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using System.Text.Json.Serialization;

// Npgsql: map all DateTime to 'timestamp without time zone' (no UTC enforcement).
// Remove this switch in Phase 7 when repos are async and DateTimes are all UTC.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Railway (y la mayoría de PaaS) inyectan en PORT el puerto que el container debe
// escuchar. En local no existe y valen los puertos de launchSettings.json.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Detrás del proxy de Railway el container recibe HTTP plano; sin esto el request
// se ve como http y se pierde la IP de origen.
builder.Services.Configure<ForwardedHeadersOptions>(opt =>
{
    opt.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // El proxy no tiene IP fija conocida: sin limpiar estas listas los headers se descartan.
    opt.KnownNetworks.Clear();
    opt.KnownProxies.Clear();
});

builder.Services.AddDbContext<DBContextHealth>(opt =>
    opt.UseNpgsql(
        BuildConnectionString(builder.Configuration),
        b => b.MigrationsAssembly("HealthArchive.Infrastructure")));

builder.Services.AddControllers().AddJsonOptions(opt =>
{
    opt.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Repositories
builder.Services.AddScoped<IDoctorRepository, DoctorRepository>();
builder.Services.AddScoped<IEvolutionRepository, EvolutionRepository>();
builder.Services.AddScoped<IHceRepository, HceRepository>();
builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<IConsultorioRepository, ConsultorioRepository>();
builder.Services.AddScoped<IAuthServiceRepository, AuthServiceRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

// Auth services
builder.Services.AddScoped<IPasswordHasher, PasswordHasherService>();
builder.Services.AddScoped<ITokenService, TokenService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Authentication: JWT read from an httpOnly cookie (not the Authorization header).
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "")),
            RoleClaimType = ClaimTypes.Role,
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue("access_token", out var token))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var corsRules = "CorsRules";
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(name: corsRules, policy =>
    {
        // Credentials (cookies) require explicit origins; AllowAnyOrigin is not permitted with them.
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Rate limiting. Particiona por IP del cliente, que es correcta gracias al
// UseForwardedHeaders de más arriba: sin eso, detrás del proxy de Railway todas las
// requests parecerían venir de la misma IP y el límite global se aplicaría a todos juntos.
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Límite general, pensado para navegación normal de la app.
    opt.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ClientIp(ctx),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // Mucho más estricta, para los endpoints anónimos: son los que permiten fuerza
    // bruta de contraseñas y alta masiva de cuentas.
    opt.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ClientIp(ctx),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    static string ClientIp(HttpContext ctx) =>
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
});

var app = builder.Build();

// Fail-fast en prod: estas rompen el deploy de formas difíciles de diagnosticar
// (500 en cada request firmado, o CORS bloqueando todo el front). Mejor no arrancar.
if (app.Environment.IsProduction())
{
    if (Encoding.UTF8.GetByteCount(builder.Configuration["Jwt:Key"] ?? "") < 32)
    {
        throw new InvalidOperationException(
            "Jwt:Key debe tener al menos 32 bytes para firmar con HMAC-SHA256. Setear Jwt__Key en el host.");
    }

    if (allowedOrigins.Length == 0)
    {
        throw new InvalidOperationException(
            "Cors:AllowedOrigins está vacío: el front no va a poder llamar al API. Setear Cors__AllowedOrigins.");
    }

    if (string.IsNullOrWhiteSpace(builder.Configuration["Registration:ConsultoryCode"]))
    {
        throw new InvalidOperationException(
            "Registration:ConsultoryCode está vacío: nadie podría registrarse. Setear Registration__ConsultoryCode.");
    }
}

// Aplicar migraciones pendientes al arrancar. Apagado por defecto: se prende con
// RunMigrationsOnStartup=true (env var) en el primer deploy y se puede volver a apagar.
if (app.Configuration.GetValue<bool>("RunMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<DBContextHealth>().Database.Migrate();
}

// El código del consultorio inicial no se puede sembrar desde la migración porque
// hay que hashearlo, y eso es código de la app. Lo completa acá.
// Idempotente: solo actúa si el hash está vacío, así que no pisa un código que se
// haya rotado después desde la API.
SeedConsultorioInicial(app);

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // En prod el TLS lo termina el proxy; redirigir acá dispara warnings o loops.
    app.UseHttpsRedirection();
}

app.UseCors(corsRules);
// Después de UseCors a propósito: así las respuestas 429 llevan los headers de CORS y
// el browser muestra el 429 real en vez de un error de CORS engañoso.
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Healthcheck del hosting (Railway) — sin auth a propósito.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

// Completa el CodeHash del consultorio que creó la migración `Consultorios`, hasheando
// Registration:ConsultoryCode. El Guid está fijado en esa migración.
static void SeedConsultorioInicial(WebApplication app)
{
    var consultorioInicialId = new Guid("11111111-1111-1111-1111-111111111111");

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<DBContextHealth>();

    var consultorio = db.Consultorios.FirstOrDefault(c => c.Id == consultorioInicialId);
    if (consultorio == null || !string.IsNullOrEmpty(consultorio.CodeHash))
    {
        return;
    }

    var code = app.Configuration["Registration:ConsultoryCode"];
    if (string.IsNullOrWhiteSpace(code))
    {
        // En Production no se llega acá: el fail-fast de arriba ya cortó.
        app.Logger.LogWarning(
            "El consultorio inicial quedó sin código: Registration:ConsultoryCode está vacío. Nadie va a poder registrarse.");
        return;
    }

    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    consultorio.CodeHash = hasher.Hash(code);
    db.SaveChanges();

    app.Logger.LogInformation("Se sembró el código del consultorio inicial.");
}

// Railway expone la conexión de Postgres como DATABASE_URL en formato URI;
// Npgsql espera key=value. Si hay ConnectionStrings:DbContext, ese gana (local).
static string BuildConnectionString(IConfiguration config)
{
    var configured = config.GetConnectionString("DbContext");
    if (!string.IsNullOrWhiteSpace(configured))
    {
        return configured;
    }

    var databaseUrl = config["DATABASE_URL"];
    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        throw new InvalidOperationException(
            "Falta la conexión a la base: setear ConnectionStrings__DbContext o DATABASE_URL.");
    }

    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);

    return new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        // Prefer: usa TLS contra el proxy público de Railway y texto plano
        // en la red interna (postgres.railway.internal), que no lo ofrece.
        SslMode = SslMode.Prefer,
        TrustServerCertificate = true,
    }.ConnectionString;
}
