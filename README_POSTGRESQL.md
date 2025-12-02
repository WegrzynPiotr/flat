# 📚 PostgreSQL Migration Documentation Index

**Ostatnia aktualizacja:** Grudzień 2025
**Status:** ✅ Migracja ukończona

---

## 🎯 Szybki Start

1. **Jeśli masz 5 minut:** Przeczytaj `QUICKSTART.md`
2. **Jeśli masz 15 minut:** Przeczytaj `POSTGRESQL_SETUP.md`
3. **Jeśli chcesz znać szczegóły:** Przeczytaj `IMPLEMENTATION_SUMMARY.md`

---

## 📖 DOKUMENTACJA

### 🚀 Początkujący
| Plik | Zawartość | Czas |
|------|-----------|------|
| **QUICKSTART.md** | Setup w 5 minut | ⏱️ 5 min |
| **TABLES_SUMMARY.md** | Wizualne tabel i relacji | ⏱️ 10 min |
| **COMPLETE_SUMMARY.txt** | Pełne podsumowanie w tekstzie | ⏱️ 15 min |

### 🔧 Zaawansowani
| Plik | Zawartość | Czas |
|------|-----------|------|
| **POSTGRESQL_SETUP.md** | Szczegółowa konfiguracja | ⏱️ 30 min |
| **MIGRATION_NOTES.md** | Checklist + Troubleshooting | ⏱️ 20 min |
| **IMPLEMENTATION_SUMMARY.md** | Wszystkie zmiany w kodzie | ⏱️ 30 min |

---

## 💾 SQL SKRYPTY

| Plik | Opis | Uruchomienie |
|------|------|-------------|
| **database_init.sql** | Tworzenie bazy i tabel | `psql -U postgres -f database_init.sql` |
| **database_sample_data.sql** | Przykładowe dane | `psql -U postgres -d mieszkania_db -f database_sample_data.sql` |

---

## 🧪 SKRYPTY TESTOWE

| Plik | Platform | Opis |
|------|----------|------|
| **test_migration.ps1** | Windows | Automatyczne testowanie migracji |
| **test_migration.sh** | Linux/Mac | Automatyczne testowanie migracji |

**Uruchomienie:**
```powershell
# Windows
.\test_migration.ps1

# Linux/Mac
bash test_migration.sh
```

---

## 📊 WYMAGANE TABELE

```
┌──────────────────────────────────────────────────────┐
│  USERS (Użytkownicy)                                 │
│  ├─ id (UUID, PK)                                    │
│  ├─ email (VARCHAR 100, UNIQUE)                      │
│  ├─ password_hash (TEXT)                             │
│  ├─ first_name, last_name (VARCHAR 50)               │
│  ├─ role (Właściciel|Najemca|Serwisant|Admin)       │
│  ├─ phone_number, created_at, updated_at             │
│  └─ Relations: OwnedProperties, ReportedIssues       │
└──────────────────────────────────────────────────────┘
         ▼              ▼
┌────────────────────────────────────────────────────┐
│  PROPERTIES (Nieruchomości)                         │
│  ├─ id (UUID, PK)                                  │
│  ├─ address, city, postal_code                     │
│  ├─ rooms_count, area                              │
│  ├─ owner_id (FK → users)                          │
│  ├─ current_tenant_id (FK → users, nullable)       │
│  ├─ created_at                                     │
│  └─ Relations: Owner, CurrentTenant, Issues        │
└────────────────────────────────────────────────────┘
         ▼
┌────────────────────────────────────────────────────┐
│  ISSUES (Zgłoszenia/Tickety)                       │
│  ├─ id (UUID, PK)                                  │
│  ├─ title, description                             │
│  ├─ category, priority, status                     │
│  ├─ property_id (FK → properties)                  │
│  ├─ reported_by_id (FK → users)                    │
│  ├─ reported_at, resolved_at, photos               │
│  └─ Relations: Property, ReportedBy                │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  REFRESH_TOKENS (Tokeny JWT)                       │
│  ├─ id (UUID, PK)                                  │
│  ├─ user_id (FK → users)                           │
│  ├─ token (VARCHAR 500)                            │
│  ├─ expires_at, created_at                         │
│  └─ is_revoked (BOOLEAN)                           │
└────────────────────────────────────────────────────┘
```

---

## 🔄 MIGRACJA - KROKI

```
1️⃣ Zainstaluj PostgreSQL
   ↓
2️⃣ Przywróć pakiety: dotnet restore
   ↓
3️⃣ Utwórz bazę: dotnet ef database update
   ↓
4️⃣ (Opcjonalnie) Załaduj dane: psql -U postgres -d mieszkania_db -f database_sample_data.sql
   ↓
5️⃣ Uruchom: dotnet run
   ↓
✅ http://localhost:5162
```

---

## 📝 ZMIENIONE PLIKI

### Konfiguracja
- ✅ `Program.cs` - UseNpgsql zamiast UseInMemoryDatabase
- ✅ `appsettings.json` - Connection string
- ✅ `appsettings.Development.json` - Dev connection string

### Projekty
- ✅ `zarzadzanieMieszkaniami.csproj` - Npgsql pakiety
- ✅ `backend/Infrastructure/Infrastructure.csproj` - Npgsql pakiety

### Kod
- ✅ `backend/Infrastructure/AppDbContext.cs` - PostgreSQL conventions
- ✅ `backend/Infrastructure/Extensions/StringExtensions.cs` - ToSnakeCase

### Entity Framework
- ✅ `backend/Infrastructure/Migrations/20240102000000_InitialCreate.cs`
- ✅ `backend/Infrastructure/Migrations/AppDbContextModelSnapshot.cs`

---

## 🔐 Connection String

```
Host=localhost
Port=5432
Database=mieszkania_db
Username=postgres
Password=postgres
```

**Lokalizacja:** `appsettings.json` lub `appsettings.Development.json`

⚠️ **Zmień hasło jeśli Twoja baza ma inne ustawienia!**

---

## 🐛 TROUBLESHOOTING

### Nie mogę się połączyć z PostgreSQL
```powershell
# Sprawdź czy PostgreSQL jest uruchomiony
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" status

# Uruchom PostgreSQL
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
```

### Baza nie istnieje
```powershell
dotnet ef database update
```

### Błędy migracji
```powershell
# Usuń Migrations folder (uwaga: to usunie historię!)
rm -r Migrations

# Stwórz nową migrację
dotnet ef migrations add InitialCreate

# Zaktualizuj bazę
dotnet ef database update
```

### Błędy nazw kolumn
Sprawdź czy `ToSnakeCase()` jest dostępne w `StringExtensions.cs`

---

## 📞 WSPARCIE

**Dokumentacja zawiera:**
- ✅ Instrukcje konfiguracji
- ✅ Przykładowe SQL
- ✅ Troubleshooting
- ✅ Checklist migracji
- ✅ Podsumowanie zmian

**Jeśli potrzebujesz pomocy:**
1. Przeczytaj odpowiednią sekcję w dokumentacji
2. Uruchom `test_migration.ps1` aby sprawdzić setup
3. Sprawdź logi błędów w konsoli

---

## ✅ CHECKLIST

Przed uruchomieniem aplikacji:

- [ ] PostgreSQL zainstalowany
- [ ] `dotnet restore` wykonany
- [ ] `dotnet ef database update` wykonany
- [ ] Connection string poprawny
- [ ] Baza `mieszkania_db` istnieje
- [ ] Tabele zostały utworzone
- [ ] (Opcjonalnie) Przykładowe dane załadowane

---

## 🎉 GOTOWE!

Twoja aplikacja teraz korzysta z **PostgreSQL** zamiast In-Memory Database.

**Następne kroki:**
1. Zainstaluj PostgreSQL
2. Uruchom migracje
3. Testuj aplikację
4. Deploy do produkcji (z proper secret management)

---

## 📅 Historia zmian

| Data | Akcja | Status |
|------|-------|--------|
| Grudzień 2025 | Migracja z InMemory na PostgreSQL | ✅ Ukończone |

---

## 📚 Dodatkowe zasoby

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Entity Framework Core PostgreSQL](https://www.npgsql.org/efcore/)
- [Microsoft EF Core Docs](https://docs.microsoft.com/en-us/ef/core/)

---

**Stworzone z ❤️ dla Zarządzania Mieszkaniami**
