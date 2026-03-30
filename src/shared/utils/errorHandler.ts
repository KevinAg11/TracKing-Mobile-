/**
 * Maps HTTP status codes to user-facing Spanish messages.
 * serverMessage comes from the backend error body.
 *
 * Backend error shape: { success: false, statusCode, error }
 * NestJS validation errors: { message: string[] | string, error: string, statusCode: 400 }
 */
export function handleApiError(status: number, serverMessage?: string): string {
  switch (status) {
    case 400:
      return serverMessage ?? 'Solicitud invalida. Verifica los datos ingresados.';
    case 401:
      return 'Sesion expirada. Por favor inicia sesion nuevamente.';
    case 403:
      return 'Acceso denegado.';
    case 404:
      return 'Recurso no encontrado.';
    case 409:
      return serverMessage ?? 'Conflicto: el recurso ya existe.';
    case 422:
      return serverMessage ?? 'Operacion no permitida por reglas de negocio.';
    case 429:
      return 'Demasiadas solicitudes. Por favor espera antes de intentar de nuevo.';
    case 500:
      return 'Error del servidor. Por favor intenta mas tarde.';
    case 0:
      return 'Sin conexion al servidor. Verifica tu red.';
    default:
      return serverMessage ?? 'Ocurrio un error inesperado.';
  }
}
