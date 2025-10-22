# Script para verificar y crear el índice necesario en la colección citas
# Ejecuta este script para solucionar el error 400 Bad Request

Write-Host "=== Verificación de índice en colección 'citas' ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "El error 400 Bad Request ocurre porque el atributo 'fecha_hora_inicio'" -ForegroundColor Yellow
Write-Host "necesita estar indexado para poder usar Query.orderAsc()." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para solucionarlo, debes crear un índice en Appwrite Console:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Ve a: https://appwrite.lipoout.com/console/project-68a8bb45000adadfb279/databases/database-68b1d7530028045d94d3/collection-citas/settings" -ForegroundColor White
Write-Host ""
Write-Host "2. En la sección 'Indexes', haz clic en 'Create Index'" -ForegroundColor White
Write-Host ""
Write-Host "3. Configura el índice así:" -ForegroundColor White
Write-Host "   - Key: fecha_hora_inicio_idx" -ForegroundColor Cyan
Write-Host "   - Type: Key" -ForegroundColor Cyan
Write-Host "   - Attributes: fecha_hora_inicio" -ForegroundColor Cyan
Write-Host "   - Orders: ASC" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Haz clic en 'Create'" -ForegroundColor White
Write-Host ""
Write-Host "Una vez creado el índice, recarga tu aplicación y el error debería desaparecer." -ForegroundColor Green
Write-Host ""
Write-Host "Presiona cualquier tecla para abrir Appwrite Console..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Abrir la consola de Appwrite en el navegador
Start-Process "https://appwrite.lipoout.com/console/project-68a8bb45000adadfb279/databases/database-68b1d7530028045d94d3/collection-citas/settings"
