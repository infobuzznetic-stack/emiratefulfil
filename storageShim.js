/*
  This app was originally built to run inside Claude's artifact preview,
  which provides a `window.storage` API automatically.
  Outside Claude (e.g. once deployed live), that API doesn't exist —
  so this shim recreates the same interface using the browser's
  localStorage instead.

  NOTE: this means data is stored per-browser/per-device only, not
  shared across every visitor. For a real multi-user marketplace where
  every seller's data lives in one shared database, replace this shim
  with calls to a real backend (e.g. Supabase or Firebase).
*/
if (typeof window !== "undefined" && !window.storage) {
  const PREFIX = "emiratefulfil:";

  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(PREFIX + key) !== null;
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length));
      }
      return { keys, prefix, shared: false };
    },
  };
}
