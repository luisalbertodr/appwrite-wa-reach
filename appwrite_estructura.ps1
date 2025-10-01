# ==============================================================================
# SCRIPT DE CONFIGURACION DE APPWRITE (PowerShell .ps1) - WAHA CRM
# Solucion DEFINITIVA de parsing de permisos en PowerShell.
# ==============================================================================

# Configuracion Global
$DATABASE_ID = "68d78cb20028fac621d4"
$DATABASE_NAME = "Waha"

# Definicion de Permisos
# Usamos comillas DOBLES para la cadena de permiso completa. Esto permite que
# PowerShell maneje correctamente las comillas simples que necesita Appwrite.
$PERMISSIONS_ARGS = @(
    "read('users')",
    "create('users')",
    "update('users')",
    "delete('users')"
)

# Lista de Colecciones
$collections = @(
    @("clients", "Clientes"),
    @("templates", "Plantillas"),
    @("campaigns", "Campanas"),
    @("config", "Configuracion")
)

# ---
# 1. CREACION DE LA BASE DE DATOS
# ---
Write-Host "1. Base de Datos confirmada: $DATABASE_NAME ($DATABASE_ID)"


# ---
# 2. CREACION DE COLECCIONES (CON PERMISOS CORREGIDOS)
# ---
Write-Host "2. Creando Colecciones (Estructura Inicial)..."

foreach ($col in $collections) {
    $colId = $col[0]
    $colName = $col[1]
    Write-Host "   -> Creando Coleccion: $colName ($colId)"

    # USANDO LA EXPANSION DE ARRAY (@()): La CLI de Appwrite a menudo espera los
    # permisos como argumentos POSICIONALES, no con la bandera --permissions
    # múltiples veces. Usaremos la expansión de array directamente en el comando.

    appwrite databases create-collection `
        --database-id "$DATABASE_ID" `
        --collection-id "$colId" `
        --name "$colName" `
        @$PERMISSIONS_ARGS # <--- FIX: Pasamos el array de permisos directamente al final
}

# ---
# 3. CREACION DE ATRIBUTOS
# Ahora que las colecciones deberian existir, los atributos deberian funcionar.
# ---

# CLIENTS
Write-Host "   -> Configurando Atributos de CLIENTES"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "clients" --key "nombre" --size 255 --required
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id "clients" --key "edad" --required
appwrite databases create-float-attribute --database-id $DATABASE_ID --collection-id "clients" --key "facturacion" --required
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "clients" --key "intereses" --size 255 --required --array
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "clients" --key "telefono" --size 255 --required

# Creacion de Indices para CLIENTES
Write-Host "   -> Indices de CLIENTES"
appwrite databases create-index `
    --database-id $DATABASE_ID `
    --collection-id "clients" `
    --key "phone_unique" `
    --type "unique" `
    --attributes "telefono"

# TEMPLATES
Write-Host "   -> Configurando Atributos de PLANTILLAS"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "templates" --key "name" --size 255 --required
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "templates" --key "message" --size 10000 --required


# CAMPAIGNS
Write-Host "   -> Configurando Atributos de CAMPANAS"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "name" --size 255 --required
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "templateId" --size 255 --required
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "filters" --size 10000 --required:false
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "scheduledDate" --required:false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "status" --size 50 --required
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "audienceCount" --required
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id "campaigns" --key "createdAt" --required


# CONFIG
Write-Host "   -> Configurando Atributos de CONFIGURACION"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id "config" --key "apiUrl" --size 255 --required

Write-Host "✅ Configuracion de Appwrite completada."