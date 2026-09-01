using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using HealthArchive.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace HealthArchive.Infrastructure.Services
{
    /// <summary>
    /// IFileStorage sobre la API S3 de Cloudflare R2. Singleton: AmazonS3Client es
    /// thread-safe y reutiliza conexiones.
    /// </summary>
    public class R2FileStorage : IFileStorage, IDisposable
    {
        private readonly AmazonS3Client _client;
        private readonly string _bucket;

        public R2FileStorage(IConfiguration config)
        {
            _bucket = config["Storage:Bucket"]
                ?? throw new InvalidOperationException("Storage:Bucket no está configurado.");

            var credentials = new BasicAWSCredentials(
                config["Storage:AccessKey"], config["Storage:SecretKey"]);

            _client = new AmazonS3Client(credentials, new AmazonS3Config
            {
                ServiceURL = config["Storage:ServiceUrl"],
                // R2 no resuelve buckets por subdominio como AWS.
                ForcePathStyle = true,
                // El SDK nuevo manda checksums CRC32 por defecto y R2 los rechaza.
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            });
        }

        public async Task PutAsync(string key, Stream content, string contentType, long length)
        {
            var request = new PutObjectRequest
            {
                BucketName = _bucket,
                Key = key,
                InputStream = content,
                ContentType = contentType,
                AutoCloseStream = false,
                // Sin esto el SDK bufferea el stream entero para poder reintentar.
                UseChunkEncoding = false,
            };
            request.Headers.ContentLength = length;

            await _client.PutObjectAsync(request);
        }

        public async Task<Stream> GetAsync(string key)
        {
            var response = await _client.GetObjectAsync(_bucket, key);
            // El caller (FileStreamResult) dispone el stream, y este dispone la response.
            return response.ResponseStream;
        }

        public Task DeleteAsync(string key) => _client.DeleteObjectAsync(_bucket, key);

        public void Dispose() => _client.Dispose();
    }
}
