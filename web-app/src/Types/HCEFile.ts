// El contenido ya no viaja en el JSON: se descarga a pedido por
// GET /api/Hce/DownloadFile/{id} (ver FilesCollection).
export interface HCEFile{
    id: string;
  fileName: string;
  hceId: string;
  contentType?: string | null;
  sizeBytes?: number | null;
}