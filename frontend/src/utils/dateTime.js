const APP_TIME_ZONE = import.meta.env.VITE_APP_TIME_ZONE;

function createFormatter(options) {
  return new Intl.DateTimeFormat(
    undefined,
    APP_TIME_ZONE ? { ...options, timeZone: APP_TIME_ZONE } : options,
  );
}

const timeFormatter = createFormatter({
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTimeFormatter = createFormatter({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const shortDateTimeFormatter = createFormatter({
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function asDate(value) {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTime(value) {
  const date = asDate(value);
  return date ? timeFormatter.format(date) : "--:--";
}

export function formatDateTime(value) {
  const date = asDate(value);
  return date ? dateTimeFormatter.format(date) : "Invalid date";
}

export function formatShortDateTime(value) {
  const date = asDate(value);
  return date ? shortDateTimeFormatter.format(date) : "--/-- --:--";
}
