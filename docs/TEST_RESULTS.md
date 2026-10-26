# Database Test Results

Run with `npm run test:db`: **19/19 passed**.

| # | Test case | Result | Database response |
|---|-----------|--------|-------------------|
| 1 | CHECK: ownership percentage 0 is rejected | PASS | Check constraint 'ck_own_pct' is violated. |
| 2 | CHECK: licence end date before start date is rejected | PASS | Check constraint 'ck_lic_dates' is violated. |
| 3 | CHECK: royalty rate above 1 is rejected | PASS | Check constraint 'ck_lic_rate' is violated. |
| 4 | CHECK: invalid e-mail is rejected | PASS | Check constraint 'ck_platform_email' is violated. |
| 5 | UNIQUE: duplicate platform name is rejected | PASS | Duplicate entry 'Melodia Stream' for key 'platform.uq_platform_name' |
| 6 | FOREIGN KEY: licence for a missing platform is rejected | PASS | Cannot add or update a child row: a foreign key constraint fails (`royalty_db`.`license`, CONSTRAINT `fk_lic_platform` FOREIGN KEY (`platform_id`) REFERENCES `platform` (`platform_id`) ON DELETE RESTRICT ON UPDATE CASCADE) |
| 7 | FOREIGN KEY: deleting a creator who owns content is blocked | PASS | Cannot delete or update a parent row: a foreign key constraint fails (`royalty_db`.`ownership`, CONSTRAINT `fk_own_creator` FOREIGN KEY (`creator_id`) REFERENCES `creator` (`creator_id`) ON DELETE RESTRICT ON UPDATE CASCADE) |
| 8 | UNIQUE: duplicate creator e-mail is rejected | PASS | Duplicate entry 'aarav@creators.example.com' for key 'creator.uq_creator_email' |
| 9 | CHECK: invalid creator e-mail is rejected | PASS | Check constraint 'ck_creator_email' is violated. |
| 10 | FOREIGN KEY: deleting a work that has a licence is blocked | PASS | Cannot delete or update a parent row: a foreign key constraint fails (`royalty_db`.`license`, CONSTRAINT `fk_lic_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`content_id`) ON DELETE RESTRICT ON UPDATE CASCADE) |
| 11 | TRIGGER: ownership total above 100% is rejected | PASS | Ownership split for this content would exceed 100% |
| 12 | TRIGGER: ownership up to exactly 100% is accepted | PASS | accepted |
| 13 | TRIGGER: usage outside the licence period is rejected | PASS | Usage must fall inside an active licence period and use the licence currency |
| 14 | TRIGGER: usage in the wrong currency is rejected | PASS | Usage must fall inside an active licence period and use the licence currency |
| 15 | TRIGGER: failing a payment releases its royalty lines | PASS | lines released |
| 16 | FUNCTION: fn_creator_unpaid_balance matches the view | PASS | both 138557.07 |
| 17 | PROCEDURE: re-running royalty calculation creates no duplicates | PASS | 0 new lines |
| 18 | PROCEDURE: payout with nothing owed is rejected | PASS | Nothing to pay for this creator and currency |
| 19 | TRANSACTION: ROLLBACK undoes an insert | PASS | row removed |
