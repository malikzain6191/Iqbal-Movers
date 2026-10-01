# Local database setup

The schema is stored in `migrations/` and tracked in the `schema_migrations` table. `npm run db:migrate` creates the configured database if needed, applies each numbered SQL migration once, and skips migrations already recorded. The initial SQL also uses `CREATE TABLE IF NOT EXISTS` and inserts base roles and permissions without duplicating them, so an interrupted initial setup can be retried.

## First setup on a laptop

1. Install Node.js and MySQL Server. Ensure the MySQL service is running.
2. In PowerShell, go to `backend` and install dependencies:

   ```powershell
   cd path\to\Iqbal-Movers\backend
   npm install
   ```

3. Create the local environment file and enter credentials for a MySQL account that can create databases and tables:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT`. Keep `.env` local; it is ignored by Git.

4. Apply the schema and create the first login:

   ```powershell
   npm run db:migrate
   npm run seed:admin
   ```

   The seed script creates username `superadmin` with its development password `super123`. Change that password immediately after the first login.

5. Start the backend and frontend in separate terminals:

   ```powershell
   npm run dev
   ```

   ```powershell
   cd ..\frontend
   npm install
   npm run dev
   ```

## Later runs and other laptops

- On a laptop that already has this database, run `npm run db:migrate` after pulling changes. Applied migrations are skipped; new numbered migrations are applied once.
- On a newly cloned laptop, follow the first setup steps. The database records are local and are not copied by Git. The migration creates the schema and initial roles/permissions; `npm run seed:admin` creates a login if it does not already exist.
- Never edit an already applied migration to change a database that has it recorded. The initial migration is the recipe for a brand-new database; later schema changes go in a new, numbered file under `migrations/`, for example `002_add_seat_column.sql`. `CREATE TABLE IF NOT EXISTS` only prevents duplicate table creation; it does not update a table that already exists.
- This setup creates an empty database and starter account. It does not transfer bookings, users, or other records from another laptop; use a database backup/restore when you need that data.

## Example: add and populate a `seats` column

Suppose you want to add a `seat_type` column and mark every existing seat as `Regular`:

1. Create `migrations/002_add_seat_type.sql` with:

   ```sql
   ALTER TABLE seats
     ADD COLUMN seat_type VARCHAR(30) NULL;

   UPDATE seats
   SET seat_type = 'Regular'
   WHERE seat_type IS NULL;

   ALTER TABLE seats
     MODIFY COLUMN seat_type VARCHAR(30) NOT NULL;
   ```

   Adding it nullable first lets the migration populate existing rows before requiring a value. Choose a default or backfill value that fits the actual data and application behavior.

2. Update the backend code that reads or writes `seats` to use the new column. Update the frontend too if users need to view or edit it.
3. Commit both the new migration and the code changes, then push them to Git.
4. On each existing laptop, pull the change and run from `backend`:

   ```powershell
   npm run db:migrate
   ```

   On a new laptop, follow the first setup steps; the migration runner applies `001` and then `002` in filename order.

The runner records a migration only after its SQL succeeds. MySQL schema changes are not generally rolled back as a transaction, so if a migration fails partway through, inspect the database before retrying. Fix the unapplied migration or manually reconcile the partial change first; do not edit a migration that has already been recorded as applied. For risky changes, back up the database before applying them.
