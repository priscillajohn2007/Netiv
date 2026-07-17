# Netiv Backend

Node.js + Express backend for the Netiv civic issue reporter. Handles:
- User accounts (register/login, JWT-based sessions)
- Report submission (photo + category + location + description)
- Actually emailing the letter to GVMC, with the photo attached (fixes the mailto limitation from the frontend prototype)
- Reference numbers + a local database of every report

Database: SQLite (a single `netiv.db` file, created automatically — no separate database server to install).

## 1. Install

```bash
cd netiv-backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `JWT_SECRET` — any long random string
- `EMAIL_USER` / `EMAIL_PASS` — a Gmail address + an **App Password** (instructions are in `.env.example`). This is the account Netiv sends *from*.
- `GVMC_EMAIL` — already set to GVMC's public grievance address, change if you have a better one.

## 3. Run

```bash
npm run dev
```

Server starts at `http://localhost:4000`. You should see:
```
Netiv backend running at http://localhost:4000
```

## 4. Test it

**Register a user:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"9999999999","password":"pass1234"}'
```
This returns a `token` — copy it for the next steps.

**Submit a report (with a photo):**
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "categoryId=pothole" \
  -F "categoryName=Potholes & road damage" \
  -F "deptName=Executive Engineer (Roads), GVMC" \
  -F "description=Deep pothole near the bus stop" \
  -F "lat=17.6868" \
  -F "lng=83.2185" \
  -F "name=Test User" \
  -F "phone=9999999999" \
  -F "photo=@/path/to/a/photo.jpg"
```
If email is configured correctly, this sends the letter (with photo attached) to `GVMC_EMAIL` and CCs the logged-in user's email, and returns a `referenceNo` like `Netiv-20260716-A1B2C3`.

**List your reports:**
```bash
curl http://localhost:4000/api/reports -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Endpoints summary

| Method | Path                | Auth | Purpose |
|--------|---------------------|------|---------|
| POST   | /api/auth/register  | no   | Create account, returns token |
| POST   | /api/auth/login     | no   | Log in, returns token |
| GET    | /api/auth/me        | yes  | Current user info |
| POST   | /api/reports        | yes  | Submit a report (multipart, `photo` field) |
| GET    | /api/reports        | yes  | List your own reports |
| GET    | /api/reports/:id    | yes  | Get one report |

## Next step: connect the frontend

The frontend prototype currently uses `mailto:` and `wa.me` links directly. To use this backend instead:
1. Add a login/register screen to the frontend (calls `/api/auth/*`, stores the returned token).
2. On "Generate official letter", instead of just previewing text, `POST` the form data + photo file to `/api/reports` with `Authorization: Bearer <token>`.
3. Show the returned `referenceNo` to the user as confirmation.

## About auto-filling the actual GVMC portal

GVMC's own online complaint form (`gvmc.gov.in/OnlineRequestReg.htm`) requires the citizen to log into *their* portal (with OTP) and solve a CAPTCHA before submitting — that can't be scripted around, by design. What this backend *can* do is store each report with GVMC's own category/department naming already matched, so a future feature can show the user exactly which dropdown options to pick when they go file it there directly.
