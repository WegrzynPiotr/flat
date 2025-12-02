# Skrypt do testowania migracji bazy danych PostgreSQL
# Uruchom z: .\test_migration.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PostgreSQL Migration Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$projectPath = ".\zarzadzanieMieszkaniami"
$dbName = "mieszkania_db"
$postgresUser = "postgres"

# Sprawdzenie czy PostgreSQL jest dostępny
Write-Host "`n🔍 Sprawdzanie dostępności PostgreSQL..." -ForegroundColor Yellow
try {
    $null = psql -U $postgresUser -c "SELECT 1" 2>$null
    Write-Host "✅ PostgreSQL jest dostępny" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL nie jest dostępny!" -ForegroundColor Red
    Write-Host "   Zainstaluj PostgreSQL i upewnij się, że serwer jest uruchomiony." -ForegroundColor Red
    exit 1
}

# Przywracanie pakietów
Write-Host "`n📦 Przywracanie pakietów NuGet..." -ForegroundColor Yellow
Push-Location $projectPath
dotnet restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Błąd przy przywracaniu pakietów" -ForegroundColor Red
    exit 1
}

# Tworzenie bazy danych poprzez Entity Framework
Write-Host "`n🗄️  Tworzenie bazy danych poprzez EF Core..." -ForegroundColor Yellow
dotnet ef database update
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Błąd przy migracji bazy danych" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Baza danych została pomyślnie utworzona!" -ForegroundColor Green

# Weryfikacja tabel
Write-Host "`n📊 Weryfikacja tabel w bazie..." -ForegroundColor Yellow
$tables = psql -U $postgresUser -d $dbName -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" -t
Write-Host "Tabele w bazie: " -ForegroundColor Cyan
foreach ($table in $tables) {
    if ($table.Trim()) {
        Write-Host "  ✓ $($table.Trim())" -ForegroundColor Green
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ✅ Migracja zakończona sukcesem!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nAby uruchomić aplikację, wykonaj:" -ForegroundColor Yellow
Write-Host "  dotnet run" -ForegroundColor Cyan

Pop-Location
