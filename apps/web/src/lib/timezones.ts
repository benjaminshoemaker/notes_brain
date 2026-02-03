const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney"
];

export function getDeviceTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTimezoneOptions(): string[] {
  const deviceTimezone = getDeviceTimezone();
  const supportedValues = typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone")
    : undefined;

  const options = (supportedValues && supportedValues.length > 0)
    ? supportedValues
    : FALLBACK_TIMEZONES;

  if (!options.includes(deviceTimezone)) {
    return [deviceTimezone, ...options];
  }

  return options;
}
