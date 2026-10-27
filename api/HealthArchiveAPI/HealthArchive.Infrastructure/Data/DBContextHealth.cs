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

            // OwnsMany y no una entidad propia: las coberturas no tienen vida fuera del
            // paciente, se borran con él y no hace falta exponerles un Id al cliente. El
            // update reemplaza la colección entera, que es como ya trabaja PatientDto.ApplyTo.
            modelBuilder.Entity<Patient>()
                .OwnsMany(p => p.MedicalCoverages, coverage =>
                {
                    coverage.ToTable("PatientMedicalCoverages");
                    coverage.WithOwner().HasForeignKey("PatientId");
                    coverage.Property<int>("Id");
                    coverage.HasKey("PatientId", "Id");
                    coverage.Property(c => c.Number).IsRequired(false);
                    coverage.Property(c => c.Coverage).IsRequired(false);
                });

            modelBuilder.Entity<Evolution>().OwnsOne(e => e.EvolutionInfo);

            // SetNull y no Restrict: borrar un doctor no debe bloquearse por sus evoluciones
            // ni arrastrarlas. La evolución sobrevive y queda sin autor (o sea, ya no la edita
            // nadie); la trazabilidad se conserva igual en EvolutionInfo, que no se toca.
            modelBuilder.Entity<Evolution>()
                .HasOne<Doctor>()
                .WithMany()
                .HasForeignKey(e => e.CreatedByDoctorId)
                .OnDelete(DeleteBehavior.SetNull);

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

            modelBuilder.Entity<Appointment>(a =>
            {
                a.OwnsOne(x => x.PhoneNumber);
                a.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

                // Restrict, igual que doctores y pacientes: un consultorio no se borra en
                // cascada. Doctor y paciente sí arrastran sus turnos: sin ellos el turno no
                // significa nada (y el historial clínico vive en la HCE, no acá).
                a.HasOne(x => x.Consultorio)
                    .WithMany()
                    .HasForeignKey(x => x.ConsultorioId)
                    .OnDelete(DeleteBehavior.Restrict);
                a.HasOne(x => x.Doctor)
                    .WithMany()
                    .HasForeignKey(x => x.DoctorId)
                    .OnDelete(DeleteBehavior.Cascade);
                a.HasOne(x => x.Patient)
                    .WithMany()
                    .HasForeignKey(x => x.PatientId)
                    .OnDelete(DeleteBehavior.Cascade);

                // La agenda siempre se consulta por consultorio y rango de fechas.
                a.HasIndex(x => new { x.ConsultorioId, x.StartsAt });
                a.HasIndex(x => new { x.DoctorId, x.StartsAt });
            });

            modelBuilder.Entity<WhatsAppMessage>(m =>
            {
                m.Property(x => x.Kind).HasConversion<string>().HasMaxLength(30);
                m.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

                m.HasOne<Appointment>()
                    .WithMany()
                    .HasForeignKey(x => x.AppointmentId)
                    .OnDelete(DeleteBehavior.Cascade);
                m.HasOne<Doctor>()
                    .WithMany()
                    .HasForeignKey(x => x.DoctorId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Idempotencia del worker: un recordatorio por turno y una agenda por doctor
                // y día. Filtrados porque cada fila usa solo uno de los dos juegos de columnas
                // (y en Postgres los NULL no chocan entre sí en un índice único).
                m.HasIndex(x => new { x.Kind, x.AppointmentId })
                    .IsUnique()
                    .HasFilter("\"AppointmentId\" IS NOT NULL");
                m.HasIndex(x => new { x.Kind, x.DoctorId, x.LocalDate })
                    .IsUnique()
                    .HasFilter("\"DoctorId\" IS NOT NULL");
            });

            modelBuilder.Entity<RefreshToken>(rt =>
            {
                rt.HasIndex(t => t.TokenHash).IsUnique();
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
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<WhatsAppMessage> WhatsAppMessages { get; set; }
    }
}
