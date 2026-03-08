type LogLevel = "info" | "warn" | "error";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function toJsonValue(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    const record: Record<string, JsonValue> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      record[key] = toJsonValue(nestedValue);
    }
    return record;
  }

  return String(value);
}

function parseLogArgs(args: unknown[]) {
  if (args.length === 0) {
    return { message: "", details: [] as JsonValue[] };
  }

  if (typeof args[0] === "string") {
    return {
      message: args[0],
      details: args.slice(1).map((item) => toJsonValue(item))
    };
  }

  return {
    message: "",
    details: args.map((item) => toJsonValue(item))
  };
}

function createRequestId() {
  return crypto.randomUUID();
}

export function createFunctionLogger(functionName: string, requestId = createRequestId()) {
  const emit = (level: LogLevel, ...args: unknown[]) => {
    const { message, details } = parseLogArgs(args);
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      function: functionName,
      request_id: requestId,
      message,
      details
    };

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }
    if (level === "warn") {
      console.warn(line);
      return;
    }
    console.log(line);
  };

  return {
    requestId,
    info: (...args: unknown[]) => emit("info", ...args),
    warn: (...args: unknown[]) => emit("warn", ...args),
    error: (...args: unknown[]) => emit("error", ...args)
  };
}
