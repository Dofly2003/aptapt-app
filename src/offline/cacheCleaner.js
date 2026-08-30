import { cleanExpiredCache } from "./photoStore";

let _started = false;

export function startCacheCleaner() {
  if (_started) return;
  _started = true;

  // Run once on startup (after small delay to not block render)
  setTimeout(async () => {
    const removed = await cleanExpiredCache();
    if (removed > 0) console.log(`[cache] Removed ${removed} expired photos`);
  }, 5000);

  // Run daily
  setInterval(async () => {
    await cleanExpiredCache();
  }, 24 * 60 * 60 * 1000);
}
