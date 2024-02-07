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
        public DbSet<Doctor> Doctors { get; set; }
    }
}
