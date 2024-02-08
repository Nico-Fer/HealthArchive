using Microsoft.EntityFrameworkCore;

namespace HealthArchiveAPI.Data
{
    public class DBContextHealth : DbContext 
    {
        public DBContextHealth(DbContextOptions<DBContextHealth> options) : base(options)
        {
        }
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                IConfigurationRoot configuration = new ConfigurationBuilder()
                   .SetBasePath(Directory.GetCurrentDirectory())
                   .AddJsonFile("appsettings.json")
                   .Build();
                var connectionString = configuration.GetConnectionString("DbContext");
                optionsBuilder.UseSqlServer(connectionString);
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Doctor>()
                .OwnsOne(d => d.PhoneNumber);

            modelBuilder.Entity<Patient>()
                .OwnsOne(p => p.PhoneNumber);

            modelBuilder.Entity<Patient>()
                .OwnsOne(p => p.MedicalCoverage, coverage => {
                    coverage.Property(c => c.Number).IsRequired(false);
                    coverage.Property(c => c.Coverage).IsRequired(false);
                });
        }
        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<Patient> Patients { get; set; }
        public DbSet<HCE> HCEs { get; set; }
        public DbSet<Evolution> Evolutions { get; set;}
    }
}
