# ==============================================================================
# SCRIPT PARA AÑADIR LA COLECCIÓN DE SEGUIMIENTO DE CAMPAÑAS
# ==============================================================================

# --- Configuración Global ---
$DATABASE_ID = "68d78cb20028fac621d4"
$COLLECTION_ID = "campaign_progress"
$COLLECTION_NAME = "Campaign Progress"

# Permisos
$PERMISSIONS_ARGS = @(
    "read(""users"")",
    "update(""users"")",
    "delete(""users"")"
)

# ---
# 1. CREAR LA NUEVA COLECCIÓN 'campaign_progress'
# ---
Write-Host "1. Creando la colección '$COLLECTION_NAME'..."

appwrite databases create-collection `
    --database-id "$DATABASE_ID" `
    --collection-id "$COLLECTION_ID" `
    --name "$COLLECTION_NAME" `
    @$PERMISSIONS_ARGS

# ---
# 2. CREACIÓN DE ATRIBUTOS
# ---
Write-Host "2. Creando atributos para el seguimiento..."

# Atributo para el nombre del cliente actual
appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id $COLLECTION_ID `
    --key "currentClientName" `
    --size 255 `
    --required false

# Atributo para el teléfono del cliente actual
appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id $COLLECTION_ID `
    --key "currentClientPhone" `
    --size 255 `
    --required false

Write-Host "✅ ¡Actualización de Appwrite completada! La colección '$COLLECTION_NAME' ha sido creada."