import React, { useEffect, useMemo, useState } from 'react';
import { CACHE_KEYS, cache } from './utils/cache';
import { enrichLeaderboardWithTags, getAvailableTags } from './utils/tags';
import { generateDeveloperSummary } from './utils/groq';

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
  background: '#fff'
};

const mutedStyle = {
  color: '#666',
  fontSize: 14
};

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [digest, setDigest] = useState(null);
  const [selectedTag, setSelectedTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryByUser, setSummaryByUser] = useState({});
  const [loadingSummaryUser, setLoadingSummaryUser] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      setLoading(true);
      setError('');

      try {
        let leaderboardPayload = cache.get(CACHE_KEYS.LEADERBOARD);
        if (!leaderboardPayload || cache.isStale(CACHE_KEYS.LEADERBOARD)) {
          const response = await fetch('/data.json', { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Failed to load data.json (${response.status})`);
          }
          leaderboardPayload = await response.json();
          cache.set(CACHE_KEYS.LEADERBOARD, leaderboardPayload);
        }

        let digestPayload = cache.get(CACHE_KEYS.DIGEST);
        if (!digestPayload || cache.isStale(CACHE_KEYS.DIGEST)) {
          const response = await fetch('/digest.json', { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Failed to load digest.json (${response.status})`);
          }
          digestPayload = await response.json();
          cache.set(CACHE_KEYS.DIGEST, digestPayload);
        }

        if (!alive) {
          return;
        }

        const rows = Array.isArray(leaderboardPayload?.leaderboard)
          ? leaderboardPayload.leaderboard
          : [];

        setLeaderboard(enrichLeaderboardWithTags(rows));
        setDigest(digestPayload || null);
      } catch (loadError) {
        if (!alive) {
          return;
        }
        setError(loadError?.message || 'Failed to load frontend data.');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      alive = false;
    };
  }, []);

  const tags = useMemo(() => ['All', ...getAvailableTags(leaderboard)], [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    if (selectedTag === 'All') {
      return leaderboard;
    }

    return leaderboard.filter((dev) => Array.isArray(dev?.tags) && dev.tags.includes(selectedTag));
  }, [leaderboard, selectedTag]);

  async function handleGenerateSummary(dev) {
    const username = String(dev?.username || '').trim();
    if (!username || loadingSummaryUser === username) {
      return;
    }

    setLoadingSummaryUser(username);
    try {
      const summary = await generateDeveloperSummary(dev);
      setSummaryByUser((prev) => ({ ...prev, [username]: summary }));
    } finally {
      setLoadingSummaryUser('');
    }
  }

  return (
    <main style={{ fontFamily: 'Segoe UI, Arial, sans-serif', maxWidth: 960, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>PakDev Index</h1>
      <p style={mutedStyle}>Leaderboard + digest are now wired to frontend data files.</p>

      {loading && <p>Loading leaderboard...</p>}
      {!loading && error && <p style={{ color: '#b00020' }}>{error}</p>}

      {!loading && !error && (
        <>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Weekly Digest</h2>
            <p style={mutedStyle}>Week: {digest?.week_of || 'Unknown'}</p>
            <p style={{ lineHeight: 1.6 }}>{digest?.digest_text || 'No digest text available.'}</p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Filter by Tag</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    borderRadius: 999,
                    border: selectedTag === tag ? '1px solid #0b5fff' : '1px solid #bbb',
                    background: selectedTag === tag ? '#e8f0ff' : '#fff',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            {filteredLeaderboard.map((dev) => {
              const username = String(dev?.username || '').trim();
              const summary = summaryByUser[username];

              return (
                <article key={username} style={cardStyle}>
                  <h3 style={{ margin: '0 0 6px' }}>
                    #{dev?.rank || '-'} {dev?.name || username} ({username})
                  </h3>
                  <p style={mutedStyle}>
                    Score: {dev?.score || 0} | Followers: {dev?.followers || 0} | 30d events: {dev?.events_30d || 0}
                  </p>
                  <p>{dev?.bio || 'No bio available.'}</p>
                  <p style={mutedStyle}>Top languages: {Array.isArray(dev?.top_languages) ? dev.top_languages.join(', ') : 'None'}</p>
                  <p style={mutedStyle}>Tags: {Array.isArray(dev?.tags) && dev.tags.length ? dev.tags.join(', ') : 'None'}</p>

                  <button
                    type="button"
                    onClick={() => handleGenerateSummary(dev)}
                    disabled={loadingSummaryUser === username}
                    style={{
                      border: '1px solid #1b1b1b',
                      background: '#fff',
                      padding: '6px 10px',
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    {loadingSummaryUser === username ? 'Generating summary...' : 'Generate AI Summary'}
                  </button>

                  {summary && (
                    <p style={{ marginTop: 10, lineHeight: 1.6 }}>
                      <strong>AI Summary:</strong> {summary}
                    </p>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}

export default App;
