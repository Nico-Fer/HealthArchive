using HealthArchiveAPI.Data;
using HealthArchiveAPI.Repository;
using HealthArchiveAPI.Repository.IRepository;
using Microsoft.EntityFrameworkCore;
using HealthArchiveAPI.Mapper;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<DBContextHealth>(opt => opt.UseSqlServer(builder.Configuration.GetConnectionString("DbContext")));

// Add services to the container.

//Add Repsitories
builder.Services.AddScoped<IDoctorRepository, DoctorRepository>();
builder.Services.AddScoped<IEvolutionRepository, EvolutionRepository>();
builder.Services.AddScoped<IHceRepository, HceRepository>();
builder.Services.AddScoped<IPatientRepository, PatientRepository>();

//Add AutoMapper
builder.Services.AddAutoMapper(typeof(DoctorMapper));

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
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

// Configure the HTTP request pipeline.
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
