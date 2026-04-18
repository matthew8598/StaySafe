import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Start the Arduino mock if enabled — posts real sensor readings to the backend
// so you can watch the dashboard update with live data in development.
// Enable via: VITE_MOCK_ARDUINO=true  (also set VITE_USE_MOCK_API=false)
if (import.meta.env.VITE_MOCK_ARDUINO === 'true') {
  import('./api/arduinoMock.js').then(({ startArduinoMock }) => {
    const deviceId = Number(import.meta.env.VITE_ARDUINO_DEVICE_ID) || 1;
    const intervalMs = Number(import.meta.env.VITE_ARDUINO_INTERVAL_MS) || 5_000;
    startArduinoMock(deviceId, intervalMs);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
