#!/usr/bin/env dotnet
#:package Microsoft.Extensions.Identity.Core@10.0.0

// Comprueba los hashes generados por identity_hash.py contra la implementacion real que
// usa la API (`PasswordHasher<T>` de ASP.NET Core Identity, el mismo que instancia
// PasswordHasherService). Es lo que prueba que los doctores migrados van a poder entrar.
//
// Lee de stdin una linea por doctor, con tres campos separados por tab:
//
//     etiqueta <TAB> hash <TAB> contrasena en base64
//
// La contrasena va en base64 para que no importe que caracteres tenga, y llega por pipe
// a proposito: las contrasenas en claro no tienen por que tocar el disco.
//
//   ... | dotnet run verificar_hash.cs
//
// Correr desde un directorio fuera del repo: el global.json de la raiz pide un SDK
// 10.0.301 que puede no estar instalado, y para este chequeo no hace falta.

using System.Text;
using Microsoft.AspNetCore.Identity;

var hasher = new PasswordHasher<object>();

int verificados = 0;
var fallidos = new List<string>();

string? linea;
while ((linea = Console.ReadLine()) is not null)
{
    if (string.IsNullOrWhiteSpace(linea)) continue;

    var campos = linea.Split('\t');
    if (campos.Length != 3)
    {
        fallidos.Add($"(linea con {campos.Length} campos, se esperaban 3)");
        continue;
    }

    var etiqueta = campos[0];
    var hash = campos[1];
    var password = Encoding.UTF8.GetString(Convert.FromBase64String(campos[2]));

    // El primer argumento es el usuario y PasswordHasher no lo mira: PasswordHasherService
    // le pasa null igual que aca.
    var resultado = hasher.VerifyHashedPassword(null!, hash, password);
    if (resultado == PasswordVerificationResult.Failed) fallidos.Add(etiqueta);
    else verificados++;
}

Console.WriteLine($"verificados: {verificados}   fallidos: {fallidos.Count}");
foreach (var etiqueta in fallidos) Console.WriteLine($"  FALLA: {etiqueta}");

return fallidos.Count == 0 ? 0 : 1;
