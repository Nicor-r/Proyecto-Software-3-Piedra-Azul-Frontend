import { HttpErrorResponse } from '@angular/common/http';

/**
 * Obtiene el "message" que envía el backend en un error HTTP.
 * Si la petición se hizo con responseType 'blob' (descarga de archivos),
 * el JSON del error llega empaquetado en un Blob y hay que leerlo como texto.
 */
export async function leerMensajeDeError(error: unknown, mensajePorDefecto: string): Promise<string> {
  if (!(error instanceof HttpErrorResponse)) {
    return mensajePorDefecto;
  }

  try {
    const cuerpo = error.error;
    if (cuerpo instanceof Blob) {
      const texto = await cuerpo.text();
      return JSON.parse(texto)?.message ?? mensajePorDefecto;
    }
    return cuerpo?.message ?? mensajePorDefecto;
  } catch {
    // El cuerpo no era JSON (por ejemplo, una página de error): usamos el mensaje general
    return mensajePorDefecto;
  }
}