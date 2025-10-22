# Guía para Configurar Permisos del Bucket "lipoout"

## Problema
La aplicación muestra error "Usuario no autorizado" (401 Unauthorized) al intentar subir archivos CSV porque el bucket "lipoout" no tiene los permisos configurados correctamente.

## Solución

### Opción 1: Configurar Permisos Manualmente en la Consola

1. **Accede a la Consola de Appwrite**: https://appwrite.lipoout.com

2. **Navega al Storage**:
   - Haz clic en "Storage" en el menú lateral
   - Selecciona el bucket **"lipoout"**

3. **Configura los Permisos**:
   - Ve a la pestaña "Settings" o "Permissions"
   - Agrega los siguientes permisos:
     - **Create**: `create("users")`
     - **Read**: `read("users")`
     - **Update**: `update("users")` (opcional)
     - **Delete**: `delete("users")` (opcional)

4. **Guarda los cambios**

### Opción 2: Agregar Configuración de Buckets al appwrite.config.json

Actualmente, tu `appwrite.config.json` **NO incluye la configuración de buckets ni de funciones**. Solo tiene:
- Configuración del proyecto
- Base de datos
- Colecciones

Para gestionar los buckets con Appwrite CLI, necesitas agregar la configuración de buckets al archivo.

## Funciones de Appwrite

Tienes 3 funciones en la carpeta `functions/`:
1. **ImportCsvFunction** - Procesa archivos CSV importados
2. **sendWhatsAppFunction** - Envía mensajes de WhatsApp
3. **getWahaSessionsFunction** - Obtiene sesiones de WAHA

⚠️ **IMPORTANTE**: Estas funciones existen localmente pero **NO están configuradas en appwrite.config.json**, por lo que no se desplegarán automáticamente al servidor.

### Para Desplegar las Funciones

Necesitarías agregar una sección "functions" al `appwrite.config.json` con la configuración de cada función, o desplegarlas manualmente desde la Consola de Appwrite.

## Próximos Pasos

1. **Inmediato**: Configura los permisos del bucket "lipoout" manualmente en la consola (Opción 1)
2. **Opcional**: Agrega la configuración de buckets y funciones al `appwrite.config.json` para gestión completa vía CLI
