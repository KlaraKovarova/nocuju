export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { applyStartupMigrations } = await import("@/db/apply-startup-migrations");
  try {
    await applyStartupMigrations();
  } catch {
    // Already logged; do not block server start — health route surfaces schema state.
  }
}
