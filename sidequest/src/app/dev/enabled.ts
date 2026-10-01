/**
 * Demo tools exist in development, and in a production build only when
 * explicitly enabled with SIDEQUEST_DEMO=1 (e.g. for a staging demo).
 */
export function demoToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.SIDEQUEST_DEMO === "1";
}
