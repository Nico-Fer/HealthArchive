using HealthArchiveAPI.Data;
using HealthArchiveAPI.Repository.IRepository;

namespace HealthArchiveAPI.Repository
{

        public class AuthServiceRepository : IAuthServiceRepository
        {

            private readonly DBContextHealth _db;
            public AuthServiceRepository(DBContextHealth db)
            {
                _db = db;
            }

            public Doctor Authenticate(string doctorEmail, string password)
            {
                
                var user = _db.Doctors.FirstOrDefault(u => u.Email == doctorEmail);

                if (user == null || user.Password != password)
                {
                    return null;
                }

                return user;
            }
        }

}
