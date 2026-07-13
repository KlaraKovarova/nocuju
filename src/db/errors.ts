// Drizzle wraps mysql2 driver errors in DrizzleQueryError with the original
// error as `cause`, so unique-key violations must be detected by walking the
// cause chain rather than reading `code` off the top-level error.
export function isDuplicateEntryError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === "ER_DUP_ENTRY") return true;
    current = candidate.cause;
  }
  return false;
}
