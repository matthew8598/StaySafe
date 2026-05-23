import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import axios from 'axios';

/**
 * Serial Bridge - Forwards Arduino USB data to Backend
 *
 * Listens for data from Arduino on USB serial port
 * and forwards it to the backend API
 */

const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
const BAUD_RATE = 9600;

let serialPort = null;
let parser = null;

async function findArduinoPort() {
  try {
    const ports = await SerialPort.list();
    console.log('[Serial] Available ports:');
    ports.forEach(port => {
      console.log(`  - ${port.path} (${port.manufacturer || 'Unknown'})`);
    });

    // Look for Arduino port (usually contains 'Arduino' or 'CH340')
    const arduinoPort = ports.find(p =>
      p.manufacturer?.includes('Arduino') ||
      p.manufacturer?.includes('CH340') ||
      p.path.includes('ttyUSB') ||
      p.path.includes('ttyACM') ||
      p.path.includes('cu.usbserial')
    );

    if (arduinoPort) {
      console.log(`[Serial] ✓ Found Arduino on: ${arduinoPort.path}`);
      return arduinoPort.path;
    } else {
      console.log('[Serial] ✗ Arduino not found. Using first available port...');
      return ports[0]?.path || '/dev/ttyUSB0';
    }
  } catch (error) {
    console.error('[Serial] Error listing ports:', error.message);
    return '/dev/ttyUSB0'; // Fallback
  }
}

async function connectSerial(portPath) {
  try {
    serialPort = new SerialPort({ path: portPath, baudRate: BAUD_RATE });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('open', () => {
      console.log(`[Serial] ✓ Connected to ${portPath} at ${BAUD_RATE} baud`);
      console.log('[Serial] Listening for Arduino data...\n');
    });

    parser.on('data', (line) => {
      // Look for lines starting with [USB_DATA]
      if (line.includes('[USB_DATA]')) {
        const jsonStr = line.replace('[USB_DATA]', '').trim();

        try {
          const data = JSON.parse(jsonStr);
          console.log('[Serial] Received:', jsonStr);
          forwardToBackend(data);
        } catch (error) {
          console.error('[Serial] Failed to parse JSON:', jsonStr);
        }
      } else if (line.trim().length > 0) {
        // Print other Arduino debug messages
        console.log('[Arduino]', line);
      }
    });

    serialPort.on('error', (error) => {
      console.error('[Serial] Error:', error.message);
    });

    serialPort.on('close', () => {
      console.log('[Serial] Connection closed');
    });
  } catch (error) {
    console.error('[Serial] Failed to connect:', error.message);
    console.error('[Serial] Make sure Arduino is connected and selected port is correct');
  }
}

async function forwardToBackend(data) {
  try {
    const response = await axios.post(`${BACKEND_URL}/readings`, data);
    console.log(`[Backend] ✓ Data forwarded (ID: ${response.data.id})\n`);
  } catch (error) {
    if (error.response) {
      console.error(`[Backend] ✗ Error ${error.response.status}:`, error.response.data);
    } else {
      console.error('[Backend] ✗ Connection error:', error.message);
    }
    console.log('[Backend] Retrying next cycle...\n');
  }
}

async function start() {
  console.log('═══════════════════════════════════════');
  console.log('  Serial Bridge - Arduino USB Bridge   ');
  console.log('═══════════════════════════════════════\n');

  const portPath = await findArduinoPort();
  await connectSerial(portPath);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Serial] Closing connection...');
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Serial] Closing connection...');
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
  process.exit(0);
});

start();
