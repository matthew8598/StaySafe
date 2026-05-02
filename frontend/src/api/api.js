// Entry point — all consumers import from this file unchanged.
// Switch between mock and real implementations via .env:
//   VITE_USE_MOCK_API=true   → mock data (default for development)
//   VITE_USE_MOCK_API=false  → real backend fetch calls
// When VITE_MOCK_ARDUINO=true the Arduino mock is posting real readings to the
// backend, so the real API is always used regardless of VITE_USE_MOCK_API.

export * from "./shared.js";

import * as mock from "./mockApi.js";
import * as real from "./realApi.js";

const ARDUINO_MOCK_ACTIVE = import.meta.env.VITE_MOCK_ARDUINO === "true";
const USE_MOCK = !ARDUINO_MOCK_ACTIVE && import.meta.env.VITE_USE_MOCK_API !== "false";
const impl = USE_MOCK ? mock : real;

export const getRecentReadings    = (...args) => impl.getRecentReadings(...args);
export const getHistoryReadings   = (...args) => impl.getHistoryReadings(...args);
export const getAllSensorReadings  = (...args) => impl.getAllSensorReadings(...args);
export const getReadingsByDateRange = (...args) => impl.getReadingsByDateRange(...args);
export const getProtectionStatus  = (...args) => impl.getProtectionStatus(...args);
export const toggleProtection     = (...args) => impl.toggleProtection(...args);
export const getSensorControls    = (...args) => impl.getSensorControls(...args);
export const toggleSensorEnabled  = (...args) => impl.toggleSensorEnabled(...args);
export const setSensorThresholds  = (...args) => impl.setSensorThresholds(...args);
export const login                = (...args) => impl.login(...args);
export const register             = (...args) => impl.register(...args);
export const getDevices           = (...args) => impl.getDevices(...args);
export const createDevice         = (...args) => impl.createDevice(...args);
export const getAlerts            = (...args) => impl.getAlerts(...args);
export const resolveAlert         = (...args) => impl.resolveAlert(...args);
