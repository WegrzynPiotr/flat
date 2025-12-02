-- Użytkownik Administrator (login: admin@mieszkania.pl, hasło: Admin123!)
-- Hash hasła wygenerowany przez ASP.NET Identity dla hasła "Admin123!"
INSERT INTO asp_net_users (id, user_name, normalized_user_name, email, normalized_email, email_confirmed, password_hash, security_stamp, concurrency_stamp, phone_number_confirmed, two_factor_enabled, lockout_enabled, access_failed_count, first_name, last_name, created_at, phone_number, updated_at)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid, 
    'admin@mieszkania.pl', 
    'ADMIN@MIESZKANIA.PL', 
    'admin@mieszkania.pl', 
    'ADMIN@MIESZKANIA.PL', 
    true, 
    'AQAAAAIAAYagAAAAEHGvN8K+xWLZRfJQ5Y8tVHCmYxZKzF2Xz9p0qVvLnN1jDZ8WxM7eK5rY3wT4uN6qWg==', 
    gen_random_uuid()::text, 
    gen_random_uuid()::text, 
    false, 
    false, 
    true, 
    0, 
    'Administrator', 
    'Systemu', 
    NOW(),
    NULL,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM asp_net_users WHERE id = '11111111-1111-1111-1111-111111111111'::uuid);

-- Rola Administrator
INSERT INTO asp_net_roles (id, name, normalized_name, concurrency_stamp)
SELECT 
    '22222222-2222-2222-2222-222222222222'::uuid, 
    'Administrator', 
    'ADMINISTRATOR', 
    gen_random_uuid()::text
WHERE NOT EXISTS (SELECT 1 FROM asp_net_roles WHERE id = '22222222-2222-2222-2222-222222222222'::uuid);

-- Rola Właściciel
INSERT INTO asp_net_roles (id, name, normalized_name, concurrency_stamp)
SELECT 
    '22222222-2222-2222-2222-222222222223'::uuid, 
    'Właściciel', 
    'WŁAŚCICIEL', 
    gen_random_uuid()::text
WHERE NOT EXISTS (SELECT 1 FROM asp_net_roles WHERE name = 'Właściciel');

-- Rola Najemca
INSERT INTO asp_net_roles (id, name, normalized_name, concurrency_stamp)
SELECT 
    '22222222-2222-2222-2222-222222222224'::uuid, 
    'Najemca', 
    'NAJEMCA', 
    gen_random_uuid()::text
WHERE NOT EXISTS (SELECT 1 FROM asp_net_roles WHERE name = 'Najemca');

-- Przypisz rolę Administrator do użytkownika admin
INSERT INTO asp_net_user_roles (user_id, role_id)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid, 
    '22222222-2222-2222-2222-222222222222'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM asp_net_user_roles 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND role_id = '22222222-2222-2222-2222-222222222222'::uuid
);

-- Przykładowe mieszkania
INSERT INTO properties (id, address, city, postal_code, rooms_count, area, owner_id, created_at) 
VALUES
    ('33333333-3333-3333-3333-333333333331'::uuid, 'ul. Główna 15/23', 'Warszawa', '00-001', 3, 65.5, '11111111-1111-1111-1111-111111111111'::uuid, NOW()),
    ('33333333-3333-3333-3333-333333333332'::uuid, 'ul. Kwiatowa 8/12', 'Kraków', '30-002', 2, 45.0, '11111111-1111-1111-1111-111111111111'::uuid, NOW()),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'ul. Piękna 20/5', 'Gdańsk', '80-003', 4, 85.3, '11111111-1111-1111-1111-111111111111'::uuid, NOW()),
    ('33333333-3333-3333-3333-333333333334'::uuid, 'ul. Słoneczna 42/1', 'Wrocław', '50-004', 2, 50.0, '11111111-1111-1111-1111-111111111111'::uuid, NOW()),
    ('33333333-3333-3333-3333-333333333335'::uuid, 'ul. Zielona 7/18', 'Poznań', '60-005', 3, 72.8, '11111111-1111-1111-1111-111111111111'::uuid, NOW())
ON CONFLICT (id) DO NOTHING;
