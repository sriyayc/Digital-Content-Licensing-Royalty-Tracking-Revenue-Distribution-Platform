-- =====================================================================
--  03_functions_procedures.sql
-- =====================================================================

DROP FUNCTION  IF EXISTS fn_creator_unpaid_balance;
DROP PROCEDURE IF EXISTS sp_calculate_royalties;
DROP PROCEDURE IF EXISTS sp_settle_creator_payout;

DELIMITER $$

-- Unpaid royalty balance of a creator in one currency
CREATE FUNCTION fn_creator_unpaid_balance(p_creator_id INT, p_currency CHAR(3))
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);
    SELECT COALESCE(SUM(calculated_amount), 0) INTO v_total
      FROM royalty
     WHERE creator_id = p_creator_id AND currency = p_currency AND payment_id IS NULL;
    RETURN v_total;
END$$

-- Create one royalty line per owner for every un-calculated usage record
-- in the period:  royalty = gross_revenue * royalty_rate * share / 100
-- Runs as a single transaction.
CREATE PROCEDURE sp_calculate_royalties(IN p_start DATE, IN p_end DATE, OUT p_lines INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_end < p_start THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid calculation period';
    END IF;

    START TRANSACTION;

    INSERT INTO royalty (usage_id, creator_id, calculated_amount, currency, rate_applied,
                         ownership_percentage_applied, calculation_date, period_start, period_end)
    SELECT u.usage_id, o.creator_id,
           ROUND(u.gross_revenue * l.royalty_rate * o.ownership_percentage / 100, 2),
           u.currency, l.royalty_rate, o.ownership_percentage, CURDATE(), p_start, p_end
      FROM usage_record u
      JOIN license   l ON l.license_id = u.license_id
      JOIN ownership o ON o.content_id = l.content_id
     WHERE u.usage_date BETWEEN p_start AND p_end
       AND NOT EXISTS (SELECT 1 FROM royalty r
                        WHERE r.usage_id = u.usage_id AND r.creator_id = o.creator_id);

    SET p_lines = ROW_COUNT();
    COMMIT;
END$$

-- Pay all unpaid royalty lines of a creator in one currency.
-- Lines are locked (FOR UPDATE) so they cannot be paid twice.
CREATE PROCEDURE sp_settle_creator_payout(IN p_creator_id INT, IN p_currency CHAR(3),
                                          IN p_method VARCHAR(20), OUT p_payment_id INT)
BEGIN
    DECLARE v_amount DECIMAL(14,2) DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COALESCE(SUM(calculated_amount), 0) INTO v_amount
      FROM royalty
     WHERE creator_id = p_creator_id AND currency = p_currency AND payment_id IS NULL
     FOR UPDATE;

    IF v_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nothing to pay for this creator and currency';
    END IF;

    INSERT INTO payment (creator_id, payment_date, amount, currency, method, status, transaction_ref)
    VALUES (p_creator_id, CURDATE(), v_amount, p_currency, p_method, 'PENDING',
            CONCAT('PAY-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', p_creator_id, '-', p_currency));
    SET p_payment_id = LAST_INSERT_ID();

    UPDATE royalty SET payment_id = p_payment_id
     WHERE creator_id = p_creator_id AND currency = p_currency AND payment_id IS NULL;

    COMMIT;
END$$

DELIMITER ;
