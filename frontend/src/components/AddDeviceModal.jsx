import { useState } from 'react';
import { createDevice } from '../api/api';

const ALL_SENSORS = [
  { key: 'temperature', label: 'Temperature' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'light', label: 'Light' },
];

export default function AddDeviceModal({ onDeviceAdded, onClose }) {
  const [name, setName] = useState('My Safe');
  const [sensors, setSensors] = useState({ temperature: true, humidity: true, light: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleSensor(key) {
    setSensors(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const selectedSensors = Object.keys(sensors).filter(k => sensors[k]);
    if (!selectedSensors.length) {
      setError('Select at least one sensor.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const device = await createDevice(name.trim() || 'My Device', null, selectedSensors);
      onDeviceAdded(device);
    } catch (err) {
      setError(err.message || 'Failed to register device.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Add Device</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="device-name">Device Name</label>
            <input
              id="device-name"
              className="form-input"
              type="text"
              placeholder="My Safe"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="modal__sensor-section">
            <span className="form-label">Sensors</span>
            <div className="sensor-check-group">
              {ALL_SENSORS.map(s => (
                <label
                  key={s.key}
                  className={`sensor-check${sensors[s.key] ? ' sensor-check--on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={sensors[s.key]}
                    onChange={() => toggleSensor(s.key)}
                    className="sensor-check__input"
                  />
                  <span className="sensor-check__label">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="modal__footer">
            <button
              type="button"
              className="modal__cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="auth-btn modal__submit-btn" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
