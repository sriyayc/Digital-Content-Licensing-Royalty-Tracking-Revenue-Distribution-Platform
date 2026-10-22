-- =====================================================================
--  Digital Content Licensing, Royalty Tracking & Revenue Distribution
--  01_schema.sql  —  DDL: DROP / CREATE / ALTER, keys, constraints, indexes
--  MySQL 8.0
-- =====================================================================

-- DROP (reverse dependency order so the script can be re-run)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS royalty;
DROP TABLE IF EXISTS payment;
DROP TABLE IF EXISTS usage_record;
DROP TABLE IF EXISTS license_territory;
DROP TABLE IF EXISTS license;
DROP TABLE IF EXISTS ownership;
DROP TABLE IF EXISTS content;
DROP TABLE IF EXISTS creator;
DROP TABLE IF EXISTS platform;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE platform (
    platform_id   INT AUTO_INCREMENT COMMENT 'Surrogate primary key',
    platform_name VARCHAR(120) NOT NULL,
    platform_type ENUM('STREAMING','SOCIAL','DOWNLOAD','BROADCAST','OTHER') NOT NULL,
    country       CHAR(2)      NOT NULL COMMENT 'ISO 3166-1 alpha-2',
    contact_email VARCHAR(254) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_platform       PRIMARY KEY (platform_id),
    CONSTRAINT uq_platform_name  UNIQUE (platform_name),
    CONSTRAINT ck_platform_email CHECK (contact_email LIKE '%_@_%.__%')
) COMMENT 'Distribution platforms that licence content';

CREATE TABLE creator (
    creator_id         INT AUTO_INCREMENT,
    name               VARCHAR(150) NOT NULL,
    creator_type       ENUM('INDIVIDUAL','BAND','LABEL','STUDIO','ESTATE') NOT NULL,
    email              VARCHAR(254) NOT NULL,
    phone              VARCHAR(20)  DEFAULT NULL,
    country            CHAR(2)      NOT NULL,
    payout_currency    CHAR(3)      NOT NULL DEFAULT 'INR' COMMENT 'ISO 4217',
    bank_account_enc   VARBINARY(512) DEFAULT NULL COMMENT 'Encrypted at application layer',
    bank_account_last4 CHAR(4)      DEFAULT NULL,
    tax_id_enc         VARBINARY(512) DEFAULT NULL COMMENT 'Encrypted at application layer',
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_creator       PRIMARY KEY (creator_id),
    CONSTRAINT uq_creator_email UNIQUE (email),
    CONSTRAINT ck_creator_email CHECK (email LIKE '%_@_%.__%')
) COMMENT 'Rights holders who earn royalties';

CREATE TABLE content (
    content_id   INT AUTO_INCREMENT,
    title        VARCHAR(255) NOT NULL,
    content_type ENUM('AUDIO','VIDEO','IMAGE','TEXT','PODCAST') NOT NULL,
    genre        VARCHAR(50)  DEFAULT NULL,
    release_date DATE         DEFAULT NULL,
    duration_sec INT          DEFAULT NULL,
    `language`   CHAR(3)      DEFAULT NULL COMMENT 'ISO 639-3',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_content          PRIMARY KEY (content_id),
    CONSTRAINT ck_content_duration CHECK (duration_sec IS NULL OR duration_sec > 0)
) COMMENT 'Licensable works';

CREATE TABLE ownership (
    creator_id           INT          NOT NULL,
    content_id           INT          NOT NULL,
    ownership_percentage DECIMAL(5,2) NOT NULL,
    `role`               ENUM('PRIMARY_ARTIST','FEATURED_ARTIST','COMPOSER',
                              'LYRICIST','PRODUCER','PUBLISHER','DIRECTOR') NOT NULL,

    CONSTRAINT pk_ownership   PRIMARY KEY (creator_id, content_id),
    CONSTRAINT fk_own_creator FOREIGN KEY (creator_id) REFERENCES creator(creator_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_own_content FOREIGN KEY (content_id) REFERENCES content(content_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_own_pct CHECK (ownership_percentage > 0 AND ownership_percentage <= 100)
) COMMENT 'Split of rights in a work between creators';

CREATE TABLE license (
    license_id   INT AUTO_INCREMENT,
    platform_id  INT          NOT NULL,
    content_id   INT          NOT NULL,
    license_type ENUM('EXCLUSIVE','NON_EXCLUSIVE','SUBLICENSABLE') NOT NULL,
    start_date   DATE         NOT NULL,
    end_date     DATE         DEFAULT NULL COMMENT 'NULL means perpetual',
    royalty_rate DECIMAL(6,4) NOT NULL COMMENT 'Fraction, 0.0000 to 1.0000',
    currency     CHAR(3)      NOT NULL,
    status       ENUM('DRAFT','ACTIVE','SUSPENDED','EXPIRED','TERMINATED') NOT NULL DEFAULT 'DRAFT',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_license      PRIMARY KEY (license_id),
    CONSTRAINT fk_lic_platform FOREIGN KEY (platform_id) REFERENCES platform(platform_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lic_content  FOREIGN KEY (content_id) REFERENCES content(content_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_lic_rate  CHECK (royalty_rate >= 0 AND royalty_rate <= 1),
    CONSTRAINT ck_lic_dates CHECK (end_date IS NULL OR end_date > start_date)
) COMMENT 'Grant of rights in one work to one platform';

CREATE TABLE license_territory (
    license_id INT        NOT NULL,
    territory  VARCHAR(3) NOT NULL COMMENT 'ISO alpha-2, or WW for worldwide',

    CONSTRAINT pk_lic_terr PRIMARY KEY (license_id, territory),
    CONSTRAINT fk_lic_terr FOREIGN KEY (license_id) REFERENCES license(license_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT 'Territories covered by a licence (1NF split)';

CREATE TABLE usage_record (
    usage_id         INT AUTO_INCREMENT,
    license_id       INT           NOT NULL,
    usage_date       DATE          NOT NULL,
    usage_type       ENUM('STREAM','DOWNLOAD','VIEW','BROADCAST','SYNC') NOT NULL,
    quantity         BIGINT        NOT NULL,
    gross_revenue    DECIMAL(14,2) NOT NULL,
    currency         CHAR(3)       NOT NULL,
    source_batch_ref VARCHAR(100)  NOT NULL COMMENT 'Report file identifier (MongoDB report _id)',
    ingested_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usage         PRIMARY KEY (usage_id),
    CONSTRAINT fk_usage_license FOREIGN KEY (license_id) REFERENCES license(license_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_usage_batch   UNIQUE (license_id, usage_date, usage_type, source_batch_ref),
    CONSTRAINT ck_usage_qty     CHECK (quantity > 0),
    CONSTRAINT ck_usage_rev     CHECK (gross_revenue >= 0)
) COMMENT 'Consumption reported by a platform against a licence';

CREATE TABLE payment (
    payment_id      INT AUTO_INCREMENT,
    creator_id      INT           NOT NULL,
    payment_date    DATE          NOT NULL,
    amount          DECIMAL(14,2) NOT NULL,
    currency        CHAR(3)       NOT NULL,
    method          ENUM('BANK_TRANSFER','UPI','PAYPAL','WIRE','CHEQUE') NOT NULL,
    status          ENUM('PENDING','PROCESSING','COMPLETED','FAILED','REVERSED') NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(100)  DEFAULT NULL,

    CONSTRAINT pk_payment     PRIMARY KEY (payment_id),
    CONSTRAINT fk_pay_creator FOREIGN KEY (creator_id) REFERENCES creator(creator_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_pay_txn     UNIQUE (transaction_ref),
    CONSTRAINT ck_pay_amt     CHECK (amount > 0)
) COMMENT 'Disbursement to a creator, settling one or more royalty lines';

CREATE TABLE royalty (
    royalty_id                   INT AUTO_INCREMENT,
    usage_id                     INT           NOT NULL,
    creator_id                   INT           NOT NULL,
    payment_id                   INT           DEFAULT NULL,
    calculated_amount            DECIMAL(14,2) NOT NULL,
    currency                     CHAR(3)       NOT NULL,
    rate_applied                 DECIMAL(6,4)  NOT NULL COMMENT 'Licence rate at calculation time',
    ownership_percentage_applied DECIMAL(5,2)  NOT NULL COMMENT 'Split at calculation time',
    calculation_date             DATE          NOT NULL,
    period_start                 DATE          NOT NULL,
    period_end                   DATE          NOT NULL,

    CONSTRAINT pk_royalty      PRIMARY KEY (royalty_id),
    CONSTRAINT fk_roy_usage    FOREIGN KEY (usage_id) REFERENCES usage_record(usage_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_roy_creator  FOREIGN KEY (creator_id) REFERENCES creator(creator_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_roy_payment  FOREIGN KEY (payment_id) REFERENCES payment(payment_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_royalty_line UNIQUE (usage_id, creator_id),
    CONSTRAINT ck_roy_amt      CHECK (calculated_amount >= 0),
    CONSTRAINT ck_roy_rate     CHECK (rate_applied >= 0 AND rate_applied <= 1),
    CONSTRAINT ck_roy_pct      CHECK (ownership_percentage_applied > 0 AND ownership_percentage_applied <= 100),
    CONSTRAINT ck_roy_period   CHECK (period_end >= period_start)
) COMMENT 'Calculated earning of one creator from one usage record';

-- Login accounts. Roles: ADMIN, CREATOR (a CREATOR is linked to a creator row)
CREATE TABLE app_user (
    user_id       INT AUTO_INCREMENT,
    email         VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL COMMENT 'bcrypt hash',
    `role`        ENUM('ADMIN','CREATOR') NOT NULL,
    creator_id    INT          DEFAULT NULL,

    CONSTRAINT pk_app_user       PRIMARY KEY (user_id),
    CONSTRAINT uq_app_user_email UNIQUE (email),
    CONSTRAINT fk_user_creator   FOREIGN KEY (creator_id) REFERENCES creator(creator_id),
    CONSTRAINT ck_user_role      CHECK ((`role` = 'ADMIN' AND creator_id IS NULL)
                                     OR (`role` = 'CREATOR' AND creator_id IS NOT NULL))
) COMMENT 'Application users';

-- ALTER
ALTER TABLE content ADD COLUMN synopsis TEXT DEFAULT NULL AFTER `language`;
ALTER TABLE license_territory ADD CONSTRAINT ck_lic_terr CHECK (territory REGEXP '^[A-Z]{2}$');

-- INDEXES
CREATE FULLTEXT INDEX ft_content_search ON content (title, genre, synopsis);
CREATE INDEX idx_license_status       ON license (status);
CREATE INDEX idx_usage_date           ON usage_record (usage_date);
CREATE INDEX idx_royalty_creator_paid ON royalty (creator_id, payment_id);
