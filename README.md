# FINOVA
**YOUR MONEY. YOUR FUTURE.**

FINOVA is a mobile-friendly personal finance dashboard prototype built with HTML, CSS and vanilla JavaScript.

## Current MVP features
- Overview of income, expenses, cash position and savings
- Income and expense transaction records
- Multiple savings pots with deposit/withdrawal tracking
- Gold holdings and manually entered reference price per gram
- Monthly spending budget
- Financial goals and progress tracking
- Six-month cash-flow chart
- JSON backup export and restore
- Responsive glassmorphism interface

## Run locally
Open `index.html` in a modern browser, or serve this folder with any static web server.

## Deploy with GitHub Pages
1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`, then save.
4. Wait for the deployment URL to appear in the Pages section.

## Important data and privacy notes
- This MVP stores records in the current browser using Local Storage.
- Records do **not** sync between devices and are not uploaded to a FINOVA cloud database.
- Clearing browser data may erase local records. Use **Settings → Export backup** regularly.
- Gold reference prices are entered manually; no live market-price feed is connected.
- There is no login, licence validation, payment processing or cloud subscription in this version.
- Do not enter bank passwords, card details, or other highly sensitive credentials.

## Roadmap
1. Improve validation, accessibility and testing.
2. Add a proper local database and reliable import/export migration.
3. Design Supabase authentication, per-user database tables and Row Level Security.
4. Implement secure server-side licence and subscription checks.
5. Add cloud sync with offline queueing and conflict handling.
6. Add automated tests and release workflow.

## Project status
Prototype / MVP. Not financial advice and not connected to banks or brokerages.
