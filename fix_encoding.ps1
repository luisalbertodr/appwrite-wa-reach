$content = Get-Content 'CitaForm_backup.tsx' -Raw -Encoding UTF8
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'src/components/forms/CitaForm.tsx'), $content, $utf8NoBom)
Write-Host 'Archivo convertido exitosamente'
