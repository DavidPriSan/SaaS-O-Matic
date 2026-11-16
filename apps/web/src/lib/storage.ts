/**
 * localStorage can throw (private mode, blocked site data, quota). Persistence here is a convenience:
 * failures are swallowed and the app works without it.
 */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not persisted; acceptable by design.
  }
}
