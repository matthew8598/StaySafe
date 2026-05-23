# Rýchly Setup - Arduino R4 WIFI

**IP Backend:** `192.168.0.82:3000` ✓ (už nastavená v sketchi)

## Krok 1: Inštalácia Arduino IDE

1. Stáhni [Arduino IDE 2.0](https://www.arduino.cc/en/software)
2. Instaluj a spusti

## Krok 2: Inštalácia knižnice ArduinoJson

1. Arduino IDE → `Sketch` → `Include Library` → `Manage Libraries`
2. Vyhľadaj `ArduinoJson`
3. Instaluj `ArduinoJson by Benoit Blanchon` (verzia 6.x)

## Krok 3: Príprava sketchu

1. Otvor `StaySafe_R4_WIFI.ino` v Arduino IDE
2. **Uprav iba tieto dva riadky:**

```cpp
// Riadok 15:
char ssid[] = "TVOJA_WIFI_SSID";

// Riadok 16:
char pass[] = "TVOJE_WIFI_HESLO";
```

Zvyšok je OK (IP adresa je už nastavená na `192.168.0.82`)

## Krok 4: Nahratie do Arduino

1. Pripoj Arduino R4 WIFI kabelem USB
2. Arduino IDE: 
   - `Tools` → `Board` → `Arduino R4 WIFI`
   - `Tools` → `Port` → Vyber svoj port
3. Klikni **Upload** (Ctrl+U)
4. Čakaj na `Done uploading`

## Krok 5: Testovanie

1. Arduino IDE: `Tools` → `Serial Monitor` (Ctrl+Shift+M)
2. Nastav **9600 baud rate** (dole vpravo)
3. Mali by si vidieť:

```
=== StaySafe Arduino R4 WIFI ===
Initializing...
[WiFi] Připojuji se na: TVOJA_WIFI_SSID
...[WiFi] ✓ Připojeno!
[WiFi] IP: 192.168.0.XX
[Senzor] Teplota: 22.35°C
[HTTP] Připojuji se na server: 192.168.0.82:3000
[HTTP] ✓ Připojeno, odesílám data...
[JSON] {"deviceId":1,"timestamp":"2026-04-20T14:50:14Z","temperature":22.35}
[HTTP] ✓ Zařízení odpojeno
```

## Krok 6: Ověření v backendu

V termináli tvého počítače:

```bash
# Zobraz poslané dáta
curl http://localhost:3000/api/readings?deviceId=1

# Výstup (JSON s teplotou):
[{"id":1,"deviceId":1,"sensorType":"temperature","value":"22.35","recordedAt":"2026-04-20T14:50:14Z","createdAt":"2026-04-20T15:00:00Z"}]
```

## Když se něco neudělá:

| Problem | Řešení |
|---------|--------|
| Arduino se nedetekuje | Instaluj [CH340 driver](https://sparks.gogo.co.nz/ch340.html) |
| WiFi se nepřipojuje | Zkontroluj SSID a heslo (rozlišuje velká/malá písmena!) |
| Backend connection failed | Zkontroluj, zda backend běží: `npm start` v `backend/` |
| Žádná data v databázi | Zkontroluj deviceId v DB: `psql staysafe -c "SELECT * FROM devices;"` |

## Tips:

- **WiFi heslo:** Pokud máš speciální znaky (`&`, `"`, `'`), obal je do složených závorek: `pass = "heslo@123"`
- **Více sensorů:** Uprav `const char* SENSOR_TYPE = "humidity"` na dalších sketchech
- **Interval:** Změň `const int SEND_INTERVAL = 10000;` pro delší/kratší intervaly (v milisekundách)

---

**Máš připraveno?** Jakmile uploaduješ, měl by si vidět dáta v Serial Monitoru! 🚀
