// Entry point — all consumers import from this file unchanged.
// Switch between mock and real implementations via .env:
//   VITE_USE_MOCK_API=true   → mock data (default for development)
//   VITE_USE_MOCK_API=false  → real backend fetch calls

export * from "./shared.js";

import * as mock from "./mockApi.js";
import * as real from "./realApi.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== "false";
const impl = USE_MOCK ? mock : real;

export const getRecentReadings    = (...args) => impl.getRecentReadings(...args);
export const getHistoryReadings   = (...args) => impl.getHistoryReadings(...args);
export const getAllSensorReadings  = (...args) => impl.getAllSensorReadings(...args);
export const getReadingsByDateRange = (...args) => impl.getReadingsByDateRange(...args);
export const getProtectionStatus  = (...args) => impl.getProtectionStatus(...args);
export const toggleProtection     = (...args) => impl.toggleProtection(...args);
export const login                = (...args) => impl.login(...args);
export const register             = (...args) => impl.register(...args);
