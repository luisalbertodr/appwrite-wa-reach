# Script para agregar el atributo clientName a la coleccion message_logs
# Ejecutar este script con PowerShell

# Cargar variables de entorno desde .env
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$DATABASE_ID = $env:APPWRITE_DATABASE_ID
$MESSAGE_LOGS_COLLECTION_ID = "message_logs"

Write-Host "======================================"
Write-Host "Actualizando esquema de message_logs"
Write-Host "======================================"
Write-Host ""

if (-not $DATABASE_ID) {
    Write-Host "ERROR: APPWRITE_DATABASE_ID no esta configurado en .env" -ForegroundColor Red
    exit 1
}

Write-Host "Database ID: $DATABASE_ID" -ForegroundColor Cyan
Write-Host "Collection ID: $MESSAGE_LOGS_COLLECTION_ID" -ForegroundColor Cyan
Write-Host ""

Write-Host "Agregando atributo 'clientName' a la coleccion message_logs..." -ForegroundColor Yellow

appwrite databases create-string-attribute `
    --database-id $DATABASE_ID `
    --collection-id $MESSAGE_LOGS_COLLECTION_ID `
    --key "clientName" `
    --size 512 `
    --required false

if ($LASTEXITCODE -eq 0) {
    Write-Host "Atributo 'clientName' creado exitosamente" -ForegroundColor Green
} else {
    Write-Host "ERROR al crear el atributo 'clientName'" -ForegroundColor Red
    Write-Host "Es posible que el atributo ya exista." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================"
Write-Host "Actualizacion completada"
Write-Host "======================================"
