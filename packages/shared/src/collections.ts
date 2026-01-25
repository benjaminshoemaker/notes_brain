export type UpsertPosition = "start" | "end";

export type UpsertByIdOptions<T> = {
  position?: UpsertPosition;
  merge?: (existing: T, incoming: T) => T;
};

export function upsertById<T extends { id: string }>(
  list: readonly T[] | undefined,
  incoming: T,
  options: UpsertByIdOptions<T> = {}
): T[] {
  const position = options.position ?? "start";
  const merge = options.merge;

  if (!list || list.length === 0) {
    return [incoming];
  }

  const existingIndex = list.findIndex((item) => item.id === incoming.id);
  if (existingIndex === -1) {
    return position === "start" ? [incoming, ...list] : [...list, incoming];
  }

  const existing = list[existingIndex];
  if (!existing) {
    return position === "start" ? [incoming, ...list] : [...list, incoming];
  }

  const merged = merge ? merge(existing, incoming) : incoming;
  const remaining = [...list.slice(0, existingIndex), ...list.slice(existingIndex + 1)];

  return position === "start" ? [merged, ...remaining] : [...remaining, merged];
}
