const SECONDS_PER_DAY = 24 * 60 * 60;

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

export function parseLocalIntervalHours(value) {
  if (!value) return null;

  const intervalHours = Number(value);
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    throw new Error("local lens interval override must be a positive hour value");
  }

  return intervalHours;
}

export function parseScheduleTime(scheduleTime) {
  const [hoursPart = "0", minutesPart = "0", secondsPart = "0"] =
    String(scheduleTime).split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new Error(`Invalid schedule_time: ${scheduleTime}`);
  }

  return hours * 60 * 60 + minutes * 60 + seconds;
}

export function getLocalDateParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value ?? "0";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    hour: Number(getPart("hour")) % 24,
    minute: Number(getPart("minute")),
    second: Number(getPart("second"))
  };
}

function dayOrdinalFromLocalParts(parts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

function localDateFromDayOrdinal(dayOrdinal) {
  const date = new Date(dayOrdinal * 86_400_000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function getLocalIntervalSlotKey({ date, timezone, scheduleTime, intervalHours }) {
  const localParts = getLocalDateParts(date, timezone);
  const scheduleSeconds = parseScheduleTime(scheduleTime);
  const intervalSeconds = Math.round(intervalHours * 60 * 60);
  if (intervalSeconds <= 0) {
    throw new Error("local lens interval override must be positive");
  }

  const localSeconds =
    localParts.hour * 60 * 60 + localParts.minute * 60 + localParts.second;

  let anchorDayOrdinal = dayOrdinalFromLocalParts(localParts);
  let secondsSinceAnchor = localSeconds - scheduleSeconds;

  if (secondsSinceAnchor < 0) {
    anchorDayOrdinal -= 1;
    secondsSinceAnchor += SECONDS_PER_DAY;
  }

  const slotOffsetSeconds =
    Math.floor(secondsSinceAnchor / intervalSeconds) * intervalSeconds;
  const slotAbsoluteSeconds = scheduleSeconds + slotOffsetSeconds;
  const slotDayOrdinal =
    anchorDayOrdinal + Math.floor(slotAbsoluteSeconds / SECONDS_PER_DAY);
  const slotSeconds = slotAbsoluteSeconds % SECONDS_PER_DAY;
  const slotDate = localDateFromDayOrdinal(slotDayOrdinal);

  const hours = Math.floor(slotSeconds / 3600);
  const minutes = Math.floor((slotSeconds % 3600) / 60);
  const seconds = slotSeconds % 60;

  return `${pad(slotDate.year, 4)}-${pad(slotDate.month)}-${pad(slotDate.day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function shouldRunLensForLocalInterval({ lens, now, intervalHours }) {
  if (!intervalHours || lens.schedule_type !== "daily" || !lens.is_active) {
    return false;
  }

  if (!lens.last_run_at) {
    return false;
  }

  const timezone = lens.users?.timezone ?? lens.timezone ?? "America/New_York";
  const currentSlotKey = getLocalIntervalSlotKey({
    date: now,
    timezone,
    scheduleTime: lens.schedule_time,
    intervalHours
  });
  const lastRunSlotKey = getLocalIntervalSlotKey({
    date: new Date(lens.last_run_at),
    timezone,
    scheduleTime: lens.schedule_time,
    intervalHours
  });

  return currentSlotKey > lastRunSlotKey;
}
