# Module 5 — cache.js (Frontend)

**Responsibility:** Manage localStorage caching for `data.json` and `digest.json` in the React app. Provide a safe, consistent API for reading and writing cached data with TTL enforcement, graceful fallback when localStorage is unavailable, and a manual refresh mechanism.

**Runs in:** Browser only. This is a frontend utility module — it has no server-side role.

**Scope:** Caches only two files — `data.json` (leaderboard) and `digest.json` (weekly digest). Dev AI summaries (Groq on profile click) use React component state only and are explicitly outside this module's scope.

---

## Constants

All keys, timestamps, and TTLs are defined as constants at the top of the file. No raw strings are ever used anywhere in the module — always reference these constants to prevent key mismatch bugs.

```javascript
const CACHE_KEYS = {
  LEADERBOARD:    "pakdev_leaderboard",
  LEADERBOARD_TS: "pakdev_leaderboard_ts",
  DIGEST:         "pakdev_digest",
  DIGEST_TS:      "pakdev_digest_ts"
};

const TTL = {
  LEADERBOARD: 24 * 60 * 60 * 1000,    // 24 hours in ms
  DIGEST:       7 * 24 * 60 * 60 * 1000 // 7 days in ms
};
```

---

## Key Map

An explicit lookup map connects each data key to its timestamp key and its TTL. This is the single source of truth — `set`, `get`, `isStale`, and `clear` all use this map. No string concatenation anywhere.

```javascript
const KEY_MAP = {
  [CACHE_KEYS.LEADERBOARD]: {
    tsKey: CACHE_KEYS.LEADERBOARD_TS,
    ttl:   TTL.LEADERBOARD
  },
  [CACHE_KEYS.DIGEST]: {
    tsKey: CACHE_KEYS.DIGEST_TS,
    ttl:   TTL.DIGEST
  }
};
```

If a key is passed to any function that is not in `KEY_MAP`, log a warning and return null / no-op. Never silently operate on an unknown key.

---

## localStorage Safety Wrapper

All localStorage operations are wrapped in a try/catch. localStorage can throw in:
- Private/incognito browsing mode on some browsers
- Safari with ITP (Intelligent Tracking Prevention)
- When storage quota is exceeded (~5-10MB per origin)

If localStorage is unavailable, all cache operations silently return null or no-op. The app falls back to always fetching fresh data — degraded performance but no crash.

```javascript
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // silent no-op
  }
}
```

---

## API

### `get(cacheKey)`

Returns cached data if it exists and is within TTL. Returns `null` if cache is missing, expired, or localStorage is unavailable.

```
input:  cacheKey — one of CACHE_KEYS.LEADERBOARD or CACHE_KEYS.DIGEST
output: parsed data object | null
```

Logic:
1. Look up `tsKey` and `ttl` from `KEY_MAP[cacheKey]` — if not found, log warning and return null
2. Read timestamp via `safeGet(tsKey)`
3. If timestamp missing → return null
4. Calculate age: `Date.now() - Number(timestamp)`
5. If age exceeds `ttl` → return null (stale)
6. Read data via `safeGet(cacheKey)`
7. If data missing → return null
8. Parse JSON — if unparseable → return null
9. Return parsed data object

---

### `set(cacheKey, data)`

Stores data in localStorage with the current timestamp.

```
input:  cacheKey — one of CACHE_KEYS.LEADERBOARD or CACHE_KEYS.DIGEST
        data     — the parsed object to cache (not a string)
output: boolean — true if both writes succeeded, false otherwise
```

Logic:
1. Look up `tsKey` from `KEY_MAP[cacheKey]` — if not found, log warning and return false
2. Serialize `data` to JSON string
3. Write serialized string via `safeSet(cacheKey, serialized)`
4. Write `String(Date.now())` via `safeSet(tsKey, timestamp)`
5. Return true only if both writes returned true — false otherwise

---

### `isStale(cacheKey)`

Returns true if the cache for this key is missing or expired. Returns true if localStorage is unavailable.

```
input:  cacheKey — one of CACHE_KEYS.LEADERBOARD or CACHE_KEYS.DIGEST
output: boolean — true if stale or missing, false if fresh
```

**Distinct from `get`:** `isStale` only checks the timestamp — it does not read or parse the data blob. Used when you want to decide whether to fetch before committing to a full read.

Logic:
1. Look up `tsKey` and `ttl` from `KEY_MAP[cacheKey]` — if not found, return true
2. Read timestamp via `safeGet(tsKey)`
3. If timestamp missing → return true
4. Calculate age: `Date.now() - Number(timestamp)`
5. Return `age > ttl`

---

### `clear(cacheKey)`

Clears a specific cache entry and its paired timestamp entry.

```
input:  cacheKey — one of CACHE_KEYS.LEADERBOARD or CACHE_KEYS.DIGEST
output: void
```

Logic:
1. Look up `tsKey` from `KEY_MAP[cacheKey]` — if not found, log warning and return
2. Call `safeRemove(cacheKey)`
3. Call `safeRemove(tsKey)`

---

### `clearAll()`

Clears all PakDev Index cache entries. Used by the manual refresh button.

```
input:  none
output: void
```

Logic:
1. Iterate over all keys in `KEY_MAP`
2. Call `safeRemove(cacheKey)` for each data key
3. Call `safeRemove(tsKey)` for each timestamp key

Does not blindly wipe all of localStorage — only removes keys defined in `KEY_MAP`. This is safe in development environments where other apps may share the same origin.

---

## Usage in the App

### On page load — Leaderboard

```javascript
const cached = cache.get(CACHE_KEYS.LEADERBOARD);
if (cached) {
  renderLeaderboard(cached);
} else {
  const fresh = await fetch('/pakdev-index/data.json').then(r => r.json());
  cache.set(CACHE_KEYS.LEADERBOARD, fresh);
  renderLeaderboard(fresh);
}
```

### On page load — Digest

```javascript
const cached = cache.get(CACHE_KEYS.DIGEST);
if (cached) {
  renderDigest(cached);
} else {
  const fresh = await fetch('/pakdev-index/digest.json').then(r => r.json());
  cache.set(CACHE_KEYS.DIGEST, fresh);
  renderDigest(fresh);
}
```

### Manual refresh button

```javascript
function handleRefresh() {
  cache.clearAll();
  window.location.reload();
}
```

---

## Storage Size Awareness

- `data.json` — estimated 300–500KB minified for 300 devs (matches Module 4 estimate)
- `digest.json` — estimated 5–10KB
- Total cache footprint — approximately 310–510KB

localStorage limit is typically 5–10MB per origin. The cache footprint is well within safe limits. If a future version expands to 1000+ devs, revisit this estimate.

---

## Error Handling Summary

| Scenario | Behaviour |
|---|---|
| localStorage unavailable (private mode, Safari ITP) | All operations silently no-op or return null — app fetches fresh data |
| Storage quota exceeded on `set` | `safeSet` returns false, `set` returns false, app continues with fresh data in memory |
| Cached data is corrupt JSON (unparseable) | `get` returns null — app fetches fresh data |
| Timestamp missing for an existing data entry | `get` and `isStale` return null/true — app fetches fresh data |
| Unknown cacheKey passed to any function | Log warning, return null or no-op — do not crash |
| `clearAll` called with no cached data | No-op — does not crash |