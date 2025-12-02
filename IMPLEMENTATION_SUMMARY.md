# 📝 PODSUMOWANIE ZMIAN - Migracja do PostgreSQL

## 🎯 Co zostało wykonane?

Twoja aplikacja została zmieniona z **In-Memory Database** na **PostgreSQL**. Oto wszystkie zmiany:

---

## 📦 PAKIETY DODANE

### zarzadzanieMieszkaniami.csproj
```xml
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="7.0.10" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="7.0.10" />
```

### backend/Infrastructure/Infrastructure.csproj
```xml
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="7.0.10" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="7.0.10" />
```

---

## 🔧 PLIKI ZMIENIONE

### 1. `Program.cs`
**Przed:**
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));
```

**Po:**
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")));
```

**Dodany import:**
```csharp
using Npgsql.EntityFrameworkCore.PostgreSQL;
```

---

### 2. `appsettings.json`
**Dodano:**
```json
"ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;Database=mieszkania_db;Username=postgres;Password=postgres"
}
```

---

### 3. `appsettings.Development.json`
**Dodano:**
```json
"ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;Database=mieszkania_db;Username=postgres;Password=postgres"
}
```

---

### 4. `backend/Infrastructure/AppDbContext.cs`
- Dodano importy PostgreSQL
- Dodano konwencje naming (snake_case dla kolumn)
- Importy: `Infrastructure.Extensions`

---

### 5. `backend/Infrastructure/Extensions/StringExtensions.cs`
**Nowy plik** - Rozszerzenia dla konwersji naming conventions:
- `ToSnakeCase()` - PascalCase → snake_case
- `ToPascalCase()` - snake_case → PascalCase

---

## 📊 PLIKI UTWORZONE

### 1. `database_init.sql` ✅
SQL script do ręcznego tworzenia bazy:
```sql
CREATE DATABASE mieszkania_db;
CREATE TABLE users (...);
CREATE TABLE properties (...);
CREATE TABLE issues (...);
CREATE TABLE refresh_tokens (...);
```

### 2. `database_sample_data.sql` ✅
Przykładowe dane do testowania (3 użytkowników, 2 nieruchomości, 2 issues)

### 3. `backend/Infrastructure/Migrations/20240102000000_InitialCreate.cs` ✅
Entity Framework Core migacja dla PostgreSQL:
- Tworzy wszystkie 4 tabele
- Definiuje relacje (FK constraints)
- Ustawia indeksy

### 4. `backend/Infrastructure/Migrations/AppDbContextModelSnapshot.cs` ✅
Snapshot modelu bazy dla EF Core

### 5. `POSTGRESQL_SETUP.md` 📖
Instrukcja konfiguracji i instalacji PostgreSQL

### 6. `MIGRATION_NOTES.md` 📖
Checklist migracji z szczegółowymi krokami

### 7. `test_migration.ps1` 🧪
PowerShell script do automatycznego testowania migracji na Windows

### 8. `test_migration.sh` 🧪
Bash script do testowania migracji na Linux/Mac

---

## 📊 STRUKTURA TABEL W PostgreSQL

### users
```
id (UUID, PK)
email (VARCHAR 100, UNIQUE)
password_hash (TEXT)
first_name (VARCHAR 50)
last_name (VARCHAR 50)
role (VARCHAR 30)
phone_number (VARCHAR 20, nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP, nullable)
```

### properties
```
id (UUID, PK)
address (VARCHAR 200)
city (VARCHAR 100)
postal_code (VARCHAR 10, nullable)
rooms_count (INT)
area (DECIMAL 10,2)
owner_id (UUID, FK→users)
current_tenant_id (UUID, FK→users, nullable)
created_at (TIMESTAMP)
```

### issues
```
id (UUID, PK)
title (VARCHAR 200)
description (VARCHAR 2000, nullable)
category (VARCHAR 50, nullable)
priority (VARCHAR 30, nullable)
status (VARCHAR 30, nullable)
property_id (UUID, FK→properties)
reported_by_id (UUID, FK→users)
reported_at (TIMESTAMP)
resolved_at (TIMESTAMP, nullable)
photos (TEXT, nullable - CSV format)
```

### refresh_tokens
```
id (UUID, PK)
user_id (UUID, FK→users)
token (VARCHAR 500)
expires_at (TIMESTAMP)
created_at (TIMESTAMP)
is_revoked (BOOLEAN)
```

---

## 🚀 NASTĘPNE KROKI

### Krok 1: Zainstaluj PostgreSQL
- Windows: https://www.postgresql.org/download/windows/
- macOS: `brew install postgresql`
- Linux: `sudo apt install postgresql`

### Krok 2: Przywróć pakiety
```powershell
cd zarzadzanieMieszkaniami
dotnet restore
```

### Krok 3: Utwórz bazę
```powershell
dotnet ef database update
```

### Krok 4: Załaduj przykładowe dane (opcjonalnie)
```bash
psql -U postgres -d mieszkania_db -f ../database_sample_data.sql
```

### Krok 5: Uruchom aplikację
```powershell
dotnet run
```

---

## ⚠️ WAŻNE UWAGI

### Zmiana Connection String
Jeśli Twoja baza PostgreSQL ma inne hasło/host/port, zmień w:
- `appsettings.json`
- `appsettings.Development.json`

### Rollback do In-Memory
Jeśli chcesz wrócić do in-memory bazy, zmień w `Program.cs`:
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));
```

### EF Core Tools
Jeśli brakuje Ci `dotnet ef` commands:
```powershell
dotnet tool install --global dotnet-ef
```

---

## 🔒 BEZPIECZEŃSTWO

⚠️ **UWAGA:** Connection string zawiera hasło!
- Nie commituj `appsettings.Development.json` z prawdziwymi hasłami
- Użyj `appsettings.*.json` w `.gitignore`
- W produkcji użyj zmiennych środowiskowych lub secretów

---

## 📞 TROUBLESHOOTING

| Problem | Rozwiązanie |
|---------|-----------|
| "Cannot connect to PostgreSQL" | Uruchom `pg_ctl -D "C:\Program Files\PostgreSQL\13\data" start` |
| "Database doesn't exist" | Uruchom `dotnet ef database update` |
| "Column name errors" | Usuń `Migrations` folder i ponownie stwórz: `dotnet ef migrations add InitialCreate` |
| "Port already in use" | PostgreSQL domyślnie na port 5432, zmień jeśli zajęty |

---

✅ **Gotowe do działania!**
