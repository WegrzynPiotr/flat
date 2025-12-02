# 📋 Konfiguracja PostgreSQL dla Zarządzania Mieszkaniami

## 🚀 Kroki instalacji

### 1. Instalacja PostgreSQL
- Pobierz z: https://www.postgresql.org/download/
- Zainstaluj z domyślnymi parametrami (użytkownik: `postgres`, hasło: `postgres`, port: `5432`)

### 2. Tworzenie bazy danych
Opcja A - Automatycznie (via Entity Framework):
```powershell
cd c:\Users\Jawgrzyn\test\flat\zarzadzanieMieszkaniami
dotnet ef database update
```

Opcja B - Ręcznie (via psql):
```bash
psql -U postgres -f database_init.sql
```

### 3. Aktualizacja pakietów
```powershell
cd c:\Users\Jawgrzyn\test\flat\zarzadzanieMieszkaniami
dotnet restore
```

### 4. Uruchomienie aplikacji
```powershell
dotnet run
```

## 📊 Struktura tabel

### users
- `id` (UUID) - Klucz główny
- `email` (VARCHAR 100) - Unikalny
- `password_hash` (TEXT)
- `first_name` (VARCHAR 50)
- `last_name` (VARCHAR 50)
- `role` (VARCHAR 30) - np. "Właściciel", "Najemca"
- `phone_number` (VARCHAR 20)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### properties
- `id` (UUID) - Klucz główny
- `address` (VARCHAR 200)
- `city` (VARCHAR 100)
- `postal_code` (VARCHAR 10)
- `rooms_count` (INT)
- `area` (DECIMAL)
- `owner_id` (UUID) - Klucz obcy do users
- `current_tenant_id` (UUID) - Klucz obcy do users (opcjonalny)
- `created_at` (TIMESTAMP)

### issues
- `id` (UUID) - Klucz główny
- `title` (VARCHAR 200)
- `description` (VARCHAR 2000)
- `category` (VARCHAR 50) - np. "Hydraulika", "Elektryka"
- `priority` (VARCHAR 30) - np. "Wysoka", "Niska"
- `status` (VARCHAR 30) - np. "Nowe", "Rozwiązane"
- `property_id` (UUID) - Klucz obcy do properties
- `reported_by_id` (UUID) - Klucz obcy do users
- `reported_at` (TIMESTAMP)
- `resolved_at` (TIMESTAMP)
- `photos` (TEXT) - Rozdzielone przecinkami URL'e

### refresh_tokens
- `id` (UUID) - Klucz główny
- `user_id` (UUID) - Klucz obcy do users
- `token` (VARCHAR 500)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `is_revoked` (BOOLEAN)

## 🔧 Zmieniane pliki

1. **zarzadzanieMieszkaniami.csproj** - Dodano Npgsql.EntityFrameworkCore.PostgreSQL
2. **backend/Infrastructure/Infrastructure.csproj** - Dodano Npgsql
3. **Program.cs** - Zmiana z InMemory na PostgreSQL
4. **appsettings.json** - Dodano connection string
5. **appsettings.Development.json** - Connection string dla development
6. **Infrastructure/Migrations/** - Dodano migracje EF Core

## 📝 Connection String

Domyślnie:
```
Host=localhost;Port=5432;Database=mieszkania_db;Username=postgres;Password=postgres
```

Zmień hasło w `appsettings.json` jeśli PostgreSQL ma inne hasło.

## ✅ Weryfikacja

Aby sprawdzić czy wszystko działa:
```powershell
dotnet run
```

Powinna widać logs bez błędów połączenia do bazy.

## 🔄 Rollback do InMemory (jeśli potrzebne)

Jeśli chcesz wrócić do in-memory bazy, zmień w Program.cs:
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));
```
