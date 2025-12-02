-- Najpierw musimy stworzyć użytkownika-administratora, który będzie właścicielem
-- Hasło: Admin123!
INSERT INTO asp_net_users (id, user_name, normalized_user_name, email, normalized_email, email_confirmed, password_hash, security_stamp, concurrency_stamp, phone_number_confirmed, two_factor_enabled, lockout_enabled, access_failed_count, first_name, last_name, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@mieszkania.pl', 'ADMIN@MIESZKANIA.PL', 'admin@mieszkania.pl', 'ADMIN@MIESZKANIA.PL', true, 'AQAAAAIAAYagAAAAEHGvN8K+xWLZRfJQ5Y8tVHCmYxZKzF2Xz9p0qVvLnN1jDZ8WxM7eK5rY3wT4uN6qWg==', CAST(NEWID() AS VARCHAR(36)), CAST(NEWID() AS VARCHAR(36)), false, false, true, 0, 'Administrator', 'Systemu', NOW())
ON CONFLICT (id) DO NOTHING;

-- Dodaj rolę Administrator
INSERT INTO asp_net_roles (id, name, normalized_name, concurrency_stamp)
VALUES ('22222222-2222-2222-2222-222222222222', 'Administrator', 'ADMINISTRATOR', CAST(NEWID() AS VARCHAR(36)))
ON CONFLICT (id) DO NOTHING;

-- Przypisz rolę administratora
INSERT INTO asp_net_user_roles (user_id, role_id)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Dodaj przykładowe mieszkania
INSERT INTO properties (id, address, city, postal_code, rooms_count, area, owner_id, created_at)
VALUES 
    ('33333333-3333-3333-3333-333333333331', 'ul. Główna 15/23', 'Warszawa', '00-001', 3, 65.5, '11111111-1111-1111-1111-111111111111', NOW()),
    ('33333333-3333-3333-3333-333333333332', 'ul. Kwiatowa 8/12', 'Kraków', '30-002', 2, 45.0, '11111111-1111-1111-1111-111111111111', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'ul. Piękna 20/5', 'Gdańsk', '80-003', 4, 85.3, '11111111-1111-1111-1111-111111111111', NOW()),
    ('33333333-3333-3333-3333-333333333334', 'ul. Słoneczna 42/1', 'Wrocław', '50-004', 2, 50.0, '11111111-1111-1111-1111-111111111111', NOW()),
    ('33333333-3333-3333-3333-333333333335', 'ul. Zielona 7/18', 'Poznań', '60-005', 3, 72.8, '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (id) DO NOTHING;
