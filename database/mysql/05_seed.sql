-- =====================================================================
--  05_seed.sql  —  realistic demo data (DML: INSERT / UPDATE / CALL)
--  Login accounts (app_user) are created by scripts/setup-mysql.mjs
--  because their passwords must be bcrypt-hashed.
-- =====================================================================

INSERT INTO platform (platform_id, platform_name, platform_type, country, contact_email) VALUES
 (1, 'Melodia Stream',  'STREAMING', 'IN', 'licensing@melodia.example.com'),
 (2, 'ViewTube Media',  'SOCIAL',    'US', 'rights@viewtube.example.com'),
 (3, 'Sonic Store',     'DOWNLOAD',  'GB', 'deals@sonicstore.example.co.uk'),
 (4, 'Radio Nova FM',   'BROADCAST', 'IN', 'music@radionova.example.in'),
 (5, 'CineVerse OTT',   'STREAMING', 'IN', 'content@cineverse.example.in');

INSERT INTO creator (creator_id, name, creator_type, email, phone, country, payout_currency, bank_account_last4) VALUES
 (1, 'Aarav Mehta',            'INDIVIDUAL', 'aarav@creators.example.com',   '+91 98450 11223', 'IN', 'INR', '4821'),
 (2, 'The Monsoon Collective', 'BAND',       'band@monsoon.example.com',     '+91 98860 44556', 'IN', 'INR', '9930'),
 (3, 'Riverbend Records',      'LABEL',      'accounts@riverbend.example.com','+91 80 4123 7788','IN', 'INR', '1177'),
 (4, 'Lumen Pictures',         'STUDIO',     'finance@lumen.example.com',    '+91 22 6655 1200', 'IN', 'INR', '6402'),
 (5, 'Estate of R. K. Sharma', 'ESTATE',     'estate.rks@example.com',       NULL,               'IN', 'INR', '3315'),
 (6, 'Priya Nair',             'INDIVIDUAL', 'priya@creators.example.com',   '+91 99001 22334', 'IN', 'INR', '7710'),
 (7, 'Kavya Rao',              'INDIVIDUAL', 'kavya@creators.example.com',   '+91 97400 55667', 'IN', 'INR', '2208');

INSERT INTO content (content_id, title, content_type, genre, release_date, duration_sec, `language`, synopsis) VALUES
 (1,  'Monsoon Nights',    'AUDIO',   'Indie Pop',   '2024-06-14', 245,  'eng', 'A dreamy indie pop single about rain-soaked city evenings and late night drives.'),
 (2,  'Chai and Chords',   'AUDIO',   'Acoustic',    '2023-11-02', 198,  'hin', 'Warm acoustic guitar ballad recorded live in a Bengaluru cafe.'),
 (3,  'City of Lamps',     'VIDEO',   'Documentary', '2025-01-20', 3120, 'eng', 'Feature documentary on the artisans who light Varanasi ghats every evening.'),
 (4,  'Echoes of Hampi',   'AUDIO',   'Classical',   '1998-08-15', 412,  'kan', 'Carnatic classical composition inspired by the ruins of Hampi.'),
 (5,  'Startup Diaries',   'PODCAST', 'Business',    '2025-03-01', 2700, 'eng', 'Weekly podcast interviewing founders about failure, funding and growth.'),
 (6,  'Neon Rickshaw',     'VIDEO',   'Music Video', '2024-09-09', 215,  'hin', 'Synthwave music video shot at night across Mumbai streets.'),
 (7,  'Raga Reimagined',   'AUDIO',   'Fusion',      '2025-05-05', 330,  'hin', 'Electronic fusion reinterpretation of a classical raga with live tabla.'),
 (8,  'The Last Tram',     'VIDEO',   'Short Film',  '2024-02-29', 1500, 'eng', 'Short film following a Kolkata tram driver on his final night shift.'),
 (9,  'Coastal Frames',    'IMAGE',   'Photography', '2025-07-01', NULL, NULL,  'Photo series of fishing villages along the Konkan coast at dawn.'),
 (10, 'Midnight Tiffin',   'PODCAST', 'Food',        '2025-08-10', 1800, 'eng', 'Food podcast exploring late night street food across Indian cities.');

INSERT INTO ownership (creator_id, content_id, ownership_percentage, `role`) VALUES
 (1, 1, 50.00, 'PRIMARY_ARTIST'), (6, 1, 30.00, 'COMPOSER'),        (3, 1, 20.00, 'PUBLISHER'),
 (2, 2, 60.00, 'PRIMARY_ARTIST'), (3, 2, 40.00, 'PUBLISHER'),
 (4, 3, 70.00, 'DIRECTOR'),       (7, 3, 30.00, 'PRODUCER'),
 (5, 4, 100.00,'COMPOSER'),
 (7, 5, 100.00,'PRIMARY_ARTIST'),
 (2, 6, 40.00, 'PRIMARY_ARTIST'), (4, 6, 35.00, 'DIRECTOR'),        (3, 6, 25.00, 'PUBLISHER'),
 (1, 7, 40.00, 'PRIMARY_ARTIST'), (5, 7, 30.00, 'COMPOSER'),        (6, 7, 30.00, 'FEATURED_ARTIST'),
 (4, 8, 100.00,'DIRECTOR'),
 (6, 9, 100.00,'PRIMARY_ARTIST'),
 (7, 10, 60.00,'PRIMARY_ARTIST');   -- 40% intentionally unallocated

INSERT INTO license (license_id, platform_id, content_id, license_type, start_date, end_date, royalty_rate, currency, status) VALUES
 (1,  1, 1, 'NON_EXCLUSIVE', '2026-01-01', NULL,         0.5500, 'INR', 'ACTIVE'),
 (2,  1, 2, 'NON_EXCLUSIVE', '2026-01-01', '2026-12-31', 0.5000, 'INR', 'ACTIVE'),
 (3,  1, 7, 'NON_EXCLUSIVE', '2026-01-01', NULL,         0.5200, 'INR', 'ACTIVE'),
 (4,  2, 6, 'NON_EXCLUSIVE', '2026-01-01', NULL,         0.4500, 'USD', 'ACTIVE'),
 (5,  2, 1, 'NON_EXCLUSIVE', '2026-02-01', NULL,         0.4500, 'USD', 'ACTIVE'),
 (6,  3, 1, 'NON_EXCLUSIVE', '2026-01-01', '2026-06-30', 0.7000, 'INR', 'ACTIVE'),
 (7,  4, 4, 'NON_EXCLUSIVE', '2026-01-01', NULL,         0.1500, 'INR', 'ACTIVE'),
 (8,  5, 3, 'EXCLUSIVE',     '2026-01-01', '2027-12-31', 0.3500, 'INR', 'ACTIVE'),
 (9,  5, 8, 'EXCLUSIVE',     '2026-03-01', NULL,         0.3000, 'INR', 'ACTIVE'),
 (10, 1, 5, 'NON_EXCLUSIVE', '2026-02-01', NULL,         0.4000, 'INR', 'ACTIVE'),
 (11, 4, 2, 'NON_EXCLUSIVE', '2026-04-01', NULL,         0.1500, 'INR', 'ACTIVE'),
 (12, 2, 9, 'NON_EXCLUSIVE', '2026-10-01', NULL,         0.2000, 'USD', 'DRAFT');

INSERT INTO license_territory (license_id, territory) VALUES
 (1, 'IN'), (2, 'IN'), (3, 'IN'), (3, 'LK'), (4, 'WW'), (5, 'US'), (5, 'GB'),
 (6, 'GB'), (6, 'IN'), (7, 'IN'), (8, 'IN'), (9, 'IN'), (9, 'AE'), (10, 'IN'),
 (11, 'IN'), (12, 'WW');

-- ---------------------------------------------------------------------
-- Monthly usage Jan–Sep 2026, generated with a recursive CTE.
-- One row per live licence per month, priced by platform type.
-- ---------------------------------------------------------------------
INSERT INTO usage_record (license_id, usage_date, usage_type, quantity, gross_revenue, currency, source_batch_ref)
WITH RECURSIVE months (m) AS (
    SELECT 1
    UNION ALL
    SELECT m + 1 FROM months WHERE m < 9
),
grid AS (
    SELECT l.license_id,
           l.currency,
           p.platform_id,
           p.platform_type,
           m,
           LAST_DAY(MAKEDATE(2026, 1) + INTERVAL (m - 1) MONTH) AS usage_date,
           MOD(l.license_id * 7919 + m * 104729, 997)              AS noise
      FROM months
      JOIN license  l ON l.status = 'ACTIVE'
      JOIN platform p ON p.platform_id = l.platform_id
     WHERE LAST_DAY(MAKEDATE(2026, 1) + INTERVAL (m - 1) MONTH) >= l.start_date
       AND (l.end_date IS NULL OR LAST_DAY(MAKEDATE(2026, 1) + INTERVAL (m - 1) MONTH) <= l.end_date)
)
SELECT license_id,
       usage_date,
       CASE platform_type WHEN 'SOCIAL'    THEN 'VIEW'
                          WHEN 'DOWNLOAD'  THEN 'DOWNLOAD'
                          WHEN 'BROADCAST' THEN 'BROADCAST'
                          ELSE 'STREAM' END,
       qty,
       ROUND(qty * unit_price, 2),
       currency,
       CONCAT('SEED-P', platform_id, '-2026-', LPAD(m, 2, '0'))
FROM (
    SELECT g.*,
           CASE g.platform_type
                WHEN 'SOCIAL'    THEN 40000 + g.noise * 310
                WHEN 'DOWNLOAD'  THEN 60 + g.noise
                WHEN 'BROADCAST' THEN 20 + MOD(g.noise, 90)
                ELSE CASE WHEN g.platform_id = 5 THEN 1500 + g.noise * 25
                          ELSE 15000 + g.noise * 140 END
           END AS qty,
           CASE g.platform_type
                WHEN 'SOCIAL'    THEN 0.0030
                WHEN 'DOWNLOAD'  THEN 89.00
                WHEN 'BROADCAST' THEN 1250.00
                ELSE CASE WHEN g.platform_id = 5 THEN 4.50 ELSE 0.32 END
           END AS unit_price
      FROM grid g
) priced;

-- Licence 6 ended on 2026-06-30
UPDATE license SET status = 'EXPIRED' WHERE license_id = 6;

-- Royalties for Jan–Jun 2026 (Jul–Sep left for the live demo)
CALL sp_calculate_royalties('2026-01-01', '2026-06-30', @lines);

-- Payouts
CALL sp_settle_creator_payout(1, 'INR', 'UPI', @p1);
UPDATE payment SET status = 'COMPLETED' WHERE payment_id = @p1;

CALL sp_settle_creator_payout(2, 'INR', 'BANK_TRANSFER', @p2);
UPDATE payment SET status = 'COMPLETED' WHERE payment_id = @p2;

CALL sp_settle_creator_payout(4, 'INR', 'WIRE', @p3);            -- stays PENDING

CALL sp_settle_creator_payout(3, 'INR', 'BANK_TRANSFER', @p4);
UPDATE payment SET status = 'FAILED' WHERE payment_id = @p4;      -- trigger releases the lines
