import React, { useState, useEffect } from 'react';
import { CACHE_KEYS, cache } from '../utils/cache';

export default function WeeklyDigest() {
  const [digestData, setDigestData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDigest() {
      try {
        let digestPayload = cache.get(CACHE_KEYS.DIGEST);
        if (!digestPayload || cache.isStale(CACHE_KEYS.DIGEST)) {
          const res = await fetch('./digest.json', { cache: 'no-store' });
          if (res.ok) {
            digestPayload = await res.json();
            cache.set(CACHE_KEYS.DIGEST, digestPayload);
          }
        }
        setDigestData(digestPayload);
      } catch (e) {
        console.error("Failed to load digest", e);
      } finally {
        setLoading(false);
      }
    }
    loadDigest();
  }, []);

  const getLangStyles = (lang) => {
    const language = (lang || '').toLowerCase();
    if (language.includes('python') || language.includes('jupyter')) {
      return { 
        bg: 'bg-tertiary-container/20', 
        border: 'border-tertiary/30', 
        text: 'text-tertiary',
        icon: 'database',
        accent: 'group-hover:text-tertiary'
      };
    }
    if (language.includes('javascript') || language.includes('typescript') || language.includes('html') || language.includes('css')) {
      return { 
        bg: 'bg-secondary-container/20', 
        border: 'border-secondary/30', 
        text: 'text-secondary',
        icon: 'language',
        accent: 'group-hover:text-secondary'
      };
    }
    return { 
      bg: 'bg-primary-container/20', 
      border: 'border-primary/30', 
      text: 'text-primary',
      icon: 'code',
      accent: 'group-hover:text-primary'
    };
  };

  return (
    <main className="flex-grow terminal-grid">
      {/* Hero Editorial Section */}
      <section className="border-b border-outline-variant bg-surface px-6 py-12 lg:py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container font-mono text-xs mb-6 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              AI_EDITORIAL_ENGINE: {loading ? 'SYNCING' : 'ACTIVE'}
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-on-surface leading-tight tracking-tighter uppercase mb-6">
              The Weekly <span className="text-primary">Source</span>
            </h1>
            <div className="font-mono text-sm text-outline mb-8 border-l-2 border-primary pl-4 max-w-2xl min-h-[80px]">
              {loading ? (
                <span className="animate-pulse">Retrieving contextual analysis array...</span>
              ) : (
                <span className="block">
                  <span className="text-tertiary font-bold">[{digestData?.week_of || 'Current Cycle'}]</span>
                  <br className="mb-2" />
                  {digestData?.digest_text || 'No system analysis generated for the current block height.'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              <button className="bg-primary text-on-primary px-6 py-3 font-headline font-bold uppercase tracking-widest glow-button transition-all">
                Read Full Report
              </button>
              <button className="border border-outline-variant hover:border-primary text-on-surface px-6 py-3 font-headline font-bold uppercase tracking-widest transition-all">
                Archive_2024
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-4 hidden lg:block border border-outline-variant bg-surface-container-lowest p-1">
            <div className="h-full w-full bg-surface-container-high border border-outline-variant p-6 flex flex-col justify-between">
              <div className="font-mono text-[10px] text-tertiary uppercase mb-4 tracking-tighter">
                [System_Diagnostics_04]
                <br/>CPU_LOAD: {loading ? '88%' : '12%'}
                <br/>ENTROPY: NOMINAL
                <br/>CACHE: {digestData ? 'HIT' : 'MISS'}
              </div>
              <div className="space-y-4">
                <div className="h-1 bg-outline-variant w-full overflow-hidden">
                  <div className={`h-full bg-primary ${loading ? 'animate-pulse w-full' : 'w-2/3'}`}></div>
                </div>
                <div className="h-1 bg-outline-variant w-full overflow-hidden">
                  <div className={`h-full bg-tertiary ${loading ? 'animate-pulse w-full' : 'w-1/2'}`}></div>
                </div>
                <div className="h-1 bg-outline-variant w-full overflow-hidden">
                  <div className={`h-full bg-secondary ${loading ? 'animate-pulse w-full' : 'w-4/5'}`}></div>
                </div>
              </div>
              <div className="mt-8">
                <div className="text-4xl font-black font-headline text-on-surface opacity-10 leading-none">PAK_DEV</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Archive / Previous Reports Section */}
      <section className="border-b border-outline-variant bg-surface-container-lowest px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">history</span>
              <h2 className="font-headline text-xl font-bold uppercase tracking-tighter">PREVIOUS_REPORTS</h2>
            </div>
            <button className="bg-primary text-on-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest glow-button transition-all">
              VIEW_ALL_ARCHIVES
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-outline-variant bg-surface p-6 font-mono flex flex-col justify-between group hover:border-primary transition-colors cursor-pointer">
              <div>
                <div className="text-[10px] text-primary mb-1 uppercase tracking-[0.2em] font-bold">Released: 14_OCT_2024</div>
                <h3 className="text-on-surface font-headline font-bold text-xl mb-1 group-hover:text-primary transition-colors uppercase tracking-tighter">Weekly Dispatch: Vol_03</h3>
                <div className="text-[12px] text-outline mb-3 font-mono">The Rust Uprising</div>
                <p className="text-[10px] text-outline-variant line-clamp-2">Deep dive into low-level systems adoption across Islamabad's emerging tech clusters.</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-primary font-bold uppercase tracking-widest">
                <span>Read_Digest</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </div>
            
            <div className="border border-outline-variant bg-surface p-6 font-mono flex flex-col justify-between group hover:border-secondary transition-colors cursor-pointer">
              <div>
                <div className="text-[10px] text-secondary mb-1 uppercase tracking-[0.2em] font-bold">Released: 07_OCT_2024</div>
                <h3 className="text-on-surface font-headline font-bold text-xl mb-1 group-hover:text-secondary transition-colors uppercase tracking-tighter">Weekly Dispatch: Vol_02</h3>
                <div className="text-[12px] text-outline mb-3 font-mono">Karachi FinTech Boom</div>
                <p className="text-[10px] text-outline-variant line-clamp-2">Mapping the rapid growth of transactional microservices in the southern port city.</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-secondary font-bold uppercase tracking-widest">
                <span>Read_Digest</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </div>
            
            <div className="border border-outline-variant bg-surface p-6 font-mono flex flex-col justify-between group hover:border-tertiary transition-colors cursor-pointer">
              <div>
                <div className="text-[10px] text-tertiary mb-1 uppercase tracking-[0.2em] font-bold">Released: 30_SEP_2024</div>
                <h3 className="text-on-surface font-headline font-bold text-xl mb-1 group-hover:text-tertiary transition-colors uppercase tracking-tighter">Weekly Dispatch: Vol_01</h3>
                <div className="text-[12px] text-outline mb-3 font-mono">Inception_Protocol</div>
                <p className="text-[10px] text-outline-variant line-clamp-2">Initial baseline metrics for the Pakistani open-source ecosystem tracking system.</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-tertiary font-bold uppercase tracking-widest">
                <span>Read_Digest</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Repository Grid */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b border-outline-variant pb-4">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tighter flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">grid_view</span>
            Trending_Repositories
          </h2>
          <div className="font-mono text-xs text-outline uppercase">
            Sorted_by: Velocity
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20 font-mono text-tertiary animate-pulse">
            LOADING_REPO_INDEX...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-outline-variant">
            {Array.isArray(digestData?.repos) && digestData.repos.map((repo, idx) => {
              const styles = getLangStyles(repo.language);
              return (
                <div key={`${repo.owner}-${repo.name}-${idx}`} className="flex flex-col h-full border-r border-b border-outline-variant p-6 bg-surface hover:bg-surface-container transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`${styles.bg} ${styles.border} border p-2`}>
                      <span className={`material-symbols-outlined ${styles.text}`}>{styles.icon}</span>
                    </div>
                    <span className={`font-mono text-[10px] ${styles.text} uppercase`}>#{repo.language || 'SYS'}</span>
                  </div>
                  <h3 className={`font-headline text-xl font-bold mb-2 transition-colors truncate ${styles.accent}`}>
                    <a href={repo.url} target="_blank" rel="noreferrer" title={`${repo.owner}/${repo.name}`}>
                      {repo.name}
                    </a>
                  </h3>
                  <p className="text-sm text-on-surface-variant font-body mb-6 h-12 line-clamp-2">
                    {repo.description || "No system description provided."}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4">
                    <div className="flex gap-4 font-mono text-xs text-outline">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">star</span> {repo.stars?.toLocaleString() || 0}</span>
                      <a href={`https://github.com/${repo.owner}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[100px]" title={`Author: ${repo.owner}`}>
                        <span className="material-symbols-outlined text-sm">person</span> {repo.owner}
                      </a>
                    </div>
                    <div className={`text-[10px] ${styles.text} border ${styles.border} px-2 py-0.5 uppercase font-bold tracking-widest`}>
                      Active
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Call to Action Grid Item */}
            <div className="border-r border-b border-outline-variant p-6 bg-surface-container-lowest flex flex-col items-center justify-center text-center group cursor-pointer border-dashed min-h-[250px]">
              <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors mb-4">add</span>
              <h3 className="font-headline text-lg font-bold uppercase tracking-widest">Register_Your_Repo</h3>
              <p className="text-xs text-outline font-mono mt-2">Get featured in the next digest</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
