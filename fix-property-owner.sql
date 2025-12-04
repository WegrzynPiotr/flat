-- Napraw właściciela properties aby zgadzał się z zalogowanym użytkownikiem
-- Aktualizuj wszystkie properties z dummy owner_id na prawdziwego właściciela

UPDATE properties 
SET owner_id = '011d8eb5-057a-4ecd-8fda-7200f38676be'
WHERE owner_id = '11111111-1111-1111-1111-111111111111';

-- Sprawdź wynik
SELECT id, address, owner_id FROM properties;
