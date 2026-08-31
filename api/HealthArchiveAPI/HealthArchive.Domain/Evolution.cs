using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    public class Evolution
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        [ForeignKey("HCE")]
        public Guid HCEId { get; set; }
        public HCE ClinicHistory { get; set; } = null!;
        public string Notes { get; set; }
        public EvolutionInfo EvolutionInfo { get; set; }

        /// <summary>
        /// Autor de la evolución: el único que puede editarla. Es nullable a propósito
        /// porque las evoluciones anteriores a esta regla (y las migradas de SQL Server)
        /// no lo tienen, y sin autor identificable no las edita nadie.
        ///
        /// No hay propiedad de navegación al Doctor a propósito: PatientController
        /// .GetClinicHistory serializa el grafo de entidades tal cual, y una navegación
        /// arrastraría el Doctor entero al JSON de la historia clínica.
        /// </summary>
        public Guid? CreatedByDoctorId { get; set; }

        /// <summary>Fecha de alta. No se toca nunca más después del create.</summary>
        public DateTime CreatedDate { get; set; }

        /// <summary>
        /// Fecha de la última edición. Mientras sea igual a <see cref="CreatedDate"/> la
        /// evolución nunca se editó: el create asigna las dos con el mismo valor para que
        /// la comparación sea exacta y no haya que tolerar unos milisegundos de diferencia.
        /// </summary>
        public DateTime ModifiedDate { get; set; }
    }
}
