# 🚀 QUICK START - PostgreSQL Setup

## ⏱️ 5-minutowa instalacja

### 1️⃣ Zainstaluj PostgreSQL (jeśli nie masz)
```powershell
# Windows - Pobierz instalator z:
https://www.postgresql.org/download/windows/

# macOS
brew install postgresql

# Linux (Ubuntu/Debian)
sudo apt install postgresql
```

**Domyślne ustawienia:**
- Username: `postgres`
- Password: `postgres`
- Port: `5432`

---

### 2️⃣ Przywróć pakiety NuGet
```powershell
cd c:\Users\Jawgrzyn\test\flat\zarzadzanieMieszkaniami
dotnet restore
```

---

### 3️⃣ Utwórz bazę danych (wybierz jedną opcję)

#### ✅ Opcja A: Automatycznie (Entity Framework - POLECANE)
```powershell
dotnet ef database update
```

#### ✅ Opcja B: Ręcznie (PostgreSQL CLI)
```bash
psql -U postgres -f ../database_init.sql
```

---

### 4️⃣ (Opcjonalnie) Załaduj przykładowe dane
```bash
psql -U postgres -d mieszkania_db -f ../database_sample_data.sql
```

Tworzy:
- 3 przykładowych użytkowników
- 2 nieruchomości
- 2 zgłoszenia/issues

---

### 5️⃣ Uruchom aplikację
```powershell
dotnet run
```

Aplikacja powinna być dostępna na: `http://localhost:5162`

---

## ✅ Weryfikacja

Aplikacja uruchomiona prawidłowo, jeśli:
- ✓ Bez błędów w konsoli
- ✓ Swagger dostępny: `http://localhost:5162/swagger`
- ✓ Możesz się zalogować/zarejestrować

---

## 🔧 Jeśli coś poszło nie tak

### Błąd: `connect to server: No such file or directory`
**Rozwiązanie:** PostgreSQL nie jest uruchomiony
```powershell
# Windows - Uruchom usługę PostgreSQL
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Błąd: `password authentication failed`
**Rozwiązanie:** Zmień hasło w connection stringu
- Edytuj: `appsettings.json`
- Zmień: `Password=postgres` na Twoje hasło

### Błąd: `database "mieszkania_db" does not exist`
**Rozwiązanie:** Ponownie uruchom migrację
```powershell
dotnet ef database update
```

### Błąd: `column "id" has unsupported type`
**Rozwiązanie:** Usuń folder `Migrations` i stwórz nowy
```powershell
rm -r Migrations
dotnet ef migrations add InitialCreate
dotnet ef database update
```

---

## 📊 Tabele w bazie

Po migracji powinna mieć **4 tabele**:

| Tabela | Opis |
|--------|------|
| `users` | Użytkownicy (właściciele, najemcy, administracja) |
| `properties` | Nieruchomości do zarządzania |
| `issues` | Zgłoszenia/tickety napraw |
| `refresh_tokens` | Tokeny do odświeżania sesji JWT |

---

## 📞 Kontakt/Pomoc

- 📖 Pełna dokumentacja: `POSTGRESQL_SETUP.md`
- 📝 Notatki migracji: `MIGRATION_NOTES.md`
- 📋 Podsumowanie zmian: `IMPLEMENTATION_SUMMARY.md`

---

✨ **Gotowe!** Twoja aplikacja teraz używa PostgreSQL zamiast In-Memory bazy.
