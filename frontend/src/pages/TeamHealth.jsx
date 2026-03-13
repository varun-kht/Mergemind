import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Shield, Clock, Bug, Zap, Code2, TestTube, BookOpen,
  AlertTriangle, ChevronUp, BarChart3, Trophy, Activity
} from 'lucide-react';
import axios from 'axios';

const categoryIcons = {
  bug: <Bug className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  quality: <Code2 className="w-4 h-4" />,
  testing: <TestTube className="w-4 h-4" />,
  'best-practice': <BookOpen className="w-4 h-4" />,
};

const categoryColors = {
  bug: 'text-red-400 bg-red-500/10',
  security: 'text-amber-400 bg-amber-500/10',
  performance: 'text-yellow-400 bg-yellow-500/10',
  quality: 'text-indigo-400 bg-indigo-500/10',
  testing: 'text-cyan-400 bg-cyan-500/10',
  'best-practice': 'text-emerald-400 bg-emerald-500/10',
};

function AnimatedCounter({ value, suffix = '', duration = 2000 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{displayValue}{suffix}</>;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function TeamHealth() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted">Loading team insights...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-lg">Failed to load stats. Is the backend running on port 3000?</p>
      </div>
    );
  }

  const maxDailyIssues = Math.max(...stats.daily.map(d => d.issues), 1);

  return (
    <div className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen" style={{ color: '#F3F4F6' }}>
      <div className="space-y-8">
        
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Engineering Intelligence</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: '#fff' }}>
            Team Health Dashboard
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Real-time insights into your team's code quality, security posture, and velocity.
          </p>
        </motion.div>

        {/* ── Hero Stats Row ─────────────────────────────────────────────── */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Hours Saved Today */}
          <div className="rounded-2xl p-6 relative overflow-hidden group border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-muted font-medium">Hours Saved Today</span>
            </div>
            <div className="text-4xl font-bold text-emerald-400">
              <AnimatedCounter value={stats.today.hoursSaved} suffix="h" />
            </div>
            <p className="text-xs text-text-muted mt-2">{stats.hoursSaved}h total all-time</p>
          </div>

          {/* PRs Reviewed */}
          <div className="rounded-2xl p-6 relative overflow-hidden group border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] group-hover:bg-primary/20 transition-all" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-muted font-medium">PRs Reviewed</span>
            </div>
            <div className="text-4xl font-bold" style={{ color: '#fff' }}>
              <AnimatedCounter value={stats.totalPRs} />
            </div>
            <p className="text-xs text-text-muted mt-2">{stats.today.prs} today</p>
          </div>

          {/* Issues Caught */}
          <div className="rounded-2xl p-6 relative overflow-hidden group border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] group-hover:bg-amber-500/20 transition-all" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-muted font-medium">Issues Caught</span>
            </div>
            <div className="text-4xl font-bold text-amber-400">
              <AnimatedCounter value={stats.totalIssues} />
            </div>
            <div className="flex items-center gap-1 text-xs mt-2">
              <span className="text-red-400">🔴 {stats.bySeverity.critical}</span>
              <span className="text-text-muted">·</span>
              <span className="text-orange-400">🟠 {stats.bySeverity.high}</span>
              <span className="text-text-muted">·</span>
              <span className="text-yellow-400">🟡 {stats.bySeverity.medium}</span>
            </div>
          </div>

          {/* Top Vulnerability */}
          <div className="rounded-2xl p-6 relative overflow-hidden group border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[60px] group-hover:bg-red-500/20 transition-all" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-muted font-medium">Top Vulnerability</span>
            </div>
            <div className="text-lg font-bold text-red-400 leading-tight">
              {stats.topVulnerability?.title || 'None detected'}
            </div>
            {stats.topVulnerability && (
              <p className="text-xs text-text-muted mt-2">Found {stats.topVulnerability.count} times this week</p>
            )}
          </div>
        </motion.div>

        {/* ── Main Content Grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 7-Day Trend Chart */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="rounded-2xl p-6 lg:col-span-2 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold" style={{ color: '#fff' }}>7-Day Issue Trend</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/80 inline-block" /> Issues</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 inline-block" /> Critical</span>
              </div>
            </div>
            <div className="flex items-end gap-2 h-48">
              {stats.daily.map((day, i) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-40 relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.issues / maxDailyIssues) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full rounded-t-lg relative group cursor-pointer"
                      style={{ background: 'linear-gradient(to top, rgba(79,70,229,0.6), rgba(79,70,229,0.3))' }}
                    >
                      {day.critical > 0 && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(day.critical / Math.max(day.issues, 1)) * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 + 0.3 }}
                          className="absolute bottom-0 w-full rounded-t-lg"
                          style={{ background: 'rgba(239,68,68,0.5)' }}
                        />
                      )}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-white/10" style={{ background: '#121216' }}>
                        <span className="font-medium" style={{ color: '#fff' }}>{day.issues} issues</span>
                        {day.critical > 0 && <span className="text-red-400 ml-1">({day.critical} critical)</span>}
                      </div>
                    </motion.div>
                  </div>
                  <span className="text-xs text-text-muted mt-1">
                    {new Date(day.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }} className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold" style={{ color: '#fff' }}>By Category</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => {
                  const pct = Math.round((count / stats.totalIssues) * 100);
                  const colorClass = categoryColors[cat] || 'text-gray-400 bg-gray-500/10';
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`flex items-center gap-2 px-2 py-0.5 rounded-md ${colorClass}`}>
                          {categoryIcons[cat]}
                          <span className="capitalize">{cat.replace('-', ' ')}</span>
                        </span>
                        <span className="text-text-muted font-mono text-xs">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full rounded-full ${
                            cat === 'security' ? 'bg-amber-500/70' :
                            cat === 'bug' ? 'bg-red-500/70' :
                            cat === 'performance' ? 'bg-yellow-500/70' :
                            cat === 'quality' ? 'bg-indigo-500/70' :
                            cat === 'testing' ? 'bg-cyan-500/70' :
                            'bg-emerald-500/70'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </div>

        {/* ── Repo Leaderboard ───────────────────────────────────────────── */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.4 }} className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold" style={{ color: '#fff' }}>Repository Leaderboard</h2>
            <span className="ml-auto text-xs text-text-muted">Sorted by issues caught</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th className="text-left py-3 px-4 font-medium">#</th>
                  <th className="text-left py-3 px-4 font-medium">Repository</th>
                  <th className="text-center py-3 px-4 font-medium">PRs</th>
                  <th className="text-center py-3 px-4 font-medium">Issues</th>
                  <th className="text-center py-3 px-4 font-medium">🔴 Critical</th>
                  <th className="text-center py-3 px-4 font-medium">🟠 High</th>
                  <th className="text-right py-3 px-4 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {stats.leaderboard.map((repo, i) => {
                  const riskScore = repo.critical * 10 + repo.high * 5 + (repo.issues - repo.critical - repo.high);
                  const riskLevel = riskScore > 30 ? 'bg-red-500/20 text-red-400' : riskScore > 15 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400';
                  const riskLabel = riskScore > 30 ? 'High' : riskScore > 15 ? 'Medium' : 'Low';
                  return (
                    <tr
                      key={repo.repo}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <td className="py-3.5 px-4 font-mono text-text-muted">{i + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium" style={{ color: '#fff' }}>{repo.repo}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-text-muted">{repo.prs}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold" style={{ color: '#fff' }}>{repo.issues}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {repo.critical > 0 ? (
                          <span className="text-red-400 font-medium">{repo.critical}</span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {repo.high > 0 ? (
                          <span className="text-orange-400 font-medium">{repo.high}</span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${riskLevel}`}>
                          {riskLabel}
                          {riskScore > 15 && <ChevronUp className="w-3 h-3" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Live Banner ────────────────────────────────────────────────── */}
        <motion.div 
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="rounded-2xl p-8 text-center relative overflow-hidden border border-white/10"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-primary/5" />
          <div className="relative">
            <p className="text-text-muted mb-2 text-sm">Today's Impact</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ color: '#fff' }}>
              MergeMind saved{' '}
              <span className="text-emerald-400">
                <AnimatedCounter value={stats.today.hoursSaved} duration={2500} />
                {' '}hours
              </span>
              {' '}of manual review time today.
            </h2>
            <p className="text-text-muted">
              Across {stats.today.prs} pull requests · {stats.today.issues} issues automatically identified
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
