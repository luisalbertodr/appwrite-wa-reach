# 🚀 Guía de Migración - Sistema Marketing WhatsApp a Lipoout

## ✅ Pasos Completados

- [x] Actualizado `.env` con ID de proyecto Lipoout (68a8bb45000adadfb279)
- [x] Actualizado `DATABASE_ID` en `src/lib/appwrite.ts` (68b1d7530028045d94d3)

## 📋 Pasos Pendientes en Consola de Appwrite

### PASO 1: Crear Colecciones de Marketing en Proyecto Lipoout

Accede a la consola de Appwrite: https://appwrite.lipoout.com/console

#### 1.1 Colección: `config` (Configuración WAHA)
```
Nombre: config
ID de Colección: config

Atributos:
- sessionName (string, 255, required)
- sessionStatus (string, 50, default: "STOPPED")
- lastUpdate (datetime)

Índices:
- sessionName (key, ASC)

Permisos:
- Read: any
- Create: users
- Update: users
- Delete: users
```

#### 1.2 Colección: `templates` (Plantillas de Mensajes)
```
Nombre: templates
ID de Colección: templates

Atributos:
- nombre (string, 255, required)
- contenido (string, 10000, required)
- variables (string, 1000) - JSON array de variables
- activo (boolean, default: true)
- fechaCreacion (datetime)

Índices:
- nombre (fulltext)
- activo (key, ASC)

Permisos:
- Read: any
- Create: users
- Update: users
- Delete: users
```

#### 1.3 Colección: `campaigns` (Campañas)
```
Nombre: campaigns
ID de Colección: campaigns

Atributos:
- nombre (string, 255, required)
- estado (string, 50, default: "borrador") - valores: borrador, en_progreso, completada, pausada
- fechaCreacion (datetime)
- fechaInicio (datetime)
- fechaFin (datetime)
- template_id (string, 255, required)
- filtros (string, 5000) - JSON con filtros de clientes
- totalClientes (integer, default: 0)
- clientesEnviados (integer, default: 0)
- clientesFallidos (integer, default: 0)

Índices:
- nombre (fulltext)
- estado (key, ASC)
- fechaCreacion (key, DESC)

Permisos:
- Read: any
- Create: users
- Update: users
- Delete: users
```

#### 1.4 Colección: `campaign_progress` (Progreso de Campañas)
```
Nombre: campaign_progress
ID de Colección: campaign_progress

Atributos:
- campaign_id (string, 255, required)
- cliente_id (string, 255, required)
- estado (string, 50, default: "pendiente") - valores: pendiente, enviado, fallido
- fechaIntento (datetime)
- error (string, 1000)
- numeroTelefono (string, 20)

Índices:
- campaign_id (key, ASC)
- cliente_id (key, ASC)
- estado (key, ASC)

Permisos:
- Read: any
- Create: users
- Update: users
- Delete: users
```

#### 1.5 Colección: `message_logs` (Registro de Mensajes)
```
Nombre: message_logs
ID de Colección: message_logs

Atributos:
- campaign_id (string, 255, required)
- cliente_id (string, 255, required)
- numeroTelefono (string, 20, required)
- mensaje (string, 10000, required)
- estado (string, 50, required) - valores: enviado, fallido, pendiente
- fechaEnvio (datetime)
- respuesta (string, 5000) - Respuesta de API WAHA
- error (string, 1000)

Índices:
- campaign_id (key, ASC)
- cliente_id (key, ASC)
- estado (key, ASC)
- fechaEnvio (key, DESC)

Permisos:
- Read: any
- Create: users
- Update: users
- Delete: users
```

#### 1.6 Colección: `import_logs` (Registro de Importaciones)
```
Nombre: import_logs
ID de Colección: import_logs

Atributos:
- fileName (string, 255, required)
- fechaImportacion (datetime)
- totalRegistros (integer, default: 0)
- registrosExitosos (integer, default: 0)
- registrosFallidos (integer, default: 0)
- errores (string, 10000) - JSON array de errores
- usuario (string, 255)

Índices:
- fechaImportacion (key, DESC)

Permisos:
- Read: any
- Create: users
- Update: users
- Delete: users
```

### PASO 2: Verificar Bucket de Importación

**IMPORTANTE:** Verifica si el bucket de importación existe en el proyecto Lipoout:

```
ID del Bucket: 68d7cd3a0019edb5703b
Nombre: import-csv
```

Si NO existe:
1. Ve a Storage en la consola
2. Crea un nuevo bucket con ID: `68d7cd3a0019edb5703b`
3. Configura permisos:
   - Read: users
   - Create: users
   - Update: users
   - Delete: users
4. Tamaño máximo de archivo: 10MB
5. Extensiones permitidas: csv

### PASO 3: Desplegar Funciones de Appwrite

#### 3.1 Función: `sendWhatsAppFunction`

**En la consola de Appwrite:**
1. Ve a Functions → Create Function
2. Configuración:
   - Name: `sendWhatsAppFunction`
   - Runtime: `Node.js 18.0`
   - Entrypoint: `src/main.js`
   - Execute Access: `Any`

3. Variables de Entorno:
   ```
   APPWRITE_FUNCTION_PROJECT_ID=68a8bb45000adadfb279
   APPWRITE_API_KEY=[Crear nueva API Key con permisos de Database]
   DATABASE_ID=68b1d7530028045d94d3
   WAHA_API_KEY=sha512:dbc39775f54496ac5b2f3b70e79898e2001b245d14c000e0838591bc3ebba8eabc63ab29854d7c035459eb6136b4c40e2417c5741a590a2389f98dc7070aa0b8
   WAHA_ENDPOINT=[URL de tu servidor WAHA, ej: https://waha.tudominio.com]
   ```

4. Deploy:
   - Sube el código desde `functions/sendWhatsAppFunction/`
   - O conecta con Git (recomendado)

#### 3.2 Función: `ImportCsvFunction`

**En la consola de Appwrite:**
1. Ve a Functions → Create Function
2. Configuración:
   - Name: `ImportCsvFunction`
   - Runtime: `Node.js 18.0`
   - Entrypoint: `src/main.js`
   - Execute Access: `Any`

3. Variables de Entorno:
   ```
   APPWRITE_FUNCTION_PROJECT_ID=68a8bb45000adadfb279
   APPWRITE_API_KEY=[Misma API Key que sendWhatsAppFunction]
   DATABASE_ID=68b1d7530028045d94d3
   ```

4. Deploy:
   - Sube el código desde `functions/ImportCsvFunction/`

#### 3.3 Función: `getWahaSessionsFunction`

**En la consola de Appwrite:**
1. Ve a Functions → Create Function
2. Configuración:
   - Name: `getWahaSessionsFunction`
   - Runtime: `Node.js 18.0`
   - Entrypoint: `src/main.js`
   - Execute Access: `Any`

3. Variables de Entorno:
   ```
   WAHA_API_KEY=sha512:dbc39775f54496ac5b2f3b70e79898e2001b245d14c000e0838591bc3ebba8eabc63ab29854d7c035459eb6136b4c40e2417c5741a590a2389f98dc7070aa0b8
   WAHA_ENDPOINT=[URL de tu servidor WAHA]
   ```

4. Deploy:
   - Sube el código desde `functions/getWahaSessionsFunction/`

### PASO 4: Crear API Key para las Funciones

**IMPORTANTE:** Necesitas crear una API Key con permisos adecuados:

1. En la consola de Appwrite: Settings → API Keys
2. Create API Key:
   - Name: `Functions Marketing Key`
   - Expiration: Never (o según tu política)
   - Scopes necesarios:
     - ✅ `databases.read`
     - ✅ `databases.write`
     - ✅ `collections.read`
     - ✅ `collections.write`
     - ✅ `documents.read`
     - ✅ `documents.write`
     - ✅ `files.read` (para ImportCsvFunction)
3. Copia la API Key generada
4. Úsala en las variables de entorno de las funciones

### PASO 5: Verificar Colección `clientes`

La colección `clientes` ya debe existir en Lipoout. Verifica que tenga estos atributos necesarios para marketing:

**Atributos requeridos para marketing:**
- ✅ `codcli` (string) - Código único del cliente
- ✅ `nombre_completo` (string) - Nombre para personalización
- ✅ `tel2cli` (string) - Número de teléfono para WhatsApp
- ✅ `enviar` (boolean) - Flag para permitir envío de marketing
- ✅ `email` (string) - Para notificaciones
- ✅ `edad` (integer) - Para segmentación
- ✅ `facturacion` (float) - Para segmentación por valor
- ✅ `intereses` (string) - Para segmentación por intereses

Si algún atributo falta, añádelo desde la consola.

## 🧪 PASO 6: Testing

Una vez completados todos los pasos anteriores:

### 6.1 Test de Conexión
```bash
npm run dev
```

1. Abre la aplicación en el navegador
2. Inicia sesión
3. Ve a la página de Marketing

### 6.2 Test de Funcionalidades

**✅ Checklist de Testing:**
- [ ] La página Marketing carga sin errores
- [ ] Se muestra la lista de clientes
- [ ] Se pueden crear/editar plantillas
- [ ] Se pueden crear campañas
- [ ] La función getWahaSessionsFunction devuelve sesiones
- [ ] Se puede importar CSV de clientes
- [ ] Se puede enviar mensaje de prueba a un cliente
- [ ] Los logs se registran correctamente en message_logs

### 6.3 Test de Importación CSV

1. Prepara un archivo CSV con formato:
   ```
   codcli,nomcli,ape1cli,tel2cli,email,enviar
   TEST001,Juan,Pérez,34600123456,juan@test.com,true
   ```
2. Importa desde la página Marketing
3. Verifica que el cliente se creó/actualizó
4. Verifica que se registró en import_logs

### 6.4 Test de Envío de Campaña

**⚠️ PRECAUCIÓN:** Usa números de prueba primero

1. Crea una plantilla simple: "Hola {nombre}, esto es una prueba"
2. Crea una campaña con filtro muy específico (1 cliente de prueba)
3. Verifica en WAHA que la sesión esté activa
4. Ejecuta la campaña
5. Verifica:
   - Estado de campaña cambia a "en_progreso"
   - Se crea registro en campaign_progress
   - Se crea registro en message_logs
   - El mensaje llega al WhatsApp de prueba

## 📝 Notas Importantes

### Migración de Datos Existentes (Opcional)

Si tienes datos en el proyecto Waha que quieres migrar:

1. **Exportar desde Waha:**
   - Exporta colecciones: templates, campaigns, message_logs
   - Usa la API de Appwrite o el CLI

2. **Importar a Lipoout:**
   - Importa a las nuevas colecciones
   - Ajusta referencias de cliente_id si es necesario

### Backup

Antes de hacer cambios importantes:
```bash
# Backup de configuración
cp .env .env.backup
cp src/lib/appwrite.ts src/lib/appwrite.ts.backup
```

### Rollback

Si necesitas volver atrás:
```bash
# Restaurar configuración anterior (Waha)
# .env: VITE_APPWRITE_PROJECT_ID="68d6d4060020e39899f6"
# appwrite.ts: DATABASE_ID = '68d78cb20028fac621d4'
```

## 🎯 Siguiente Paso

Una vez completados TODOS los pasos anteriores, la aplicación debería estar completamente funcional con el sistema de marketing integrado en Lipoout.

**Para continuar:**
1. Completa la creación de colecciones (Paso 1)
2. Despliega las funciones (Paso 3)
3. Ejecuta los tests (Paso 6)
4. Reporta cualquier error encontrado
