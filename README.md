# Digital Content Licensing, Royalty Tracking & Revenue Distribution Platform

DBMS Level 3 Project. The project uses MySQL for licences, ownership, usage, royalties and payments, and MongoDB for raw platform usage reports. The web interface is built with Next.js.

Content platforms (streaming, social video, download stores, radio) license works from creators. Each platform reports usage. The system calculates each creator's royalty from the licence rate and their ownership share, then pays it out.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend  | Next.js Route Handlers (`app/api/*`) |
| SQL      | MySQL 8.0 |
| NoSQL    | MongoDB 6+ |
| Auth     | bcrypt password hashes + JWT in an httpOnly cookie, roles **ADMIN** and **CREATOR** |

## Project structure

```
database/mysql/
  01_schema.sql              DROP / CREATE / ALTER, PK, FK, CHECK, UNIQUE, indexes, FULLTEXT
  02_views.sql               views
  03_functions_procedures.sql  stored function + procedures (transactions)
  04_triggers.sql            triggers
  05_seed.sql                sample data
  06_queries.sql             important queries (JOIN, GROUP BY, HAVING, subqueries, ...)
scripts/
  setup-mysql.mjs            runs the SQL files and creates login users
  setup-mongo.mjs            creates the MongoDB collection, validator, indexes and seed data
  run-sql-tests.mjs          database test cases -> docs/TEST_RESULTS.md
lib/                         DB connections, auth, usage-report ingestion
app/api/                     backend API
app/(app)/                   pages
docs/                        ER diagram, relational schema, DDL, documentation, test results
```

## Setup

Prerequisites: Node.js 20+, MySQL 8.0, and MongoDB (local install or a free Atlas cluster).

```bash
git clone https://github.com/sriyayc/Digital-Content-Licensing-Royalty-Tracking-Revenue-Distribution-Platform.git
cd Digital-Content-Licensing-Royalty-Tracking-Revenue-Distribution-Platform
npm install

cp .env.example .env.local      # then edit .env.local with your MySQL password / MongoDB URI / JWT secret

npm run db:setup                # creates and seeds MySQL (royalty_db) and MongoDB (royalty_nosql)
npm run test:db                 # optional: runs the database test cases
npm run dev                     # http://localhost:3000
```

Database credentials are read only from environment variables (`.env.local`). The file is git-ignored.

## Demo logins

Password for all accounts: `Password@123`

| Role    | E-mail |
|---------|--------|
| Admin   | admin@royalty.example.com |
| Creator | aarav@creators.example.com |
| Creator | band@monsoon.example.com |
| Creator | finance@lumen.example.com |

**Admin** can add works and ownership splits, create licences and change their status, submit usage reports, run royalty calculation, create payouts and update payment status.
**Creator** can see their earnings, their works, their licences, royalty lines and payments.

## Demo flow

1. Log in as Admin. The **Dashboard** shows totals and two views.
2. **Usage reports**: submit the sample report. The raw JSON goes into MongoDB, and valid lines go into MySQL. Line 3 is rejected because licence 8 belongs to a different platform.
3. **Royalties**: calculate for 2026-07-01 to 2026-10-31. This calls the stored procedure.
4. **Payments**: click *Pay* for a creator to run the payout procedure. Set a payment to FAILED and the trigger releases its royalty lines.
5. **Content**: add a work with splits totalling over 100%, and the trigger rejects it. Search uses the FULLTEXT index.
6. Log in as a Creator to see only that creator's own data.

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for the full project documentation.
