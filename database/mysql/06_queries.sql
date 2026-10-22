-- =====================================================================
--  06_queries.sql  —  important queries
-- =====================================================================

-- Q1 JOIN + ORDER BY: royalty lines with creator, work and platform
SELECT  r.royalty_id, cr.name AS creator, c.title, p.platform_name,
        u.usage_date, r.calculated_amount, r.currency
FROM    royalty r
JOIN    creator      cr ON cr.creator_id = r.creator_id
JOIN    usage_record u  ON u.usage_id    = r.usage_id
JOIN    license      l  ON l.license_id  = u.license_id
JOIN    content      c  ON c.content_id  = l.content_id
JOIN    platform     p  ON p.platform_id = l.platform_id
ORDER BY u.usage_date DESC
LIMIT 20;

-- Q2 GROUP BY + HAVING + aggregates: platforms with INR revenue above 1,00,000
SELECT  p.platform_name, COUNT(*) AS usage_rows, SUM(u.quantity) AS units,
        SUM(u.gross_revenue) AS gross_revenue, AVG(u.gross_revenue) AS avg_revenue
FROM    platform p
JOIN    license l      ON l.platform_id = p.platform_id
JOIN    usage_record u ON u.license_id  = l.license_id
WHERE   u.currency = 'INR'
GROUP BY p.platform_name
HAVING  SUM(u.gross_revenue) > 100000
ORDER BY gross_revenue DESC;

-- Q3 Subquery: creators with above-average total earnings
SELECT  name, total_earned
FROM    v_creator_earnings
WHERE   currency = 'INR'
  AND   total_earned > (SELECT AVG(total_earned) FROM v_creator_earnings WHERE currency = 'INR');

-- Q4 Correlated subquery: each work's best month
SELECT  c.title, DATE_FORMAT(u.usage_date, '%Y-%m') AS best_month, u.gross_revenue
FROM    usage_record u
JOIN    license l ON l.license_id = u.license_id
JOIN    content c ON c.content_id = l.content_id
WHERE   u.gross_revenue = (SELECT MAX(u2.gross_revenue)
                             FROM usage_record u2
                             JOIN license l2 ON l2.license_id = u2.license_id
                            WHERE l2.content_id = l.content_id);

-- Q5 NOT EXISTS: works that are not licensed
SELECT  content_id, title
FROM    content c
WHERE   NOT EXISTS (SELECT 1 FROM license l WHERE l.content_id = c.content_id);

-- Q6 LEFT JOIN + HAVING: works with less than 100% ownership allocated
SELECT  c.title, COALESCE(SUM(o.ownership_percentage), 0) AS allocated
FROM    content c
LEFT JOIN ownership o ON o.content_id = c.content_id
GROUP BY c.content_id, c.title
HAVING  allocated < 100;

-- Q7 Full-text search
SELECT  title, genre, MATCH(title, genre, synopsis) AGAINST ('night city') AS relevance
FROM    content
WHERE   MATCH(title, genre, synopsis) AGAINST ('night city')
ORDER BY relevance DESC;

-- Q8 View + stored function
SELECT  name, currency, unpaid, fn_creator_unpaid_balance(creator_id, currency) AS unpaid_by_function
FROM    v_creator_earnings;

-- DML: INSERT / UPDATE / DELETE inside a transaction, rolled back
START TRANSACTION;
INSERT INTO content (title, content_type, genre) VALUES ('Demo Track', 'AUDIO', 'Lo-fi');
SET @id = LAST_INSERT_ID();
INSERT INTO ownership VALUES (6, @id, 100, 'PRIMARY_ARTIST');
UPDATE content SET genre = 'Chillhop' WHERE content_id = @id;
DELETE FROM content WHERE content_id = @id;      -- ownership row removed by ON DELETE CASCADE
ROLLBACK;
