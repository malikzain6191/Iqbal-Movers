# Iqbal Travels TMS — React Frontend (dummy API)

## Run it

```bash
npm install
npm run dev
```
Opens at `http://localhost:5173`. Login with one of:
- `superadmin` / `super123`
- `fsd.admin` / `city123`
- `counter1` / `count123`

## Structure

```
src/
  api/          one file per backend module — this is what you'll replace
    client.js       fake network wrapper (delay + {data}/{error} envelope)
    mockDb.js       in-memory data + business logic (mirrors the MySQL schema)
    authApi.js, cityApi.js, fleetApi.js, driverApi.js, routeApi.js,
    scheduleApi.js, bookingApi.js, reportApi.js, userApi.js, auditApi.js
  context/
    AuthContext.jsx   login state, current user, role helper (hasRole)
  routes/
    AppRoutes.jsx     every route + the NAV_ITEMS role-gated sidebar config
    ProtectedRoute.jsx  redirects to /login if not authenticated / wrong role
  components/         Sidebar, Layout, Modal, SeatMap, StatusBadge
  pages/              one file per screen — Dashboard, Cities, Fleet, Drivers,
                       Routes, Schedules, Booking, Manifest, Users, Reports, Audit
  utils/lookups.js    cityName()/vehName()/money()/fmtDT() etc.
```

## Swapping in your real Node/MySQL API

Every page imports functions from `api/*.js` — never from `mockDb.js` or
`client.js` directly. That means switching to your real backend is a
matter of rewriting the *inside* of each function in `api/*.js`, not
touching any page.

Example — `authApi.js` today:
```js
export function login(username, password) {
  return fakeRequest(() => { /* checks DB.users in memory */ });
}
```
becomes:
```js
import http from './client'; // real axios instance, see client.js comment block
export function login(username, password) {
  return http.post('/auth/login', { username, password });
}
```
Same function name, same call sites in `Login.jsx`, same `{ data }` shape
(because that's the envelope your real API docs already define) — nothing
else in the app needs to change.

Suggested order to cut over, matching the build order in the API docs:
1. `authApi.js` (needs your JWT issued and `Authorization` header wired in `client.js`)
2. `cityApi.js`, `fleetApi.js`, `driverApi.js`, `routeApi.js`
3. `scheduleApi.js` (this one matters most — the availability check has to be a real
   server-side query, not client-side array filtering)
4. `bookingApi.js` — **do not** cut this over without your backend enforcing the seat
   lock in a real DB transaction (`SELECT ... FOR UPDATE`); the mock version here only
   simulates that check in JS, which is not safe for concurrent counters.
5. `reportApi.js`, `userApi.js`, `auditApi.js`

## Known simplifications carried over from the HTML demo

- Passenger transfer between schedules (`bookingApi.transferBookingNote`) only logs
  the action — it doesn't move the seat. Wire this to the real
  `POST /bookings/:id/transfer` endpoint from the API docs.
- Reports run against in-memory arrays; once real data volume exists, back these with
  aggregation queries or summary tables, not live joins on every request.
- No pagination on any list yet — add `?page=&per_page=` support to `api/*.js` calls
  once your endpoints return `meta.total`.
