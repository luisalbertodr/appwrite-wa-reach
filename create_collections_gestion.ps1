# Script de Creacion de Colecciones de Gestion - Lipoout CRM
# Crea las colecciones: recursos, aparatos, proveedores

# Configuracion Global
$DATABASE_ID = "68b1d7530028045d94d3"
$DATABASE_NAME = "Lipoout"

# Definicion de Permisos
$PERMISSIONS_ARGS = @(
    "read('users')",
    "create('users')",
    "update('users')",
    "delete('users')"
)

# Lista de Colecciones a crear
$collections = @(
    @("recursos", "Recursos"),
    @("aparatos", "Aparatos"),
    @("proveedores", "Proveedores")
)

Write-Host "======================================================================"
Write-Host "CREANDO COLECCIONES DE GESTION EN APPWRITE"
Write-Host "Base de Datos: $DATABASE_NAME ($DATABASE_ID)"
Write-Host "======================================================================"

# CREACION DE COLECCIONES
Write-Host ""
Write-Host "1. Creando Colecciones..."

foreach ($col in $collections) {
    $colId = $col[0]
    $colName = $col[1]
    Write-Host "   -> Creando Coleccion: $colName ($colId)"

    appwrite databases create-collection `
        --database-id "$DATABASE_ID" `
        --collection-id "$colId" `
        --name "$colName" `
        @$PERMISSIONS_ARGS
}

# CREACION DE ATRIBUTOS
Write-Host ""
Write-Host "2. Configurando Atributos..."

# RECURSOS
Write-Host ""
Write-Host "   -> Configurando Atributos de RECURSOS"
appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "recursos" `
    --key "nombre" `
    --size 255 `
    --required true

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "recursos" `
    --key "tipo" `
    --size 50 `
    --required true

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "recursos" `
    --key "descripcion" `
    --size 1000 `
    --required false

appwrite databases create-boolean-attribute `
    --database-id $DATABASE_ID `
    --collection-id "recursos" `
    --key "activo" `
    --required true `
    --default true

Write-Host "   OK - Atributos de RECURSOS creados"

# APARATOS
Write-Host ""
Write-Host "   -> Configurando Atributos de APARATOS"
appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "nombre" `
    --size 255 `
    --required true

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "marca" `
    --size 255 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "modelo" `
    --size 255 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "numero_serie" `
    --size 255 `
    --required false

appwrite databases create-datetime-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "fecha_compra" `
    --required false

appwrite databases create-datetime-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "fecha_proximo_mantenimiento" `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "proveedor_id" `
    --size 255 `
    --required false

appwrite databases create-boolean-attribute `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "activo" `
    --required true `
    --default true

Write-Host "   OK - Atributos de APARATOS creados"

# PROVEEDORES
Write-Host ""
Write-Host "   -> Configurando Atributos de PROVEEDORES"
appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "nombre" `
    --size 255 `
    --required true

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "cif" `
    --size 50 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "telefono" `
    --size 50 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "email" `
    --size 255 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "direccion" `
    --size 255 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "ciudad" `
    --size 100 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "codigo_postal" `
    --size 20 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "provincia" `
    --size 100 `
    --required false

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "contacto" `
    --size 255 `
    --required false

appwrite databases create-boolean-attribute `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "activo" `
    --required true `
    --default true

Write-Host "   OK - Atributos de PROVEEDORES creados"

# INDICES
Write-Host ""
Write-Host "3. Creando Indices..."

Write-Host "   -> Indice en RECURSOS.nombre"
appwrite databases create-index `
    --database-id $DATABASE_ID `
    --collection-id "recursos" `
    --key "idx_recursos_nombre" `
    --type "key" `
    --attributes "nombre"

Write-Host "   -> Indice en APARATOS.nombre"
appwrite databases create-index `
    --database-id $DATABASE_ID `
    --collection-id "aparatos" `
    --key "idx_aparatos_nombre" `
    --type "key" `
    --attributes "nombre"

Write-Host "   -> Indice en PROVEEDORES.nombre"
appwrite databases create-index `
    --database-id $DATABASE_ID `
    --collection-id "proveedores" `
    --key "idx_proveedores_nombre" `
    --type "key" `
    --attributes "nombre"

Write-Host ""
Write-Host "======================================================================"
Write-Host "Configuracion completada exitosamente"
Write-Host "======================================================================"
Write-Host ""
Write-Host "Colecciones creadas:"
Write-Host "  - recursos (con 4 atributos)"
Write-Host "  - aparatos (con 8 atributos)"
Write-Host "  - proveedores (con 10 atributos)"
Write-Host ""
Write-Host "Puedes verificar en: https://appwrite.lipoout.com"
Write-Host "======================================================================"
