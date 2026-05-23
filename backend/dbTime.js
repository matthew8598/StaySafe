const DEFAULT_DB_TIME_ZONE = "UTC";

export const DB_TIME_ZONE = process.env.DB_TIME_ZONE || process.env.APP_TIME_ZONE || DEFAULT_DB_TIME_ZONE;

const formatterCache = new Map();

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function getFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA-u-hc-h23", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }

  return formatterCache.get(timeZone);
}

function getZonedParts(date, timeZone = DB_TIME_ZONE) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getTimeZoneOffsetMs(date, timeZone = DB_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

function wallTimeToInstant(parts, timeZone = DB_TIME_ZONE) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond ?? 0,
  );

  let offsetMs = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let timestampMs = utcGuess - offsetMs;
  const correctedOffsetMs = getTimeZoneOffsetMs(new Date(timestampMs), timeZone);

  if (correctedOffsetMs !== offsetMs) {
    offsetMs = correctedOffsetMs;
    timestampMs = utcGuess - offsetMs;
  }

  const parsed = new Date(timestampMs);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimestampWithoutZone(value) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/,
  );

  if (!match) return null;

  const [
    ,
    year,
    month,
    day,
    hour = "00",
    minute = "00",
    second = "00",
    fraction = "0",
  ] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number((fraction + "000").slice(0, 3)),
  };
}

function coerceInstant(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDbTimestamp(value) {
  const date = coerceInstant(value);
  if (!date) return value;

  const parts = getZonedParts(date, DB_TIME_ZONE);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${pad(date.getMilliseconds(), 3)}`;
}

export function fromDbTimestamp(value) {
  if (value == null) return value;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) return value;

  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = coerceInstant(trimmed);
    return parsed ? parsed.toISOString() : value;
  }

  const wallTime = parseTimestampWithoutZone(trimmed);
  if (!wallTime) {
    const parsed = coerceInstant(trimmed);
    return parsed ? parsed.toISOString() : value;
  }

  const parsed = wallTimeToInstant(wallTime, DB_TIME_ZONE);
  return parsed ? parsed.toISOString() : value;
}