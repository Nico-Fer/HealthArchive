using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Infrastructure.Data;
using HealthArchive.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

// Npgsql: map all DateTime to 'timestamp without time zone' (no UTC enforcement).
// Remove this switch in Phase 7 when repos are async and DateTimes are all UTC.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<DBContextHealth>(opt =>
    opt.UseNpgsql(
        builder.Configuration.GetConnectionString("DbContext"),
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
builder.Services.AddScoped<IAuthServiceRepository, AuthServiceRepository>();

// AutoMapper — single call scans the whole Application assembly
builder.Services.AddAutoMapper(typeof(DoctorMapper).Assembly);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var corsRules = "CorsRules";
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(name: corsRules, builder =>
    {
        builder.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(corsRules);
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
