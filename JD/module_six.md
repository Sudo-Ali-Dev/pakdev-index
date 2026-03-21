# Module 6 — tags.js (Frontend)

**Responsibility:** Compute tags for each developer client-side by keyword matching against their repo data. Return an enriched copy of the leaderboard array with `tags[]` populated. Never mutate cached data or write back to localStorage.

**Runs in:** Browser only. Runs once per page load, after Module 5 returns the leaderboard data (cached or fresh), before the leaderboard renders.

**Does not call any API.** No network requests. Pure in-memory computation.

---

## When It Runs

```
Module 5 returns data.json (cached or fresh)
     ↓
Module 6 receives leaderboard array with tags: [] on each entry
     ↓
Module 6 computes tags for each dev and returns enriched array
     ↓
React renders leaderboard with populated tags
```

Module 6 operates on a copy of the array — it does not mutate the original data returned by Module 5 and does not write anything back to localStorage.

---

## Input

Receives the full leaderboard array from `data.json`. Each entry contains:

```json
{
  "username": "example-dev",
  "top_repos": [
    { "name": "llm-urdu-nlp", "description": "A language model for Urdu NLP tasks", "language": "Python" },
    { "name": "react-dashboard", "description": "Admin dashboard built with React", "language": "JavaScript" }
  ],
  "top_languages": ["Python", "JavaScript", "TypeScript"],
  "tags": []
}
```

Only `top_repos[].name`, `top_repos[].description`, and `top_languages` are used for keyword matching. All other fields are passed through unchanged.

---

## Keyword Dictionary

The authoritative keyword dictionary. All keywords are designed for **whole-word matching only** — no substring matches. See matching logic in Step 2.

Keywords are intentionally specific — generic words like `"app"`, `"model"`, and `"ai"` are excluded because they appear as substrings inside unrelated words (`"wrapper"`, `"chairman"`, `"trail"`) and cause false positives.

```javascript
const KEYWORD_DICT = {
  "AI/ML": [
    "machine learning", "deep learning", "neural network",
    "language model", "ml model", "ai model", "ai-powered", "ai tool",
    "artificial intelligence", "nlp", "computer vision",
    "transformer", "classification", "prediction",
    "training", "inference", "dataset", "llm"
  ],
  "Web Dev": [
    "react", "vue", "angular", "nextjs", "next.js", "html",
    "css", "frontend", "backend", "fullstack", "full-stack",
    "express", "fastapi", "django", "flask", "tailwind",
    "typescript", "rest api", "graphql", "web app"
  ],
  "DevOps": [
    "docker", "kubernetes", "ci/cd", "pipeline", "terraform",
    "ansible", "nginx", "deployment", "github actions", "workflow",
    "cloud", "aws", "gcp", "azure", "infrastructure", "devops"
  ],
  "Mobile": [
    "flutter", "android", "ios", "react native", "swift",
    "kotlin", "expo", "mobile app", "android app",
    "ios app", "cross-platform"
  ],
  "Data": [
    "pandas", "spark", "sql", "database", "etl", "analytics",
    "jupyter", "data science", "visualization", "matplotlib",
    "numpy", "postgresql", "mongodb", "data pipeline",
    "data engineering", "big data"
  ],
  "Open Source": [
    "library", "package", "npm package", "pip package",
    "sdk", "cli", "utility", "framework", "open source",
    "plugin", "boilerplate", "starter kit", "template"
  ]
};
```

---

## Step 1 — Build Text Corpus Per Developer

For each developer, build a single lowercase text string from the fields used for matching:

```javascript
const topRepos = Array.isArray(dev.top_repos) ? dev.top_repos : [];
const topLangs = Array.isArray(dev.top_languages) ? dev.top_languages : [];

const corpus = [
  ...topRepos.map(r => r.name || ""),
  ...topRepos.map(r => r.description || ""),
  ...topLangs
].join(" ").toLowerCase();
```

**Null safety:** If `top_repos` is missing or null, treat as empty array. If `top_languages` is missing or null, treat as empty array. If a repo's `name` or `description` is null, treat as empty string. Do not crash.

---

## Step 2 — Match Against Keyword Dictionary (Word Boundary Matching)

For each tag in `KEYWORD_DICT`, check if any of its keywords appear in the corpus as a **whole word or phrase** — not as a substring of another word.

Use regex with word boundaries (`\b`) to prevent false positives:

```javascript
function buildRegex(keyword) {
  // Escape any special regex characters in the keyword
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Wrap in word boundaries
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

const matchedTags = [];

for (const [tag, keywords] of Object.entries(KEYWORD_DICT)) {
  const matched = keywords.some(kw => buildRegex(kw).test(corpus));
  if (matched) {
    matchedTags.push(tag);
  }
}
```

**Why word boundaries:** `\b` ensures `"sql"` matches `"sql database"` but not `"mysql"` or `"nosql"`. It ensures `"nlp"` matches standalone but not inside other words. Multi-word keywords like `"machine learning"` and `"react native"` match naturally with `\b` on each end.

**Result:** An array of matched tag strings. A developer can match multiple tags — this is expected and correct. Deduplication is guaranteed by the loop structure — each tag appears at most once.

---

## Step 3 — Assign Tags

Assign the matched tags array to the developer entry. If no keywords matched, assign an empty array — no default or fallback tag is added.

```javascript
return { ...dev, tags: matchedTags };
```

Returns a shallow copy of the dev object with `tags` populated — does not mutate the original.

---

## Output

Returns an enriched copy of the full leaderboard array. Each entry is identical to the input except `tags[]` is now populated:

```json
{
  "username": "example-dev",
  "top_repos": [...],
  "top_languages": ["Python", "JavaScript", "TypeScript"],
  "tags": ["AI/ML", "Web Dev"]
}
```

Tags are used exclusively by the frontend filter bar. They are never written back to localStorage, never sent to any server, and never stored in `data.json`.

---

## Filter Bar Integration

The frontend filter bar reads `tags[]` from each dev entry after Module 6 has enriched the array. Available filter options are derived dynamically from all unique tags present in the enriched array — not hardcoded. This means if no dev matches "DevOps" this week, the DevOps filter option does not appear.

```javascript
const allTags = [...new Set(enrichedDevs.flatMap(dev => dev.tags))].sort();
// renders as filter options
```

---

## Error Handling Summary

| Scenario | Behaviour |
|---|---|
| `top_repos` is null or missing on a dev entry | Treat as empty array — corpus built from `top_languages` only |
| `top_languages` is null or missing on a dev entry | Treat as empty array — corpus built from `top_repos` only |
| Repo `name` or `description` is null | Treat as empty string — skip silently |
| No keywords match for a dev | Assign `tags: []` — do not crash or assign default |
| Entire leaderboard array is empty | Return empty array — do not crash |
| Regex construction fails for a keyword | Skip that keyword, log warning — do not crash |
| Unknown tag added to `KEYWORD_DICT` in future | Works automatically — no other code changes needed |