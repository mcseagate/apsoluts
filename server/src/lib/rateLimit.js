// A fixed-window counter held in memory. The API runs as one Render instance, so
// this is enough to blunt form floods and token guessing; it resets on restart
// and would need a shared store if the service were ever scaled out.
export function createLimiter({ windowMs, max }) {
  const hits = new Map();
  return {
    // Returns true when the call is allowed, false when the key is over the limit.
    take(key, now = Date.now()) {
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
    reset() {
      hits.clear();
    },
  };
}
