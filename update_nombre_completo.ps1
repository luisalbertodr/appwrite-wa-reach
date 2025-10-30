# ==============================================================================
# SCRIPT PARA POBLAR EL CAMPO nombre_completo EN TODOS LOS CLIENTES
# ==============================================================================

$DATABASE_ID = "68d78cb20028fac621d4"
$COLLECTION_ID = "clients"

Write-Host "Obteniendo todos los clientes..."

# Obtener todos los documentos de la colección clients (sin queries inicialmente)
$clientsJson = appwrite databases list-documents `
    --database-id $DATABASE_ID `
    --collection-id $COLLECTION_ID

if (-not $clientsJson) {
    Write-Host "❌ Error al obtener los clientes"
    exit 1
}

$response = $clientsJson | ConvertFrom-Json
$clients = $response.documents
$total = $response.total

Write-Host "Total de clientes encontrados: $total"

$count = 0
$errors = 0

foreach ($client in $clients) {
    $count++
    $docId = $client.'$id'
    $nomcli = $client.nomcli
    $ape1cli = $client.ape1cli
    
    # Concatenar nombre y apellido
    $nombreCompleto = "$nomcli $ape1cli".Trim()
    
    Write-Host "[$count/$total] Actualizando cliente $docId : $nombreCompleto"
    
    try {
        # Actualizar el documento con el nuevo valor
        appwrite databases update-document `
            --database-id $DATABASE_ID `
            --collection-id $COLLECTION_ID `
            --document-id $docId `
            --data "{`"nombre_completo`": `"$nombreCompleto`"}" | Out-Null
    }
    catch {
        Write-Host "  ❌ Error actualizando cliente $docId"
        $errors++
    }
}

Write-Host ""
Write-Host "✅ Proceso completado: $count clientes procesados, $errors errores"
