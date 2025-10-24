# ==============================================================================
# SCRIPT PARA AÑADIR CAMPO DE BÚSQUEDA UNIFICADO A LA COLECCIÓN 'clients'
# ==============================================================================

# --- Configuración Global ---
$DATABASE_ID = "68d78cb20028fac621d4"
$COLLECTION_ID = "clients"

Write-Host "1. Añadiendo atributo 'nombre_completo' a la colección '$COLLECTION_ID'..."

# --- Atributo para el nombre completo ---
appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id $COLLECTION_ID `
    --key "nombre_completo" `
    --size 512 `
    --required false

Write-Host "2. Creando índice 'fulltext' en 'nombre_completo'..."

# --- Índice para el nuevo atributo ---
appwrite databases create-index `
    --database-id $DATABASE_ID `
    --collection-id $COLLECTION_ID `
    --key "search_nombre_completo" `
    --type "fulltext" `
    --attributes "nombre_completo"

Write-Host "✅ Esquema de la colección 'clients' actualizado correctamente."