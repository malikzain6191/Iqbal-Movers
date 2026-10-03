# Iqbal Movers Transport Management System

A React/Vite frontend and Express/MySQL API for managing cities, terminals, fleet, drivers, routes, schedules, bookings, manifests, and reports.

## Requirements

- Node.js 18.11 or newer
- MySQL 8 or newer

## Local setup (PowerShell)

1. Install backend dependencies and create the local environment file:

   ```powershell
   cd backend
   npm install
   Copy-Item .env.example .env
   notepad .env
   ```

2. In `backend/.env`, set the MySQL connection values, a unique `INITIAL_ADMIN_PASSWORD` of at least 12 characters, and a strong random `JWT_SECRET`. For deployment, set `CORS_ORIGINS` to the frontend origin(s). Keep this file private; it is ignored by Git.

3. Create the database schema and initial administrator:

   ```powershell
   npm run db:migrate
   npm run seed:admin
   ```

   The initial login username is `superadmin`; its password is the value you configured locally. Remove `INITIAL_ADMIN_PASSWORD` from `.env` after creating the account.

4. Start the API in this terminal:

   ```powershell
   npm run dev
   ```

5. In a second terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL shown in the terminal. The frontend uses `http://localhost:4000/api/v1` by default; set `VITE_API_URL` if your API runs elsewhere.

For migration behavior, database backups, and additional setup details, see [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md).
