-- =====================================================================
--  02_views.sql
-- =====================================================================

-- Licence with platform / content names and its territories
CREATE OR REPLACE VIEW v_license_overview AS
SELECT  l.license_id, l.platform_id, p.platform_name, l.content_id, c.title AS content_title,
        l.license_type, l.start_date, l.end_date, l.royalty_rate, l.currency, l.status,
        GROUP_CONCAT(lt.territory ORDER BY lt.territory) AS territories
FROM    license l
JOIN    platform p ON p.platform_id = l.platform_id
JOIN    content  c ON c.content_id  = l.content_id
LEFT JOIN license_territory lt ON lt.license_id = l.license_id
GROUP BY l.license_id, l.platform_id, p.platform_name, l.content_id, c.title,
         l.license_type, l.start_date, l.end_date, l.royalty_rate, l.currency, l.status;

-- Earned / paid / unpaid per creator and currency
CREATE OR REPLACE VIEW v_creator_earnings AS
SELECT  cr.creator_id, cr.name, r.currency,
        COUNT(*)                                                                AS royalty_lines,
        SUM(r.calculated_amount)                                                AS total_earned,
        COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN r.calculated_amount END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN r.payment_id IS NULL THEN r.calculated_amount END), 0)  AS unpaid
FROM    creator cr
JOIN    royalty r      ON r.creator_id = cr.creator_id
LEFT JOIN payment p    ON p.payment_id = r.payment_id
GROUP BY cr.creator_id, cr.name, r.currency;

-- Gross revenue per platform per month
CREATE OR REPLACE VIEW v_platform_monthly_revenue AS
SELECT  p.platform_id, p.platform_name,
        DATE_FORMAT(u.usage_date, '%Y-%m') AS month,
        u.currency,
        SUM(u.quantity)      AS total_quantity,
        SUM(u.gross_revenue) AS gross_revenue
FROM    usage_record u
JOIN    license  l ON l.license_id  = u.license_id
JOIN    platform p ON p.platform_id = l.platform_id
GROUP BY p.platform_id, p.platform_name, DATE_FORMAT(u.usage_date, '%Y-%m'), u.currency;
