using HealthArchive.Domain;
using Microsoft.EntityFrameworkCore;

namespace HealthArchive.Infrastructure.Data
{
    public class DBContextHealth : DbContext
    {
        public DBContextHealth(DbContextOptions<DBContextHealth> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Doctor>()
                .OwnsOne(d => d.PhoneNumber);

            modelBuilder.Entity<Patient>()
                .OwnsOne(p => p.PhoneNumber);

            modelBuilder.Entity<Patient>()
                .OwnsOne(p => p.MedicalCoverage, coverage =>
                {
                    coverage.Property(c => c.Number).IsRequired(false);
                    coverage.Property(c => c.Coverage).IsRequired(false);
                });

            modelBuilder.Entity<Evolution>().OwnsOne(e => e.EvolutionInfo);

            modelBuilder.Entity<Consultorio>()
                .HasIndex(c => c.Name)
                .IsUnique();

            // Restrict a propósito: borrar un consultorio no debe arrastrar doctores
            // ni pacientes. Si hay que darlo de baja, primero se reubican sus datos.
            modelBuilder.Entity<Doctor>()
                .HasOne(d => d.Consultorio)
                .WithMany()
                .HasForeignKey(d => d.ConsultorioId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Patient>()
                .HasOne(p => p.Consultorio)
                .WithMany()
                .HasForeignKey(p => p.ConsultorioId)
                .OnDelete(DeleteBehavior.Restrict);

            // El DNI es único dentro del consultorio, no globalmente: dos consultorios
            // distintos pueden atender legítimamente al mismo paciente.
            modelBuilder.Entity<Patient>()
                .HasIndex(p => new { p.ConsultorioId, p.DNI })
                .IsUnique();

            modelBuilder.Entity<RefreshToken>(rt =>
            {
                rt.HasIndex(t => t.Token).IsUnique();
                rt.HasOne<Doctor>()
                    .WithMany()
                    .HasForeignKey(t => t.DoctorId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        public DbSet<Consultorio> Consultorios { get; set; }
        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Patient> Patients { get; set; }
        public DbSet<HCE> HCEs { get; set; }
        public DbSet<Evolution> Evolutions { get; set; }
        public DbSet<HCEFile> HCEFiles { get; set; }
    }
}
