using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.Repository.IRepository
{
    public interface IHceRepository
    {
        HCE GetHce(Guid id);
        ICollection<Evolution> GetEvolutions(Guid id);
        bool CreateHce(HCE hce);
        bool UpdateHce(HCE hce);
        bool DeleteHce(HCE hce);
        bool AddFile(HCEFile file);
        bool Save();
    }
}
