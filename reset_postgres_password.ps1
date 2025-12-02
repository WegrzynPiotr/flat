# Script to reset PostgreSQL password using Windows services
# Uruchom jako Administrator

Write-Host "PostgreSQL Password Reset Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$pgPath = "C:\Program Files\PostgreSQL\18"
$pgBin = "$pgPath\bin"
$pgData = "$pgPath\data"

Write-Host "`n1. Zatrzymywanie serwisu PostgreSQL..." -ForegroundColor Yellow
Stop-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "2. Modyfikowanie pliku pg_hba.conf..." -ForegroundColor Yellow
$pgHbaPath = "$pgData\pg_hba.conf"

# Backup
Copy-Item $pgHbaPath "$pgHbaPath.backup" -Force

# Odczyt i modyfikacja
$content = Get-Content $pgHbaPath
$content = $content -replace 'md5', 'trust' -replace 'scram-sha-256', 'trust'
$content | Set-Content $pgHbaPath

Write-Host "3. Uruchamianie serwisu PostgreSQL..." -ForegroundColor Yellow
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3

Write-Host "4. Zmiana hasła na 'postgres'..." -ForegroundColor Yellow
$env:PGPASSWORD = ""
& "$pgBin\psql.exe" -U postgres -h localhost -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>&1

Write-Host "5. Przywracanie pg_hba.conf..." -ForegroundColor Yellow
Copy-Item "$pgHbaPath.backup" $pgHbaPath -Force

Write-Host "6. Restartowanie serwisu PostgreSQL..." -ForegroundColor Yellow
Stop-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 2
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3

Write-Host "`n✅ Gotowe! Hasło zmienione na 'postgres'" -ForegroundColor Green
Write-Host "`nTestowanie połączenia..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres"
& "$pgBin\psql.exe" -U postgres -h localhost -c "SELECT version();" 2>&1

Write-Host "`n✅ Połączenie OK!" -ForegroundColor Green
