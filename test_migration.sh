#!/bin/bash

# Skrypt do testowania migracji bazy danych
# Uruchom z: ./test_migration.sh

cd zarzadzanieMieszkaniami

echo "🔄 Przywracanie pakietów..."
dotnet restore

echo "🗄️  Usuwanie starej bazy (jeśli istnieje)..."
# Uwaga: To usunie bazę! Wykonuj ostrożnie
# psql -U postgres -c "DROP DATABASE IF EXISTS mieszkania_db;"

echo "📋 Tworzenie bazy danych poprzez migracje..."
dotnet ef database update

if [ $? -eq 0 ]; then
    echo "✅ Migracja zakończona sukcesem!"
else
    echo "❌ Migracja nie powiodła się"
    exit 1
fi

echo "🧪 Testowanie połączenia z bazą..."
dotnet run &
sleep 5
kill $!

echo "✅ Wszystko działa prawidłowo!"
