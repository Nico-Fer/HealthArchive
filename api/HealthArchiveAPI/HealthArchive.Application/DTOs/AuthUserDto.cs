namespace HealthArchive.Application.DTOs
{
    public class AuthUserDto
    {
        /// <summary>
        /// Id del doctor. Lo necesita el front para decidir si muestra el botón de editar
        /// una evolución (solo el autor puede). El chequeo real igual vive en el backend:
        /// esto es nada más para no ofrecer una acción que va a dar 403.
        /// </summary>
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string Tuition { get; set; }
        public string Role { get; set; }
    }
}
