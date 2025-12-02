-- ============================================
-- PRZYKŁADOWE DANE DO TESTOWANIA
-- ============================================

-- Wstawienie przykładowych użytkowników
INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone_number, created_at)
VALUES 
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'owner@example.com', 'hash_password_123', 'Jan', 'Kowalski', 'Właściciel', '123456789', NOW()),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'tenant@example.com', 'hash_password_456', 'Anna', 'Nowak', 'Najemca', '987654321', NOW()),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid, 'admin@example.com', 'hash_password_789', 'Piotr', 'Admin', 'Administrator', NULL, NOW());

-- Wstawienie przykładowych nieruchomości
INSERT INTO properties (id, address, city, postal_code, rooms_count, area, owner_id, current_tenant_id, created_at)
VALUES
    ('a47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'ul. Główna 123', 'Warszawa', '00-001', 3, 75.50, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, NOW()),
    ('a47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'ul. Boczna 45', 'Kraków', '31-001', 2, 55.00, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, NULL, NOW());

-- Wstawienie przykładowych zgłoszeń
INSERT INTO issues (id, title, description, category, priority, status, property_id, reported_by_id, reported_at, photos)
VALUES
    ('b47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Przeciek w łazience', 'Woda przecieka z sufitu w łazience', 'Hydraulika', 'Wysoka', 'Nowe', 'a47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, NOW(), NULL),
    ('b47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'Uszkodzona kontakt elektryczny', 'Jeden z kontatków nie działa prawidłowo', 'Elektryka', 'Średnia', 'Przypisane', 'a47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, NOW(), NULL);
