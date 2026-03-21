# Module 1 — fetch-devs.js

**Responsibility:** Discover all Pakistani GitHub users, fetch their activity data, filter fake and inactive accounts, apply the final cap, and return a clean structured array ready for scoring.

---

## Step 1 — Search Pakistani Developers

Run 8 location-based GitHub Search API queries **sequentially** with a **2 second delay** between each to stay within the 30 req/minute Search API limit.

```
location:Pakistan
location:Lahore
location:Karachi
location:Islamabad
location:Rawalpindi
location:Peshawar
location:Faisalabad
location:PK
```

**Pagination:** Each query paginates up to page 10 (100 results per page = max 1,000 per location query) to avoid silently missing devs in large cities.

**On failure:** Retry once after 3s. If still failing, skip that location query and log — do not crash.

---

## Step 2 — Load Self-Registered Developers

Read `registered_devs.json` from the repo. Merge usernames into the search results list.

**Error handling:** If a registered username returns a 404 from GitHub API (account deleted or renamed), skip and log the username — do not crash.

---

## Step 3 — Deduplicate

Deduplicate the merged list by username. **Lowercase all usernames before comparing** to treat `AliDev` and `alidev` as the same person.

---

## Step 4 — Preliminary Cap at 500

Before making any per-user API calls, apply a preliminary cap of **500 usernames** based on search result order. This limits the maximum number of API calls made in a single run.

**Why 500 not 300:** The final 300 cap (Step 7) is applied after filtering. If the raw list has 400 users and 150 are filtered out as fake/inactive, you would end up with only 250. The preliminary 500 cap gives enough headroom so the final list reliably reaches 300 after filtering.

---

## Step 5 — Fetch Per-User Data (3 API calls per user)

For each username in the preliminary list, make 3 API calls with a **100-150ms delay between each user's calls** to avoid GitHub abuse detection.

### Call 1 — Profile
```
GET /users/{username}
```
Extract:
- `name`, `avatar_url`, `bio`, `location`
- `followers`, `following`
- `public_repos`
- `created_at` (for age penalty in scoring)

### Call 2 — Events
```
GET /users/{username}/events
```
Extract:
- All events filtered by `created_at` within the **last 30 days**
- Count only meaningful event types: `PushEvent`, `PullRequestEvent`, `IssuesEvent`, `ReleaseEvent`
- Ignore: `WatchEvent`, `ForkEvent`, `MemberEvent`, `PublicEvent`
- Store total meaningful event count as `events_30d`
- Also check if any events of any type exist within the **last 90 days** — store result as boolean `events_90d` (used in Step 6 filtering)
- From `PushEvent` entries within last 7 days — extract `repo.name` as a list called `repos_active_7d`
- Cross-reference `repos_active_7d` names against repos data from Call 3 (while repos data is still in memory) to build `digest_repos` — full metadata needed by Module 3

### Call 3 — Repos (paginated)
```
GET /users/{username}/repos?per_page=100&page=1
GET /users/{username}/repos?per_page=100&page=2  (if page 1 returned 100 results)
```
Paginate until fewer than 100 results are returned.

Extract:
- `total_stars` — sum of `stargazers_count` across all repos
- `top_repos` — top 3 repos sorted by `stargazers_count` descending → store `name`, `description`, `stars`, `url`, `language`
- `top_languages` — count language occurrences across all repos → take top 3 most frequent, ignore `null` language values
- `digest_repos` — for each name in `repos_active_7d`, find the matching repo in this repos array and extract: `owner`, `name`, `description`, `stars`, `language`, `url`

---

## Step 6 — Filter Fake and Inactive Accounts

Now that full profile and activity data is available, remove any account meeting one or more of the following:

- `public_repos` = 0
- `followers` = 0 AND `following` = 0
- `created_at` less than 30 days ago
- `events_90d` = false (no GitHub activity in the last 90 days)

---

## Step 7 — Apply Final 300 User Cap

Sort the filtered list by **`followers` count descending**. Keep the top 300. This ensures the cap is deterministic and prioritises established developers over random or unknown accounts.

---

## Output

Returns a raw activity data array. Each entry contains:

```json
{
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
  "top_languages": ["Python", "JavaScript", "TypeScript"]
}
```

---

## Error Handling Summary

| Scenario | Behaviour |
|---|---|
| Search query fails | Retry once after 3s, skip that location query and log |
| Registered username returns 404 | Skip and log — do not crash |
| Profile call returns 404 | Skip that user entirely and log |
| Events call returns empty | Set `events_30d: 0`, `events_90d: false`, `repos_active_7d: []`, `digest_repos: []` |
| Repos call returns empty | Set `total_stars: 0`, `top_repos: []`, `top_languages: []`, `digest_repos: []` |
| Any call hits rate limit (429) | Wait 60s then retry once |
| `digest_repos` cross-reference finds no match | Set `digest_repos: []` — do not crash |