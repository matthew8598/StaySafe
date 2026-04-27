# StaySafe Backend

Express.js API pro senzorová data z Arduino R4 WIFI a řízení domácího prostředí.

---

##  Application Architecture (System Topology)

```mermaid
%%{init: {'flowchart': {'curve': 'linear', 'nodeSpacing': 50, 'rankSpacing': 40}, 'fontSize': 11, 'fontFamily': 'arial'}}%%
graph LR
    A["<br/>Arduino R4 WiFi<br/>+ LM35 Sensor<br/>(A0)"]
    
    B["<br/>WiFi<br/>802.11<br/>Primary"]
    C["<br/>USB Serial<br/>9600 baud<br/>Fallback"]
    
    D["<br/>Serial Bridge<br/>Node.js<br/>Port Listener"]
    
    E["<br/>Backend API<br/>Node.js + Express<br/>:3000"]
    
    F["<br/>PostgreSQL<br/>Neon Cloud<br/>sensor_readings"]
    
    G["<br/>Frontend<br/>React/Vite<br/>Dashboard"]
    
    H["<br/>Environment<br/>Dev/Production<br/>.env config"]
    
    A -->|"Every 10s"| B
    A -->|"If WiFi fails"| C
    
    B -->|"POST /api/readings"| E
    C -->|"Listens on USB"| D
    D -->|"Forward to HTTP"| E
    
    E -->|"Temperature<br/>Humidity<br/>Light"| F
    
    F -->|"Stores/Retrieves"| E
    E -->|"GET /api/readings"| G
    E -->|"REST API<br/>JSON"| G
    
    H -.->|"DB_HOST<br/>DB_USER<br/>etc"| E
    
    style A fill:#4CAF50,stroke:#333,color:#fff
    style E fill:#2196F3,stroke:#333,color:#fff
    style F fill:#FF9800,stroke:#333,color:#fff
    style G fill:#9C27B0,stroke:#333,color:#fff
    style D fill:#00BCD4,stroke:#333,color:#fff
    style B fill:#8BC34A,stroke:#333
    style C fill:#FFC107,stroke:#333
```

---

## Backend Process Flow (Data Handling)

```mermaid
%%{init: {'flowchart': {'curve': 'linear', 'nodeSpacing': 40, 'rankSpacing': 30}, 'fontSize': 11, 'fontFamily': 'arial'}}%%
graph LR
    A1["<br/>POST Request<br/>/api/readings<br/>from Arduino"]
    
    A2["<br/>Parse JSON<br/>Validate format<br/>Check required fields"]
    
    A3{"Valid<br/>JSON?"}
    
    A4["<br/>Return 400<br/>Bad Request"]
    
    A5["✓<br/>Extract data<br/>deviceId<br/>temperature<br/>timestamp"]
    
    B1["<br/>Check Device ID<br/>Device exists<br/>in database?"]
    
    B2{"Device<br/>Found?"}
    
    B3["<br/>Return 404<br/>Device not found"]
    
    B4["✓<br/>Valid Device<br/>Proceed"]
    
    C1["<br/>INSERT<br/>INTO sensor_readings<br/>Store data"]
    
    C2["<br/>Return 200 OK<br/>Response with ID"]
    
    D1["<br/>GET /api/readings<br/>Query from Frontend<br/>?deviceId=1&limit=100"]
    
    D2["<br/>Build SQL Query<br/>Filter by deviceId<br/>sensorType<br/>date range"]
    
    D3["<br/>SELECT from DB<br/>Order by timestamp"]
    
    D4["<br/>Return JSON Array<br/>Frontend displays"]
    
    E1["<br/>PATCH /api/controls<br/>Update thresholds<br/>Enable/Disable sensors"]
    
    E2["<br/>Upsert<br/>sensor_controls<br/>table"]
    
    E3["<br/>Return 200<br/>Updated config"]
    
    A1 --> A2 --> A3
    A3 -->|"No"| A4
    A3 -->|"Yes"| A5
    
    A5 --> B1 --> B2
    B2 -->|"No"| B3
    B2 -->|"Yes"| B4
    
    B4 --> C1 --> C2
    
    D1 --> D2 --> D3 --> D4
    
    E1 --> E2 --> E3
    
    style A1 fill:#4CAF50,stroke:#333,color:#fff
    style C2 fill:#8BC34A,stroke:#333,color:#fff
    style D4 fill:#2196F3,stroke:#333,color:#fff
    style E3 fill:#FF9800,stroke:#333,color:#fff
    style A4 fill:#F44336,stroke:#333,color:#fff
    style B3 fill:#F44336,stroke:#333,color:#fff
```

---

## Požadavky

- **Node.js** 16+ (ověřeno na v24.14.0)
- **PostgreSQL** 15+ (lokálně nebo cloud)
- **npm** (obvykle součást Node.js)

## Instalace

### 1. Naklonování repozitáře

```bash
git clone <repo-url>
cd StaySafe/backend
```

### 2. Instalace závislostí

```bash
npm install
```

## Nastavení databáze

### Možnost A: PostgreSQL lokálně (výchozí pro vývoj)

#### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
createdb staysafe
psql staysafe < StaySafe_databaze_postgresql.sql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql << EOF
CREATE DATABASE staysafe;
\c staysafe
\i /path/to/StaySafe_databaze_postgresql.sql
EOF
```

#### Windows
- Stáhni [PostgreSQL installer](https://www.postgresql.org/download/windows/)
- Během instalace si pamatuj heslo pro uživatele `postgres`
- Otevři pgAdmin 4 nebo PowerShell:
```powershell
psql -U postgres
CREATE DATABASE staysafe;
\c staysafe
\i 'C:\path\to\StaySafe_databaze_postgresql.sql'
```

### Možnost B: Neon Cloud (production)

1. Registruj se na [neon.tech](https://neon.tech)
2. Vytvoř nový projekt
3. Zkopíruj connection string
4. Schéma se nainstaluje automaticky (pokyny viz níže)

## Konfigurace prostředí

### Lokální vývoj

Soubor `.env` je již nakonfigurován pro lokální PostgreSQL:

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=<tvůj_os_uživatel>
DB_PASSWORD=
DB_DATABASE=staysafe
```

Pokud máš na PostgreSQL heslo, doplň jej:
```env
DB_PASSWORD=tvoje_heslo
```

### Production (Neon)

Soubor `.env.production` obsahuje Neon credentials. **Necomituj jej!** (je v `.gitignore`)

Pro nasazení na server nastav environment proměnné:
```bash
export DB_HOST=ep-xxxxx.neon.tech
export DB_PORT=5432
export DB_USER=neondb_owner
export DB_PASSWORD=tvůj_neon_token
export DB_DATABASE=neondb
```

## Spuštění

### Vývoj (s hot-reload)

```bash
npm run dev
```

Server poběží na `http://localhost:3000`

### Production

```bash
npm start
```

## API Endpointy

### Senzorová data

**POST** `/api/readings`
- Příjem dat z Arduino
- Body: `{ deviceId, timestamp, temperature|humidity|light }`
- Příklad:
```bash
curl -X POST http://localhost:3000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"deviceId": 1, "timestamp": "2026-04-20T15:30:00Z", "temperature": 22.5}'
```

**GET** `/api/readings`
- Dotaz na uložená měření
- Query: `?deviceId=1&sensorType=temperature&limit=100&from=2026-04-01&to=2026-04-30`

### Řízení sensorů

**GET** `/api/controls?deviceId=1`
- Získání konfigurace prahů

**PATCH** `/api/controls/:deviceId/:sensorType`
- Změna prahů a povolení
- Body: `{ isEnabled: boolean, thresholdMin: number, thresholdMax: number }`

### Upozornění

**GET** `/api/alerts`
- Seznam upozornění

**DELETE** `/api/alerts/:id`
- Smazání upozornění

## Struktura projektu

```
backend/
├── index.js              # Express aplikace
├── db.js                 # PostgreSQL pool a queries
├── routes/               # API endpointy
│   ├── readingsRoutes.js
│   ├── sensorControlsRoutes.js
│   ├── alertRoutes.js
│   └── userRoutes.js
├── controllers/          # Business logika
├── dao/                  # Data access layer
├── middleware/           # Express middleware
├── .env                  # Konfigurace (vývoj) — v .gitignore
├── .env.production       # Konfigurace (production) — v .gitignore
├── package.json
└── StaySafe_databaze_postgresql.sql
```

## Řešení problémů

### Chyba: "Cannot find package 'pg'"
```bash
npm install
```

### Chyba: "database staysafe does not exist"
Zkontroluj, že PostgreSQL běží a schéma je importovaná:
```bash
psql staysafe -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

### Chyba: "role 'user' does not exist"
Uprav `.env` na správný OS uživatel (výstup `whoami`):
```bash
whoami  # např. "filiptomanka"
```
Pak uprav `DB_USER` v `.env`

### PostgreSQL neběží (macOS)
```bash
brew services start postgresql@15
brew services list  # ověř, že PostgreSQL je running
```

## Proměnné prostředí

| Proměnná | Výchozí | Popis |
|----------|---------|-------|
| `NODE_ENV` | development | Režim (development/production) |
| `PORT` | 3000 | Port, na kterém poslouchá API |
| `DB_HOST` | localhost | Hostname PostgreSQL serveru |
| `DB_PORT` | 5432 | Port PostgreSQL |
| `DB_USER` | - | Uživatel PostgreSQL |
| `DB_PASSWORD` | - | Heslo PostgreSQL |
| `DB_DATABASE` | staysafe | Název databáze |

## Údržba

### Zálohování databáze

```bash
# Lokální
pg_dump staysafe > backup.sql

# Neon
PGPASSWORD="token" pg_dump -h ep-xxxxx.neon.tech -U neondb_owner -d neondb > backup.sql
```

### Obnovení z zálohy

```bash
psql staysafe < backup.sql
```

## Kontakt

Pro otázky nebo chyby piš do Slacku nebo vytvoř issue v GitHubu.
