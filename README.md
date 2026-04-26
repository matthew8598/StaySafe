# StaySafe

Inteligentní systém pro monitorování a řízení domácího prostředí pomocí Arduino R4 WIFI.

## Přehled projektu

StaySafe se skládá ze tří částí:

1. **Backend** (Node.js + Express + PostgreSQL) — API pro senzorová data a řízení
2. **Frontend** (React + Vite) — Dashboard pro vizualizaci a kontrolu
3. **Arduino firmware** — Firmware pro Arduino R4 WIFI desku


**Požadavky:**
- Node.js 16+
- PostgreSQL 15+

## Architektura

```
Arduino R4 WIFI
      ↓ (WiFi)
  POST /api/readings
      ↓
  Backend API (Node.js)
      ↓
  PostgreSQL
      ↓
Frontend Dashboard (React)
      ← GET /api/readings
      → POST /api/controls
```

## Databáze

- **Lokálně:** PostgreSQL 15
- **Cloud:** Neon (https://neon.tech)

Viz [Backend README](./backend/README.md) pro setup.

## API Endpointy

```
POST   /api/readings                    # Arduino posílá data
GET    /api/readings?deviceId=1         # Získat měření
GET    /api/controls?deviceId=1         # Konfigurace sensorů
PATCH  /api/controls/:deviceId/:type    # Změnit prahy
GET    /api/alerts                      # Upozornění
DELETE /api/alerts/:id                  # Smazat upozornění
GET    /api/users                       # Správa uživatelů
```

## Vývojový workflow

1. **Backend** běží na portu 3000
2. **Frontend** běží na portu 5173
3. Frontend dělá requesty na `http://localhost:3000`

### Spuštění obého

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

## Konfigurace

### Backend

Vytvoř `.env` v `backend/`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=<tvůj_user>
DB_PASSWORD=<tvé_heslo>
DB_DATABASE=staysafe
```

### Frontend

Frontend se automaticky připojí na `http://localhost:3000`

## Řešení problémů

**Backend nespouští se:**
```bash
cd backend
npm install
npm start
```

**Frontend nespouští se:**
```bash
cd frontend
npm install
npm run dev
```

**PostgreSQL nespouští se (macOS):**
```bash
brew services start postgresql@15
```

**Port již používán:**
- Backend: `npm start -- --port 3001`
- Frontend: `npm run dev -- --port 5174`

## Týmová komunikace

- Chyby a fejčury: GitHub Issues
- Rychlá komunikace: Slack
- Schůzky: pondělí 14:00

## Soubory k ignorování

`.gitignore` již obsahuje:
- `.env*` — všechny config soubory
- `node_modules/`
- `.DS_Store`

**Nikdy** necommituj `.env.production` s production credentials!

## Verze

- Node.js: 16+
- PostgreSQL: 15+
- React: 18+
- Express: 5+

## Kontakt

- Tech Lead: Filip Tomanka
- Slackchannel: #staysafe-dev
