// ═══════════════════════════════════════════════════
// Redis Mock
// In-memory Redis replacement for unit tests
// Usage: vi.mock('@ecommerce/common', () => ({ redis: redisMock }))
// ═══════════════════════════════════════════════════

export function createRedisMock() {
  const store = new Map();

  return {
    get: async (key) => store.get(key) || null,

    set: async (key, value, options = {}) => {
      store.set(key, value);
      if (options.EX) {
        setTimeout(() => store.delete(key), options.EX * 1000);
      }
      return 'OK';
    },

    del: async (...keys) => {
      let deleted = 0;
      keys.forEach((key) => {
        if (store.delete(key)) deleted++;
      });
      return deleted;
    },

    exists: async (key) => (store.has(key) ? 1 : 0),

    expire: async () => 1,

    ttl: async () => -1,

    incr: async (key) => {
      const current = parseInt(store.get(key) || '0', 10);
      const next = current + 1;
      store.set(key, String(next));
      return next;
    },

    hSet: async (key, field, value) => {
      const hash = store.get(key) || {};
      hash[field] = value;
      store.set(key, hash);
      return 1;
    },

    hGet: async (key, field) => {
      const hash = store.get(key) || {};
      return hash[field] || null;
    },

    // Test helpers
    _clear: () => store.clear(),
    _getStore: () => store,
  };
}
