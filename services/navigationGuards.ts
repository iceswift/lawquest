const activeNavigationKeys = new Set<string>();
const lastNavigationByKey = new Map<string, number>();

export function beginGuardedNavigation(
  navigationKey: string,
  cooldownMs = 0,
) {
  const now = Date.now();
  const lastNavigationAt = lastNavigationByKey.get(navigationKey) ?? 0;

  if (activeNavigationKeys.has(navigationKey)) {
    return false;
  }

  if (cooldownMs > 0 && now - lastNavigationAt < cooldownMs) {
    return false;
  }

  activeNavigationKeys.add(navigationKey);
  lastNavigationByKey.set(navigationKey, now);
  pruneNavigationGuards(now, Math.max(cooldownMs, 1000));
  return true;
}

export function endGuardedNavigation(navigationKey: string) {
  activeNavigationKeys.delete(navigationKey);
}

function pruneNavigationGuards(now: number, retentionMs: number) {
  lastNavigationByKey.forEach((lastNavigationAt, navigationKey) => {
    if (now - lastNavigationAt > retentionMs * 3) {
      lastNavigationByKey.delete(navigationKey);
    }
  });
}
