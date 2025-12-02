# 🎯 MIGRATION CHECKLIST: In-Memory Database → PostgreSQL

## ✅ Ukończone kroki:

1. **Zainstalowano pakiety:**
   - `Npgsql.EntityFrameworkCore.PostgreSQL` v7.0.10
   - `Microsoft.EntityFrameworkCore.Design` v7.0.10

2. **Zaktualizowano pliki konfiguracyjne:**
   - `Program.cs` - zmiana `UseInMemoryDatabase()` → `UseNpgsql()`
   - `appsettings.json` - dodano ConnectionString dla PostgreSQL
   - `appsettings.Development.json` - dodano ConnectionString dla development

3. **Przygotowano migracje Entity Framework:**
   - `Migrations/20240102000000_InitialCreate.cs` - migacja główna
   - `Migrations/AppDbContextModelSnapshot.cs` - snapshot modelu

4. **Stworzone skrypty SQL:**
   - `database_init.sql` - tworzenie bazy i tabel
   - `database_sample_data.sql` - przykładowe dane do testów

## 🚀 Jak kontynuować:

### Krok 1: Zainstaluj PostgreSQL
- Pobierz: https://www.postgresql.org/download/
- Zainstaluj z domyślnym użytkownikiem: `postgres` i hasłem: `postgres`

### Krok 2: Przywróć pakiety
```powershell
cd c:\Users\Jawgrzyn\test\flat\zarzadzanieMieszkaniami
dotnet restore
```

### Krok 3: Utwórz bazę danych
Opcja A - Automatycznie (Entity Framework):
```powershell
dotnet ef database update
```

Opcja B - Ręcznie (via psql lub pgAdmin):
```powershell
psql -U postgres -f ..\database_init.sql
```

### Krok 4: (Opcjonalnie) Załaduj przykładowe dane
```powershell
psql -U postgres -d mieszkania_db -f ..\database_sample_data.sql
```

### Krok 5: Uruchom aplikację
```powershell
dotnet run
```

## 📊 TABELE W PostgreSQL:

| Tabela | Kolumny | Opis |
|--------|---------|------|
| **users** | id, email, password_hash, first_name, last_name, role, phone_number, created_at, updated_at | Użytkownicy systemu |
| **properties** | id, address, city, postal_code, rooms_count, area, owner_id, current_tenant_id, created_at | Nieruchomości do zarządzania |
| **issues** | id, title, description, category, priority, status, property_id, reported_by_id, reported_at, resolved_at, photos | Zgłoszenia/Tickety |
| **refresh_tokens** | id, user_id, token, expires_at, created_at, is_revoked | Tokeny odświeżające JWT |

## 🔒 Zmienne środowiskowe

Connection string w `appsettings.json`:
```
Host=localhost;Port=5432;Database=mieszkania_db;Username=postgres;Password=postgres
```

**⚠️ Zmień hasło jeśli Twoja baza ma inne hasło PostgreSQL!**

## 🛠️ Troubleshooting

### Błąd: "Unable to connect to PostgreSQL"
- Sprawdź czy PostgreSQL jest uruchomiony
- Sprawdź poprawność connection stringa
- Weryfikuj port (domyślnie 5432)

### Błąd: "Database exists"
- Baza już istnieje - możesz dodać nowe migracje jeśli zmieni się model

### Błąd EF Core
- Upewnij się że `.NET ef` tools są zainstalowane:
  ```powershell
  dotnet tool install --global dotnet-ef
  ```

## 📝 Dokumentacja
- Więcej info: `POSTGRESQL_SETUP.md`
