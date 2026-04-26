import { useState, useEffect } from 'react';
import './TemperatureDashboard.css';

const API_BASE = 'http://localhost:3000';
const DEVICE_ID = 1;
const REFRESH_INTERVAL = 5000; // 5 sekund

export default function TemperatureDashboard() {
  const [currentTemp, setCurrentTemp] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Načítej dáta z API
  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);

        // Načítej všechna měření
        const response = await fetch(
          `${API_BASE}/api/readings?deviceId=${DEVICE_ID}&limit=100&sensorType=temperature`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Seřaď by čase (nejnovější prvně)
        const sorted = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
          : [];

        setReadings(sorted);
        setCurrentTemp(sorted.length > 0 ? parseFloat(sorted[0].value) : null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch readings:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Formátuj čas
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="temp-dashboard">
        <div className="temp-loading">Načítávám data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="temp-dashboard">
        <div className="temp-error">Chyba: {error}</div>
      </div>
    );
  }

  return (
    <div className="temp-dashboard">
      {/* ── Velké číslo uprostred ── */}
      <div className="temp-display">
        <div className="temp-value">
          {currentTemp !== null ? currentTemp.toFixed(2) : '—'}
          <span className="temp-unit">°C</span>
        </div>
        <div className="temp-label">Aktuální teplota</div>
        <div className="temp-timestamp">
          {readings.length > 0 && `Poslední měření: ${formatTime(readings[0].recordedAt)}`}
        </div>
      </div>

      {/* ── Tabulka s historií ── */}
      <div className="temp-table-container">
        <h2>Historie měření</h2>
        <table className="temp-table">
          <thead>
            <tr>
              <th>Čas</th>
              <th>Teplota</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading, idx) => (
              <tr key={reading.id || idx}>
                <td className="temp-time">
                  {formatTime(reading.recordedAt)}
                </td>
                <td className="temp-value-cell">
                  {parseFloat(reading.value).toFixed(2)}°C
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
