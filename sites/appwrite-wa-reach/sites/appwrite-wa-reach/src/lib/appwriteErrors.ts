import { AppwriteException } from 'appwrite';

// Define a mapping from Appwrite error types to user-friendly messages
const appwriteErrorMessages: { [key: string]: string } = {
  // Platform errors
  'general_argument_invalid': 'Uno o más argumentos de la solicitud son inválidos. Por favor, revisa los datos e inténtalo de nuevo.',
  'general_rate_limit_exceeded': 'Has excedido el límite de solicitudes. Por favor, espera un momento antes de intentarlo de nuevo.',
  'general_unknown': 'Ha ocurrido un error desconocido. Por favor, inténtalo de nuevo más tarde.',
  'general_server_error': 'Ha ocurrido un error interno del servidor. Por favor, inténtalo de nuevo más tarde.',
  'general_service_disabled': 'El servicio solicitado está deshabilitado. Por favor, contacta al administrador.',
  'project_unknown': 'El ID del proyecto es inválido o falta. Por favor, verifica la configuración.',
  'project_not_found': 'El proyecto no fue encontrado. Por favor, verifica la configuración.',

  // Authentication errors
  'user_invalid_credentials': 'El email o la contraseña son incorrectos. Por favor, inténtalo de nuevo.',
  'user_blocked': 'Tu cuenta ha sido suspendida temporalmente. Por favor, contacta a soporte.',
  'user_invalid_token': 'Token inválido. Por favor, inicia sesión de nuevo.',
  'user_not_found': 'El usuario no fue encontrado.',
  'user_session_not_found': 'La sesión de usuario no fue encontrada. Por favor, inicia sesión de nuevo.',
  'user_already_exists': 'Ya existe un usuario con este email o número de teléfono.',
  'user_email_already_exists': 'Ya existe un usuario con este email.',
  'user_phone_already_exists': 'Ya existe un usuario con este número de teléfono.',
  'user_password_mismatch': 'Las contraseñas no coinciden. Por favor, verifica y vuelve a intentarlo.',
  'user_unauthorized': 'No estás autorizado para realizar esta acción.',

  // Databases errors
  'database_not_found': 'La base de datos no fue encontrada. Por favor, verifica la configuración.',
  'table_not_found': 'La tabla no fue encontrada. Por favor, verifica la configuración.',
  'row_not_found': 'El registro no fue encontrado.',
  'row_invalid_structure': 'La estructura del registro es inválida. Por favor, verifica los datos.',
  'row_already_exists': 'Ya existe un registro con el ID solicitado.',
  'column_not_found': 'La columna no fue encontrada.',
  'column_value_invalid': 'El valor de la columna es inválido. Por favor, verifica los datos.',

  // Storage errors
  'storage_file_not_found': 'El archivo no fue encontrado.',
  'storage_bucket_not_found': 'El bucket de almacenamiento no fue encontrado.',
  'storage_invalid_file_size': 'El tamaño del archivo es inválido o excede el límite permitido.',
  'storage_file_type_unsupported': 'El tipo de archivo no es compatible.',

  // Functions errors
  'function_not_found': 'La función no fue encontrada.',
  'build_not_ready': 'La compilación de la función no está lista para su ejecución.',

  // Default message for unhandled errors
  'default': 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.'
};

export function getAppwriteErrorMessage(error: unknown): string {
  if (error instanceof AppwriteException) {
    console.error('Appwrite Error:', error.type, error.message, error.code);
    return appwriteErrorMessages[error.type] || appwriteErrorMessages['default'];
  } else if (error instanceof Error) {
    console.error('General Error:', error.message);
    return appwriteErrorMessages['default'];
  } else {
    console.error('Unknown Error:', error);
    return appwriteErrorMessages['default'];
  }
}

// Function to check if an error is transient and should be retried
export function isTransientError(error: unknown): boolean {
  if (error instanceof AppwriteException) {
    // Rate limit (429) and Service Unavailable (503) are common transient errors
    return error.code === 429 || error.code === 503;
  }
  return false;
}
