-- =====================================================================
--  04_triggers.sql  —  business rules validated inside the database
-- =====================================================================

DROP TRIGGER IF EXISTS trg_ownership_bi;
DROP TRIGGER IF EXISTS trg_usage_bi;
DROP TRIGGER IF EXISTS trg_payment_au;

DELIMITER $$

-- Ownership splits of one work cannot add up to more than 100%
CREATE TRIGGER trg_ownership_bi BEFORE INSERT ON ownership
FOR EACH ROW
BEGIN
    IF (SELECT COALESCE(SUM(ownership_percentage), 0) FROM ownership
         WHERE content_id = NEW.content_id) + NEW.ownership_percentage > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ownership split for this content would exceed 100%';
    END IF;
END$$

-- Usage can only be reported inside the period of an ACTIVE/EXPIRED licence,
-- in the licence currency
CREATE TRIGGER trg_usage_bi BEFORE INSERT ON usage_record
FOR EACH ROW
BEGIN
    DECLARE v_ok INT;
    SELECT COUNT(*) INTO v_ok
      FROM license
     WHERE license_id = NEW.license_id
       AND status IN ('ACTIVE', 'EXPIRED')
       AND NEW.usage_date >= start_date
       AND (end_date IS NULL OR NEW.usage_date <= end_date)
       AND currency = NEW.currency;
    IF v_ok = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Usage must fall inside an active licence period and use the licence currency';
    END IF;
END$$

-- A FAILED or REVERSED payment releases its royalty lines for the next payout
CREATE TRIGGER trg_payment_au AFTER UPDATE ON payment
FOR EACH ROW
BEGIN
    IF NEW.status IN ('FAILED', 'REVERSED') AND OLD.status NOT IN ('FAILED', 'REVERSED') THEN
        UPDATE royalty SET payment_id = NULL WHERE payment_id = NEW.payment_id;
    END IF;
END$$

DELIMITER ;
