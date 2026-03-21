# Module 4 — write-leaderboard.js

**Responsibility:** Receive the scored and ranked developer array from Module 2, validate it, strip internal pipeline fields, compute metadata, and atomically write the final `data.json` file to the `/public` directory.

**Runs on:** Daily GitHub Actions schedule. Called as the last step in the leaderboard workflow after Module 1 → Module 2 have completed.

**Critical rule:** If input is invalid or empty, the existing `data.json` is never overwritten. Users always see the last successful leaderboard rather than a broken or empty page.

**Git is not handled here.** Committing and pushing `data.json` is the responsibility of the workflow YAML — not this module.

---

## Pipeline Position

```
Module 1 (fetch-devs.js)        → raw activity array (300 devs)
     ↓
Module 2 (score.js)             → scored + ranked array
     ↓
Module 4 (write-leaderboard.js) → writes public/data.json
     ↓
Workflow YAML                   → git commit + push

(In browser, on page load)
Module 6 (tags.js)              → reads top_repos + top_languages from data.json
                                  → computes tags client-side for filter UI
                                  → never written back to server

(Separately, every Sunday)
Module 3 (generate-digest.js)   → reads data.json → calls Groq → writes digest.json
```

**Why Module 6 is not in the server pipeline:** Tags are a display and filtering concern only. They do not affect scoring, ranking, or the digest. The frontend already has `top_repos[].description`, `top_repos[].name`, and `top_languages` inside each dev entry — enough to compute tags accurately client-side. Keeping tags client-side removes a dependency between browser code and the Actions pipeline.

---

## Input

Receives the scored and ranked array directly from Module 2. Each entry contains all Module 1 fields plus Module 2 computed fields. Tags are not present — they are computed client-side by Module 6.

Example entry shape entering Module 4:

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
    { "owner": "example-dev", "name": "repo-name-1", "description": "...", "stars": 45, "language": "Python", "url": "..." }
  ],
  "total_stars": 890,
  "top_repos": [
    { "name": "repo1", "description": "...", "stars": 400, "url": "...", "language": "Python" },
    { "name": "repo2", "description": "...", "stars": 300, "url": "...", "language": "JavaScript" },
    { "name": "repo3", "description": "...", "stars": 190, "url": "...", "language": "Python" }
  ],
  "top_languages": ["Python", "JavaScript", "TypeScript"],
  "score": 2341,
  "age_penalty_applied": false
}
```

---

## Step 1 — Validate Input

Before doing anything else, validate the input array:

- Must be a non-empty array
- Must contain at least 1 entry with a valid `rank` and `score`

If validation fails — abort immediately, log the reason, and do not touch the existing `data.json`.

---

## Step 2 — Strip Internal Pipeline Fields

These fields were used internally during the pipeline but are not needed by the frontend or Module 3. Strip them from every entry before writing:

| Field | Reason for Stripping |
|---|---|
| `events_90d` | Filter flag used only in Module 1 Step 6 — not displayed anywhere |
| `repos_active_7d` | Raw repo name strings — superseded by `digest_repos` which has full metadata |
| `following` | Not displayed on frontend |
| `age_penalty_applied` | Internal scoring detail — not shown to users |

Fields that are **kept:**

| Field | Kept For |
|---|---|
| `rank` | Leaderboard position display |
| `username` | Profile link, identity |
| `name` | Display name |
| `avatar_url` | Profile photo |
| `bio` | Developer card |
| `location` | City filter |
| `followers` | Stats display |
| `public_repos` | Stats display |
| `created_at` | Frontend can display "Joined GitHub in 20XX" |
| `events_30d` | Activity stat display |
| `digest_repos` | Read by Module 3 via `.flatMap(dev => dev.digest_repos \|\| [])` |
| `total_stars` | Stats display + scoring signal |
| `top_repos` | Developer profile card + used by Module 6 for tag computation |
| `top_languages` | Stats display + used by Module 6 for tag computation |
| `score` | Leaderboard sort + display |

---

## Step 3 — Add tags Placeholder

Add `tags: []` to each entry. This is a placeholder that Module 6 fills client-side at runtime in the browser. Writing an empty array ensures the field always exists in the JSON structure — the frontend never has to check if it is missing.

```json
{ ..., "tags": [] }
```

---

## Step 4 — Compute Metadata

Calculate two top-level metadata fields at write time:

```
last_updated  = current UTC timestamp in ISO 8601 format
                example: "2026-03-20T19:00:00Z"

total_devs    = length of the final array
```

---

## Step 5 — Build Final data.json Structure

Assemble the final object:

```json
{
  "last_updated": "2026-03-20T19:00:00Z",
  "total_devs": 287,
  "leaderboard": [
    {
      "rank": 1,
      "username": "example-dev",
      "name": "Ahmed Khan",
      "avatar_url": "https://avatars.githubusercontent.com/...",
      "bio": "Python dev building AI tools",
      "location": "Lahore",
      "followers": 340,
      "public_repos": 42,
      "created_at": "2019-04-12T10:00:00Z",
      "events_30d": 67,
      "digest_repos": [
        { "owner": "example-dev", "name": "repo-name-1", "description": "...", "stars": 45, "language": "Python", "url": "..." }
      ],
      "total_stars": 890,
      "top_repos": [
        { "name": "repo1", "description": "...", "stars": 400, "url": "...", "language": "Python" },
        { "name": "repo2", "description": "...", "stars": 300, "url": "...", "language": "JavaScript" },
        { "name": "repo3", "description": "...", "stars": 190, "url": "...", "language": "Python" }
      ],
      "top_languages": ["Python", "JavaScript", "TypeScript"],
      "tags": [],
      "score": 2341
    }
  ]
}
```

---

## Step 6 — Atomic Write

Write `data.json` atomically to prevent a mid-write crash from corrupting the file the frontend and Module 3 both depend on:

```
1. Serialize the final object to minified JSON string
2. Write to public/data.json.tmp
3. If write succeeds → rename data.json.tmp to data.json
4. If write fails → log error, delete data.json.tmp if it exists, abort
                    existing data.json remains untouched
```

**Why minified:** `data.json` is a static file served over GitHub Pages on every page load. Minified JSON is smaller and faster to transfer. Estimated file size: 300–500KB minified for 300 devs.

---

## Output

Writes `public/data.json` to disk. No return value. Workflow YAML handles git commit and push after this module exits successfully.

---

## Error Handling Summary

| Scenario | Behaviour |
|---|---|
| Input array is empty | Abort — do not overwrite `data.json`, log error |
| Input has no valid `rank` or `score` | Abort — do not overwrite `data.json`, log error |
| Write to `data.json.tmp` fails | Log error, delete `.tmp` if it exists, abort — `data.json` untouched |
| Rename from `.tmp` to `data.json` fails | Log error, delete `.tmp`, abort — `data.json` untouched |
| Any entry is missing `digest_repos` | Default to `[]` for that entry — do not abort |
| Any entry is missing `top_repos` | Default to `[]` for that entry — do not abort |
| Any entry is missing `top_languages` | Default to `[]` for that entry — do not abort |

---

## What Module 4 Does NOT Do

- Does not call any API
- Does not compute scores, ranks, or tags
- Does not write `digest.json` — owned entirely by Module 3
- Does not run git commands — responsibility of the workflow YAML
- Does not depend on Module 6 — tags are a frontend concern only