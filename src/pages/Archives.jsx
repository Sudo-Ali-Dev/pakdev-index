import React, { useState, useEffect, useMemo } from 'react';
import { CACHE_KEYS, cache } from '../utils/cache';

export default function Archives({ onChangeTab }) {
  const [digestData, setDigestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    async function loadData() {
      try {
        let payload;
        try {
          const res = await fetch('./digest.json', { cache: 'no-store' });
          if (res.ok) {
            payload = await res.json();
            cache.set(CACHE_KEYS.DIGEST, payload);
          }
        } catch {
          payload = cache.get(CACHE_KEYS.DIGEST);
        }
        if (!payload) {
          payload = cache.get(CACHE_KEYS.DIGEST);
        }
        setDigestData(payload);
      } catch (e) {
        console.error("Failed to load archive data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const archive = useMemo(() => {
    const items = Array.isArray(digestData?.archive) ? [...digestData.archive] : [];
    if (sortOrder === 'newest') {
      items.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (sortOrder === 'oldest') {
      items.sort((a, b) => (a.volume || 0) - (b.volume || 0));
    }
    return items;
  }, [digestData, sortOrder]);

  const currentVolume = digestData?.volume || 1;

  const allYears = useMemo(() => {
    const years = new Set();
    archive.forEach(r => {
      const match = (r.released || '').match(/^(\d{4})/);
      if (match) years.add(match[1]);
    });
    return [...years].sort((a, b) => b - a);
  }, [archive]);

  return (
    <main className="min-h-screen pt-8 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 pb-12">
      {/* Left Sidebar: Filters */}
      <aside className="w-full md:w-64 flex flex-col gap-6 shrink-0">
        <div className="border border-outline-variant bg-surface-container-high p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-outline-variant pb-2">
            <span className="material-symbols-outlined text-primary text-sm">filter_list</span>
            <h3 className="font-headline font-bold text-xs tracking-widest uppercase">FILTERS // PARAMETERS</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] text-outline uppercase block mb-2">Chronicle_Year</label>
              <div className="grid grid-cols-2 gap-2">
                {allYears.length > 0 ? allYears.map(year => (
                  <button key={year} className="border border-primary text-primary px-2 py-1 text-[10px] font-mono text-left bg-primary/5">
                    [{year}]
                  </button>
                )) : (
                  <span className="font-mono text-[10px] text-outline col-span-2">NO_DATA</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Module */}
        <div className="border border-outline-variant bg-surface-container-lowest p-4 font-mono text-[10px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-outline">ARCHIVE_STATUS:</span>
            <span className="text-tertiary">{loading ? 'LOADING' : 'ONLINE'}</span>
          </div>
          <div className="w-full bg-outline-variant h-1 mb-4">
            <div className="bg-tertiary h-full shadow-[0_0_4px_#74dd7e] transition-all" style={{ width: loading ? '30%' : '100%' }}></div>
          </div>
          <p className="text-outline/60 leading-tight">
            TOTAL_VOLUMES: {archive.length}<br />
            CURRENT_VOL: {String(currentVolume).padStart(2, '0')}<br />
            STATUS: {loading ? 'FETCHING' : 'INDEXED'}
          </p>
        </div>

        {/* Back to Digest */}
        <button
          onClick={() => onChangeTab('weekly_digest')}
          className="border border-outline-variant p-3 font-mono text-[10px] uppercase tracking-widest hover:bg-surface-container-high hover:border-primary transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          BACK_TO_DIGEST
        </button>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-6">
          <div>
            <h1 className="font-headline font-extrabold text-3xl md:text-5xl tracking-tighter text-primary">
              ARCHIVE // WEEKLY_REPORTS
            </h1>
            <p className="font-mono text-xs text-outline mt-2">ACCESSING_LOCAL_HISTORY: ISB_SERVER_NODE_01</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-outline">SORT:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-surface-container-high border-none text-on-surface text-[10px] py-1 pl-2 pr-8 focus:ring-0 cursor-pointer"
            >
              <option value="newest">NEWEST_FIRST</option>
              <option value="oldest">OLDEST_FIRST</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 font-mono text-tertiary animate-pulse">
            LOADING_ARCHIVE_INDEX...
          </div>
        ) : archive.length === 0 ? (
          <div className="border border-dashed border-outline-variant p-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-4">auto_stories</span>
            <h3 className="font-headline text-lg font-bold uppercase tracking-tighter mb-2">NO_ARCHIVES_FOUND</h3>
            <p className="font-mono text-xs text-outline max-w-md">
              Archive entries will appear here as new digest volumes are published each week.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline-variant border border-outline-variant">
            {archive.map((report) => (
              <article key={report.volume} className="bg-surface p-6 group transition-all hover:bg-surface-container-low">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-mono text-tertiary text-xs bg-tertiary/10 px-2 py-0.5 border border-tertiary/30">
                    VOL_{String(report.volume || 0).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] text-outline">
                    REL_DATE: {report.released || 'N/A'}
                  </span>
                </div>
                <h2 className="font-headline font-bold text-xl mb-3 tracking-tight group-hover:text-primary transition-colors">
                  {report.title || `Volume ${report.volume}`}
                </h2>
                <p className="text-sm text-on-surface-variant mb-6 line-clamp-2 leading-relaxed">
                  {report.summary || ''}
                </p>
                {Array.isArray(report.tags) && report.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {report.tags.map(tag => (
                      <span key={tag} className="bg-surface-variant border border-outline-variant text-[9px] font-mono px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onChangeTab?.('report_detail', report.volume)}
                  className="w-full bg-primary text-on-primary font-headline font-bold text-xs py-3 uppercase tracking-widest hover:bg-primary-container transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  OPEN_REPORT <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </article>
            ))}

            {/* Upcoming Volume Placeholder */}
            <article className="bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center opacity-40">
              <span className="material-symbols-outlined text-4xl mb-2">lock</span>
              <p className="font-mono text-[10px] uppercase">
                Upcoming_Volume_{String(currentVolume + 1).padStart(2, '0')}<br />
                Deployment_Scheduled: Next_Week
              </p>
            </article>
          </div>
        )}
      </section>
    </main>
  );
}
