-- Migracja: Dodanie pól Photos i Description do tabeli Properties
-- Data: 2025-01-08

-- Dodaj kolumny Photos (JSON) i Description (TEXT)
ALTER TABLE "Properties"
ADD COLUMN "Photos" TEXT DEFAULT '[]',
ADD COLUMN "Description" TEXT;

-- Ustaw domyślną wartość [] dla istniejących rekordów
UPDATE "Properties"
SET "Photos" = '[]'
WHERE "Photos" IS NULL;

-- Dodaj komentarze do kolumn
COMMENT ON COLUMN "Properties"."Photos" IS 'JSON array przechowujący nazwy plików zdjęć';
COMMENT ON COLUMN "Properties"."Description" IS 'Opis mieszkania';
