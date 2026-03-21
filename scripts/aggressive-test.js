'use strict';

const assert = require('node:assert/strict');

const fetchModule = require('./fetch-devs');
const scoreModule = require('./score');

async function testModule1Aggressive() {
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  const callLog = [];

  const users = [];
  for (let i = 0; i < 960; i += 1) {
    users.push(`user${String(i).padStart(4, '0')}`);
  }

  function searchUsers(query, page) {
    const qIdx = [
      'location:Pakistan',
      'location:Lahore',
      'location:Karachi',
      'location:Islamabad',
      'location:Rawalpindi',
      'location:Peshawar',
      'location:Faisalabad',
      'location:PK'
    ].indexOf(query);
    if (qIdx < 0) return [];

    const base = qIdx * 120;
    if (page === 1) {
      return users.slice(base, base + 100).map((u) => ({ login: u }));
    }
    if (page === 2) {
      return users.slice(base + 100, base + 120).map((u) => ({ login: u }));
    }
    return [];
  }

  function buildProfile(username) {
    const n = Number(username.replace('user', ''));
    return {
      login: username,
      name: `Name ${username}`,
      avatar_url: `https://avatars.example/${username}`,
      bio: `Bio ${username}`,
      location: n % 2 === 0 ? 'Lahore' : 'Karachi',
      followers: n,
      following: n % 4 === 0 ? 0 : 10,
      public_repos: n % 7 === 0 ? 0 : 5,
      created_at: n % 11 === 0
        ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        : '2020-01-01T00:00:00Z'
    };
  }

  function buildEvents(username) {
    const n = Number(username.replace('user', ''));
    if (n % 13 === 0) {
      return [];
    }

    const now = Date.now();
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString();

    return [
      { type: 'PushEvent', created_at: recent, repo: { name: `${username}/repoA` } },
      { type: 'PullRequestEvent', created_at: recent, repo: { name: `${username}/repoB` } },
      { type: 'WatchEvent', created_at: recent, repo: { name: `${username}/repoC` } },
      { type: 'PushEvent', created_at: old, repo: { name: `${username}/repoOld` } }
    ];
  }

  function buildRepos(username, page) {
    const n = Number(username.replace('user', ''));
    if (n % 17 === 0) {
      return [];
    }

    if (username === 'user0001') {
      if (page === 1) {
        return Array.from({ length: 100 }).map((_, i) => ({
          name: `repo${i}`,
          description: `desc${i}`,
          stargazers_count: i + 1,
          html_url: `https://github.com/${username}/repo${i}`,
          language: i % 2 === 0 ? 'Python' : 'JavaScript',
          owner: { login: username }
        }));
      }
      if (page === 2) {
        return Array.from({ length: 20 }).map((_, i) => ({
          name: `repo${100 + i}`,
          description: `desc${100 + i}`,
          stargazers_count: 200 + i,
          html_url: `https://github.com/${username}/repo${100 + i}`,
          language: 'TypeScript',
          owner: { login: username }
        }));
      }
      return [];
    }

    if (page > 1) {
      return [];
    }

    return [
      {
        name: 'repoA',
        description: 'A',
        stargazers_count: 50,
        html_url: `https://github.com/${username}/repoA`,
        language: 'Python',
        owner: { login: username }
      },
      {
        name: 'repoB',
        description: 'B',
        stargazers_count: 10,
        html_url: `https://github.com/${username}/repoB`,
        language: 'JavaScript',
        owner: { login: username }
      },
      {
        name: 'repoC',
        description: 'C',
        stargazers_count: 5,
        html_url: `https://github.com/${username}/repoC`,
        language: null,
        owner: { login: username }
      }
    ];
  }

  global.setTimeout = (cb, _ms, ...args) => {
    cb(...args);
    return 0;
  };
  global.clearTimeout = () => {};

  global.fetch = async (url) => {
    const u = new URL(url);
    callLog.push(u.pathname + u.search);

    if (u.pathname === '/search/users') {
      const query = u.searchParams.get('q');
      const page = Number(u.searchParams.get('page') || '1');
      const items = searchUsers(query, page);
      return {
        ok: true,
        status: 200,
        json: async () => ({ items }),
        text: async () => JSON.stringify({ items })
      };
    }

    const mUser = u.pathname.match(/^\/users\/([^/]+)$/);
    if (mUser) {
      const username = decodeURIComponent(mUser[1]);
      return {
        ok: true,
        status: 200,
        json: async () => buildProfile(username),
        text: async () => '{}'
      };
    }

    const mEvents = u.pathname.match(/^\/users\/([^/]+)\/events$/);
    if (mEvents) {
      const username = decodeURIComponent(mEvents[1]);
      return {
        ok: true,
        status: 200,
        json: async () => buildEvents(username),
        text: async () => '[]'
      };
    }

    const mRepos = u.pathname.match(/^\/users\/([^/]+)\/repos$/);
    if (mRepos) {
      const username = decodeURIComponent(mRepos[1]);
      const page = Number(u.searchParams.get('page') || '1');
      return {
        ok: true,
        status: 200,
        json: async () => buildRepos(username, page),
        text: async () => '[]'
      };
    }

    return {
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => `Unhandled URL ${u.toString()}`
    };
  };

  try {
    const result = await fetchModule.fetchPakistaniDevelopers({
      token: 'test-token',
      repoRoot: process.cwd()
    });

    assert(Array.isArray(result), 'Module 1 result must be an array');
    assert.equal(result.length, 300, 'Module 1 should return final capped top 300');

    for (let i = 1; i < result.length; i += 1) {
      assert(
        Number(result[i - 1].followers || 0) >= Number(result[i].followers || 0),
        'Final developers should be sorted by followers descending'
      );
    }

    const sample = result[0];
    assert.equal(typeof sample.events_90d, 'boolean', 'events_90d should be boolean');
    assert(Array.isArray(sample.repos_active_7d), 'repos_active_7d should be array');
    assert(Array.isArray(sample.digest_repos), 'digest_repos should be array');
    assert(Array.isArray(sample.top_repos), 'top_repos should be array');
    assert(Array.isArray(sample.top_languages), 'top_languages should be array');

    const user1 = result.find((d) => d.username === 'user0001');
    if (user1) {
      const expectedStars = (100 * 101) / 2 + Array.from({ length: 20 }).reduce((s, _, i) => s + 200 + i, 0);
      assert.equal(user1.total_stars, expectedStars, 'total_stars should sum across paginated repos');
      assert(user1.top_repos.length <= 3, 'top_repos should keep top 3');
    }

    const usersProfileCalls = callLog.filter((c) => /^\/users\/[^/?]+$/.test(c));
    assert(usersProfileCalls.length <= 500, 'Profile calls should not exceed preliminary cap of 500');

    console.log('Module 1 aggressive tests: PASS');
  } finally {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
}

function testModule2Aggressive() {
  const input = [
    { username: 'alpha', total_stars: 5000, events_30d: 1, followers: 1, public_repos: 1, created_at: '2020-01-01T00:00:00Z', events_90d: true },
    { username: 'zeta', total_stars: 5000, events_30d: 1, followers: 1, public_repos: 1, created_at: '2020-01-01T00:00:00Z', events_90d: true },
    { username: 'newbie', total_stars: 100, events_30d: 10, followers: 10, public_repos: 10, created_at: new Date().toISOString(), events_90d: true },
    { username: 'broken', total_stars: null, events_30d: undefined, followers: Number.NaN, public_repos: 'not-a-number', created_at: null, events_90d: false }
  ];

  const ranked = scoreModule.scoreDevelopers(input);
  assert.equal(ranked.length, 4, 'Module 2 must not re-filter input array');

  const alpha = ranked.find((d) => d.username === 'alpha');
  const zeta = ranked.find((d) => d.username === 'zeta');
  const newbie = ranked.find((d) => d.username === 'newbie');
  const broken = ranked.find((d) => d.username === 'broken');

  assert(alpha && zeta && newbie && broken, 'All users should be present after scoring');
  assert.equal(alpha.score, 4005, 'Stars must be capped at 2000 before weight');
  assert.equal(zeta.score, 4005, 'Tie user should have same score');
  assert(alpha.rank < zeta.rank, 'Tie should break alphabetically by username');
  assert.equal(newbie.age_penalty_applied, true, 'New account must get age penalty');
  assert.equal(broken.score, 0, 'Invalid inputs should default to zero score');
  assert.equal(Array.isArray(broken.tags), true, 'tags should be present as array');

  console.log('Module 2 aggressive tests: PASS');
}

(async () => {
  await testModule1Aggressive();
  testModule2Aggressive();
  console.log('All aggressive tests passed.');
})().catch((err) => {
  console.error('Aggressive test failure:', err.stack || err.message || String(err));
  process.exit(1);
});
