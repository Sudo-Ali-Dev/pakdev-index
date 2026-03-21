# Module 2 — score.js

**Responsibility:** Take the pre-filtered, pre-validated raw activity data array from Module 1, calculate a composite score for each developer, assign ranks, and return a sorted ranked array ready for write-json.

---

## Critical Assumption — Input Is Pre-Filtered

Module 2 receives data that has **already been filtered and cleaned by Module 1**. Specifically:

- All fake and inactive accounts have already been removed (Step 6 of Module 1)
- All accounts with `events_90d: false` have already been removed (Step 6 of Module 1)
- All fields are already extracted and present

**Module 2 must NOT re-filter the input array for any reason.** Its only responsibility is scoring, ranking, and returning. Any filtering logic belongs in Module 1.

---

## Input

Receives the full raw activity data array output from Module 1. Each entry is guaranteed to contain:

```json
{
  "username": "example-dev",
  "followers": 340,
  "public_repos": 42,
  "created_at": "2019-04-12T10:00:00Z",
  "events_30d": 67,
  "total_stars": 890
}
```

---

## Step 1 — Null Safety Check

Before scoring, validate every field used in the formula. If any field is `null`, `undefined`, or `NaN`, replace with `0`. Do not crash — log the missing field and username, then continue.

```
total_stars     → default 0 if missing
events_30d      → default 0 if missing
followers       → default 0 if missing
public_repos    → default 0 if missing
created_at      → if missing, skip age penalty and treat as established account
```

---

## Step 2 — Scoring Formula

```
SCORE =
  min(total_stars, 2000) × 2       →  stars contribution (capped at 2000)
+ events_30d × 3                   →  recent activity
+ followers × 1                    →  community recognition
+ public_repos × 0.5               →  output volume
```

### Why stars are capped at 2000

Without a cap, a developer with one viral repo (10,000+ stars) permanently outranks every active contributor regardless of recent work. Capping at 2,000 means stars still matter — but recent activity can meaningfully compete. This keeps the leaderboard about current work, not historical luck.

### Why these weights

| Signal | Weight | Reasoning |
|---|---|---|
| total_stars (capped at 2000) | ×2 | Impact of work — bounded so it does not dominate |
| events_30d | ×3 | Highest weight — rewards consistent recent contributors |
| followers | ×1 | Community recognition — passive signal, low weight |
| public_repos | ×0.5 | Output volume — quantity alone should not rank highly |

---

## Step 3 — Age Penalty

If the developer's account was created less than **6 months ago**, multiply their final score by **0.5**.

```
account_age_days = (today - created_at) in days
if account_age_days < 180:
    score = score × 0.5
    age_penalty_applied = true
else:
    age_penalty_applied = false
```

**Why:** Reduces the ranking of new or potentially fake accounts without excluding them entirely. They can still appear on the leaderboard — just ranked lower until they establish a track record.

---

## Step 4 — Assign Ranks

Sort the full array by score **descending**. Assign `rank` as a 1-based integer position in the sorted array.

```
rank 1 → highest score
rank 2 → second highest
...
rank N → lowest score
```

**Tie handling:** If two developers have identical scores, sort alphabetically by username as a tiebreaker. This ensures consistent, deterministic ordering on every run.

---

## Output

Returns a sorted ranked array. Each entry contains all original Module 1 fields plus the following computed fields:

```json
{
  "rank": 1,
  "username": "example-dev",
  "name": "Ahmed Khan",
  "avatar_url": "https://avatars.githubusercontent.com/...",
  "bio": "Python dev building AI tools",
  "location": "Lahore",
  "followers": 340,
  "following": 120,
  "public_repos": 42,
  "created_at": "2019-04-12T10:00:00Z",
  "events_30d": 67,
  "events_90d": true,
  "repos_active_7d": ["repo-name-1", "repo-name-2"],
  "digest_repos": [
    { "owner": "example-dev", "name": "repo-name-1", "description": "...", "stars": 45, "language": "Python", "url": "..." },
    { "owner": "example-dev", "name": "repo-name-2", "description": "...", "stars": 12, "language": "JavaScript", "url": "..." }
  ],
  "total_stars": 890,
  "top_repos": [
    { "name": "repo1", "description": "...", "stars": 400, "url": "...", "language": "Python" },
    { "name": "repo2", "description": "...", "stars": 300, "url": "...", "language": "JavaScript" },
    { "name": "repo3", "description": "...", "stars": 190, "url": "...", "language": "Python" }
  ],
  "top_languages": ["Python", "JavaScript", "TypeScript"],
  "tags": [],
  "score": 2341,
  "age_penalty_applied": false
}
```

**Note on `tags`:** Left as empty array `[]` here. Tags are populated by `tags.js` (Module 6) which runs as the next step before writing. Module 2 does not compute tags.

**Note on `digest_repos`:** Passed through unchanged from Module 1. Module 2 does not modify it. It is stored in `data.json` by Module 4 and read by Module 3 for the weekly digest.

---

## Error Handling Summary

| Scenario | Behaviour |
|---|---|
| Any scoring field is null or undefined | Default to 0, log the field and username, continue |
| `created_at` is missing | Skip age penalty, set `age_penalty_applied: false`, treat as established account |
| Score calculation produces NaN | Set score to 0, log the username |
| Empty input array | Return empty array — do not crash |