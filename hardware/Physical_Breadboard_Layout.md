# Physical Breadboard Layout - Visual Guide

Easy-to-follow visual guide for placing components on breadboard with Arduino R4 WiFi.

---

## Overview: What You Have

```
┌──────────────────────┐
│   Arduino R4 WiFi    │
│  (Microcontroller)   │
└──────────────────────┘
         
         ↓ (USB Cable)
         
┌──────────────────┐
│   USB Power      │
│   (Mac/PC)       │
└──────────────────┘
```

---

## Arduino R4 WiFi Pin Layout

Look at your Arduino board - here are the pins you need:

```
FRONT VIEW OF ARDUINO R4 WIFI:

Left Side (pins from top to bottom):
  5V     ← Power (positive)
  GND    ← Ground (negative)
  A0     ← Analog Input 0 (TEMPERATURE)
  A1     ← Analog Input 1 (LIGHT) ← NEW
  A2     ← Analog Input 2 (available)
  ... (other pins)

Right Side (more pins available)
```

---

## Your Components

### 1. LM35 Temperature Sensor

```
This is a 3-pin component that looks like this from the front:

    ╔═══╗
    ║ 1 ║  Pin 1: +5V (Power)
    ║ 2 ║  Pin 2: Signal (goes to A0)
    ║ 3 ║  Pin 3: GND (Ground)
    ╚═══╝
    (metal back)
```

### 2. Phototransistor (Light Sensor)

```
This is a 3-pin component that looks like this:

    ╔═══════╗
    ║   \   ║  Curved back (light-sensitive)
    ║  1 2  ║  Pin 1: GND (shorter leg on flat side)
    ║  3    ║  Pin 2: (middle - bent into case, ignore)
    ║       ║  Pin 3: +5V (longer leg on flat side)
    ╚═══════╝
```

**Important:** Look at the flat side to identify pins 1 and 3.

### 3. Resistors

```
Two 10k Ohm Resistors (brown-black-orange stripe pattern):

    ┌───────┐
    │ ~~~~~ │  All resistors look the same
    └───────┘
    (can connect either direction)

You need TWO of these.
```

---

## Breadboard Layout - STEP BY STEP

### Your Breadboard (typical 400-hole board)

```
                    Columns
     A  B  C  D  E  | F  G  H  I  J
   ┌─────────────────┼──────────────────┐
1  │ •  •  •  •  •   │ •  •  •  •  •    │
2  │ •  •  •  •  •   │ •  •  •  •  •    │
3  │ •  •  •  •  •   │ •  •  •  •  •    │
4  │ •  •  •  •  •   │ •  •  •  •  •    │
5  │ •  •  •  •  •   │ •  •  •  •  •    │
   │                 │                  │
   │  Power Rails    │    Component     │
   │  on sides       │    Space         │
   │                 │                  │
30 │ •  •  •  •  •   │ •  •  •  •  •    │
   ├─────────────────┼──────────────────┤
   │ + - (Red/Blue)  │ (black/red rail) │
   └─────────────────┴──────────────────┘
   
   + = 5V Power (top or bottom rail, usually red)
   - = GND Ground (top or bottom rail, usually blue/black)
```

---

## ASSEMBLY - Follow These Steps

### STEP 1: Prepare the Breadboard Power Rails

Connect Arduino power to breadboard:

```
ARDUINO                           BREADBOARD
  5V ━━━━━━━━━━━━━━━ (red wire) ━━ (+) Power Rail
  GND ━━━━━━━━━━━━ (black wire) ━━ (-) Ground Rail

Example placement:

Breadboard top edge:
┌──────────────────────────────────────┐
│ (+)red  │ (-)black                   │
│  ↑        ↑                          │
│ (from Arduino 5V and GND)            │
└──────────────────────────────────────┘
```

### STEP 2: Place LM35 Temperature Sensor

On the breadboard, place LM35 in columns A, B, C (rows 5-7):

```
BREADBOARD:
        A     B     C     D     E
Row 5   │ [   │ [   │ [   │     │
Row 6   │ LM35    → signal out  │
Row 7   │ ]   │ ]   │ ]   │     │

Pin assignments (looking at sensor flat side toward you):
  Left leg (pin 1)   → Column A  (GND connection below)
  Middle leg (pin 2) → Column B  (SIGNAL - goes to Arduino A0)
  Right leg (pin 3)  → Column C  (5V connection above)
```

**In detail:**

```
        A     B     C     D     E
Row 1  [+5V POWER RAIL connected from Arduino]
Row 2   │     │     │     │
Row 3   │     │     │     │
Row 4   │     │     │     │
Row 5   │ [1] │ [2] │ [3] │  ← LM35 sensor here
Row 6   │     │     │     │
Row 7  [GND GROUND RAIL connected from Arduino]

Connections:
  [1] LM35 left leg  → GND rail (row 7)
  [2] LM35 mid leg   → Arduino A0 (via wire)
  [3] LM35 right leg → 5V rail (row 1)
```

### STEP 3: Place Phototransistor (Light Sensor)

On the breadboard, place it in columns G, H, I (rows 5-7):

```
BREADBOARD:
        G     H     I     J     K
Row 1  [+5V POWER RAIL]
Row 2   │     │     │     │
Row 3   │     │     │     │
Row 4   │     │     │     │
Row 5   │ [3] │ [1] │[10k]│ (phototransistor)
Row 6   │     │  M  │  │  │
Row 7   │[10k]│  │  │  │  │ (resistor going down)
        │ │   │  │  │  │
       GND   A1 pin

Connections for Phototransistor:
  [3] Right leg (Collector)  → Column G (connects to 5V via resistor)
  [M] Middle (Base)           → light-sensitive (no connection)
  [1] Left leg (Emitter)      → GND rail (row 7)
```

### STEP 4: Add Pull-Up Resistor (First 10k)

For the phototransistor signal:

```
        G     H     I
Row 1   │     │     │
        │ +5V │     │ (5V power rail above)
        │  ↑  │     │
Row 2   │ [R1]│     │ ← First 10k resistor placed vertically
        │  │  │     │
Row 3   │  │  │     │
Row 4   │  │  │     │
Row 5   │  │  │[3]  │ ← Phototransistor right leg here
        │  └──┤     │ (connects to resistor)
Row 6   │     │  M  │
Row 7   │[R2] │ [1] │ ← Pull-down resistor + Emitter
        │ │   │     │
       GND   GND

Resistor positions:
  R1 = First 10k between row 2-5, column G (5V to Phototransistor)
  R2 = Second 10k between row 5-7, column G (Phototransistor to GND)
```

### STEP 5: Connect Signal Wire to Arduino

From the signal point (H5) to Arduino pin A1:

```
Signal point (between the two resistors):
                    ↓
        G     H     I
Row 5   │  ○──┤───│  ← Signal from here
        │     │
        └─────────────→ (orange wire) → Arduino A1 pin
```

---

## COMPLETE WIRING DIAGRAM

```
ARDUINO R4 WIFI              BREADBOARD
┌─────────────────┐         ┌──────────────────────┐
│                 │         │ A  B  C  D  E │ F  G  H │
│ 5V ───red ────────────────→(+) POWER rail  │        │
│ GND ──black────────────────→(-) GROUND rail │        │
│ A0 ──yellow────→ [LM35 signal] (column B)  │        │
│ A1 ──orange────→ [Signal junction]     →(H5)│        │
│                 │         │                │        │
└─────────────────┘         │                │        │
                            │ LM35 │ [R1]   │[PT]    │
                            │ [1][2][3]     │[1][M]  │
                            │      ↑        │[3]  [R2]│
                            │      └─ A0    │ ↓       │
                            └──────────────────────────┘
```

---

## Real Photos Reference

When assembling, your setup should look like:

```
Side View:
┌─────────────────┐
│   ARDUINO R4    │  (sitting elevated above breadboard)
│  [USB cable]    │
└──────┬──────────┘
       │ wires
       ↓
    ┌───────────┐
    │BREADBOARD │  (with all components)
    └───────────┘

Top View:
┌──────────────────────────────────────┐
│          BREADBOARD                  │
│  ┌─────────────────────────────────┐ │
│  │ LM35      [space]  Phototrans.  │ │
│  │ [T]                    [R]      │ │
│  │ [E]                    [C]      │ │
│  │ [S]                    [E]      │ │
│  └─────────────────────────────────┘ │
│   Red/Black wires going up to Arduino │
└──────────────────────────────────────┘
```

---

## What Each Wire Does

| Wire Color | From | To | Purpose |
|-----------|------|-----|---------|
| Red | Arduino 5V | Breadboard (+) Power Rail | Powers both sensors |
| Black | Arduino GND | Breadboard (-) Ground Rail | Ground for both sensors |
| Yellow | Arduino A0 | LM35 middle leg | Reads temperature |
| Orange | Arduino A1 | Phototransistor junction | Reads light level |

---

## Testing Your Physical Setup

### Visual Checks

- [ ] Red wire from 5V goes to red (+) rail
- [ ] Black wire from GND goes to black (-) rail
- [ ] LM35 three pins spread across columns (not touching each other)
- [ ] Phototransistor three pins spread across columns (not touching each other)
- [ ] Resistors vertical, connecting power/signal to ground
- [ ] No wires crossing that shouldn't be connected
- [ ] Yellow wire goes to Arduino A0
- [ ] Orange wire goes to Arduino A1

### Power-On Checks

1. Plug Arduino via USB into Mac
2. Open Arduino Serial Monitor (baud 9600)
3. Should see temperature readings updating
4. Cover phototransistor with your hand
5. Light value should increase in Serial output
6. Remove hand → Light value should decrease

---

## Common Mistakes to Avoid

```
Wrong - All three pins in same row (they'll short circuit)
    Row 5: [1][2][3]  ← All touching!

CORRECT - Spread across different rows
    Row 5: [1]
    Row 6:     [2]
    Row 7:         [3]
```

```
Wrong - Resistor not connected to power rail
    │ [R]
    │  │
    (just floating)

CORRECT - Resistor connects power to signal
    +5V ━
        │
       [R]
        │
    Signal point ━ (to Arduino A1)
```

```
Wrong - Wires in wrong power rails
    │ (5V connected to GND rail accidentally)

CORRECT - Color-coded wires
    Red wire → (+) Power rail
    Black wire → (-) Ground rail
```

---

## Summary

Your physical setup should look like:

```
Arduino sitting above breadboard
  │
  ├─ Red wire to (+) top rail
  ├─ Black wire to (-) bottom rail  
  ├─ Yellow wire to LM35 (A0)
  └─ Orange wire to Phototransistor signal (A1)

On breadboard:
  Left side: LM35 temperature sensor
  Right side: Phototransistor with pull-up/pull-down resistors
  Between: Power and ground rails connecting everything
```

That's it! Now you have temperature and light sensors reading simultaneously.
