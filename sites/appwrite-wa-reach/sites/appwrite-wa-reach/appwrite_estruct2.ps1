# ==============================================================================
# SCRIPT DE RECONSTRUCCION DE LA COLECCION CLIENTS (CORRECCION FINAL DE FLAGS)
# ==============================================================================

# Configuracion Global
$DATABASE_ID = "68d78cb20028fac621d4"
$COLLECTION_ID = "clients"

# Permisos (Usuarios autenticados tienen todos los permisos)
$PERMISSIONS_ARGS = @(
    "read('users')",
    "create('users')",
    "update('users')",
    "delete('users')"
)

# ---
# 1. ELIMINAR COLECCIÓN ANTIGUA (Para limpiar y aplicar el nuevo esquema)
# ---
Write-Host "1. Eliminando Coleccion '$COLLECTION_ID' antigua (si existe)..."
appwrite databases delete-collection --database-id "$DATABASE_ID" --collection-id "$COLLECTION_ID" --force


# ---
# 2. CREAR NUEVA COLECCIÓN 'clients'
# ---
Write-Host "2. Creando Coleccion '$COLLECTION_ID' con nueva estructura..."

appwrite databases create-collection `
    --database-id "$DATABASE_ID" `
    --collection-id "$COLLECTION_ID" `
    --name "Clientes_Import" `
    @$PERMISSIONS_ARGS


# ---
# 3. CREACIÓN DE ATRIBUTOS (Columnas) - COINCIDIENDO CON CABECERA EXCEL
# Usando la sintaxis requerida: --required true/false
# ---
Write-Host "3. Configurando Atributos para importar datos (Clientes)..."

# ID Cliente y Nombres (String)
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "idclient" --size 50 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "nomcli" --size 100 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "apecli" --size 200 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "dni" --size 20 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "email" --size 255 --required false

# Dirección y Contacto (String)
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "dircli" --size 255 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "codposcli" --size 10 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "poblacli" --size 100 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "provcli" --size 100 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "tel1cli" --size 20 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "tel2cli" --size 20 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "tarifa" --size 10 --required false

# Atributos de Fecha (DATETIME)
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "fecnac" --required false
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "fecalta" --required false

# Sexo (ENUM) - Elementos observados: M y H
# CORRECCIÓN: Usamos --elements seguido de CADA valor como argumento separado.
appwrite databases create-enum-attribute --database-id $DATABASE_ID --collection-id $COLLECTION_ID --key "sexo" --required false --elements "M" "H" "Otro" " "

Write-Host "✅ Reconstruccion de la coleccion 'clients' completada. Lista para importar."