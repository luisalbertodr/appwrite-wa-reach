# Instrucciones para Restaurar Colecciones de Appwrite

## Estado Actual del Problema

Después de múltiples intentos fallidos con `appwrite push --all`, el servidor de Appwrite quedó en el siguiente estado:

- **clientes**: 20 atributos presentes pero **faltan 3 índices**
- **11 colecciones vacías**: empleados, articulos, citas, facturas, familias, configuracion, config, templates, campaigns, campaign_progress, message_logs

## Solución: Script de Restauración con API de Appwrite

He creado un script Node.js (`restore-collections.js`) que usa el SDK de Appwrite directamente para restaurar las colecciones sin depender del CLI problemático.

## Pasos para Ejecutar la Restauración

### 1. Crear una API Key en Appwrite

Debes crear una API Key con permisos para modificar la base de datos:

1. Accede a tu consola de Appwrite: https://appwrite.lipoout.com/console
2. Ve a tu proyecto "Lipoout" (ID: 68a8bb45000adadfb279)
3. En el menú lateral, selecciona **"Overview"** → **"Integrations"** → **"API Keys"**
4. Haz clic en **"Create API Key"**
5. Configura la API Key:
   - **Name**: "Restauración de Colecciones"
   - **Expiration**: 1 día (puedes eliminarla después)
   - **Scopes**: Selecciona los siguientes permisos:
     - ✅ `databases.read`
     - ✅ `databases.write`
     - ✅ `collections.read`
     - ✅ `collections.write`
     - ✅ `attributes.read`
     - ✅ `attributes.write`
     - ✅ `indexes.read`
     - ✅ `indexes.write`
6. Haz clic en **"Create"**
7. **IMPORTANTE**: Copia la API Key que se muestra (solo se muestra una vez)

### 2. Agregar la API Key al archivo .env

Edita el archivo `.env` y agrega la nueva variable:

```bash
APPWRITE_API_KEY="tu_api_key_aquí"
```

Tu archivo `.env` debería quedar así:

```bash
VITE_APPWRITE_PROJECT_ID="68a8bb45000adadfb279"
VITE_APPWRITE_PUBLIC_ENDPOINT="https://appwrite.lipoout.com/v1"
VITE_WAHA_API_KEY="sha512:dbc39775f54496ac5b2f3b70e79898e2001b245d14c000e0838591bc3ebba8eabc63ab29854d7c035459eb6136b4c40e2417c5741a590a2389f98dc7070aa0b8"
APPWRITE_API_KEY="tu_api_key_aquí"
```

### 3. Verificar Dependencias

El SDK `node-appwrite` ya está instalado en el proyecto. Si por alguna razón necesitas reinstalarlo:

```bash
npm install
```

### 4. Ejecutar el Script de Restauración

```bash
node restore-collections.js
```

El script realizará lo siguiente:

1. **Paso 1**: Restaurará todos los atributos de las 11 colecciones vacías
   - Creará ~100+ atributos en total
   - Convertirá automáticamente los atributos `enum` a `string` (tamaño 50)
   - Esperará 2 segundos entre cada atributo para evitar saturar el servidor

2. **Paso 2**: Creará todos los índices faltantes en todas las colecciones
   - Incluye los 3 índices faltantes de `clientes`
   - Creará índices en todas las demás colecciones según la configuración

### 5. Verificar la Restauración

Después de ejecutar el script exitosamente:

1. Ve a la consola de Appwrite
2. Navega a **Databases** → **Lipoout** → **Collections**
3. Verifica que cada colección tenga sus atributos e índices

## Tiempo Estimado

El script tomará aproximadamente **15-20 minutos** en completarse debido a los tiempos de espera entre operaciones (necesarios para que Appwrite procese cada cambio correctamente).

## Atributos Enum Convertidos a String

Los siguientes atributos eran tipo `enum` pero se han convertido a `string` (tamaño 50) porque Appwrite SDK no soporta enum:

- `clientes.sexo`: H, M, Otro
- `articulos.tipo`: producto, servicio, bono
- `citas.estado`: agendada, pendiente, finalizada, cancelada
- `facturas.estado`: borrador, cobrada, anulada
- `facturas.metodoPago`: Efectivo, Tarjeta, Transferencia, Mixto
- `campaigns.estado`: borrador, en_progreso, completada, pausada
- `campaign_progress.estado`: pendiente, enviado, fallido
- `message_logs.estado`: enviado, fallido, pendiente

**Importante**: La validación de estos valores debe hacerse en tu aplicación, no en la base de datos.

## Solución de Problemas

### Error: "Invalid API Key"
- Verifica que la API Key esté correctamente copiada en el archivo `.env`
- Asegúrate de que la API Key tenga los permisos necesarios

### Error: "Attribute already exists"
- Algunos atributos pueden ya existir
- El script mostrará el error pero continuará con los siguientes

### Error: "Rate limit exceeded"
- Appwrite tiene límites de velocidad
- El script ya incluye delays de 2 segundos entre operaciones
- Si ocurre, espera unos minutos y vuelve a ejecutar

### El script se detiene en medio
- Puedes volver a ejecutarlo
- Appwrite ignorará los atributos/índices que ya existan
- El script continuará desde donde falló

## Después de la Restauración

1. **Eliminar la API Key**: Por seguridad, elimina la API Key de Appwrite una vez completada la restauración
2. **Verificar datos**: Si tenías datos en la colección `clientes`, verifica que sigan presentes
3. **Actualizar appwrite.config.json**: Ejecuta `appwrite pull collections` para actualizar el archivo local con el estado actual del servidor
4. **Probar la aplicación**: Verifica que todas las funcionalidades de tu aplicación funcionen correctamente

## Archivos Importantes

- `restore-collections.js`: Script de restauración
- `appwrite.config.json.enum-backup`: Backup con la configuración completa original
- `appwrite.config.json`: Estado actual del servidor (se actualizará después de la restauración)
- `.env`: Contiene las variables de entorno incluyendo la API Key

## Contacto

Si encuentras algún problema durante la restauración, revisa los logs del script que proporcionan información detallada sobre cada operación.
