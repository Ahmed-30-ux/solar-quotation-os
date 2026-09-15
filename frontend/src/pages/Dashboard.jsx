import { useState, useEffect } from 'react';
import api from '../api';
import Icon from '../components/icons';

const STAGE_META = {
  new: { label: 'New', bar: 'bg-sky-400' },
  qualified: { label: 'Qualified', bar: 'bg-blue-500' },
  quoted: { label: 'Quoted', bar: 'bg-amber-400' },
  interested: { label: 'Interested', bar: 'bg-orange-500' },
  negotiating: { label: 'Negotiating', bar: 'bg-violet-400' },
  won: { label: 'Won', bar: 'bg-emerald-500' },
  lost: { label: 'Lost', bar: 'bg-rose-400' },
};

function StatCard({ label, value, sub, icon, tint }) {
  const tintMap = {
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };
  return (
    <div className="card card-pad flex items-start justify-between card-hover">
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value mt-1.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <span className={`icon-tile w-11 h-11 ring-1 ${tintMap[tint] || tintMap.sky}`}>
        <Icon name={icon} size={20} />
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/overview')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-slate-400">Loading dashboard…</div>;
  if (!data) return <div className="text-center py-16 text-rose-500">Failed to load dashboard</div>;

  const pipeline = data.pipeline || {};
  const stats = data.month_stats || {};
  const quoteStats = data.quotation_stats || {};
  const recent = data.recent_activity || [];

  const statusGroups = {};
  (data.leads || []).forEach((l) => {
    if (!statusGroups[l.status]) statusGroups[l.status] = { count: 0, value: 0 };
    statusGroups[l.status].count += parseInt(l.count);
    statusGroups[l.status].value += parseFloat(l.value);
  });

  const pipelineStages = ['new', 'qualified', 'quoted', 'interested', 'negotiating', 'won', 'lost'];
  const totalInFunnel = pipelineStages.reduce((sum, s) => sum + (statusGroups[s]?.count || 0), 0);
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const conversionRate = parseInt(stats.total_leads || 0) > 0
    ? Math.round((parseInt(stats.won || 0) / parseInt(stats.total_leads || 1)) * 100)
    : 0;

  const activityIcon = { created: 'plus', quotation_generated: 'fileText', status_changed: 'activity', followup_sent: 'send' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-sub mt-1">{today}</p>
        </div>
        <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon name="trendUp" size={13} />
          {conversionRate}% conversion
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="New Leads" value={pipeline.new_leads || 0} sub="awaiting qualification" icon="users" tint="sky" />
        <StatCard label="Active Quotes" value={pipeline.quoted || 0} sub={`${pipeline.negotiating || 0} negotiating right now`} icon="fileText" tint="amber" />
        <StatCard label="Won Deals" value={pipeline.won || 0} sub={`Rs ${Number(pipeline.won_value || 0).toLocaleString()} booked`} icon="checkCircle" tint="emerald" />
        <StatCard label="Pipeline Value" value={`Rs ${Number(pipeline.pipeline_value || 0).toLocaleString()}`} sub="open opportunities" icon="wallet" tint="violet" />
      </div>

      {/* Pipeline funnel */}
      <div className="card card-pad">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-900">Sales Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">{totalInFunnel} leads across all stages</p>
          </div>
        </div>

        <div className="flex h-9 rounded-xl overflow-hidden ring-1 ring-slate-200">
          {pipelineStages.map((s) => {
            const c = statusGroups[s]?.count || 0;
            if (!c) return null;
            const pct = Math.round((c / (totalInFunnel || 1)) * 100);
            return (
              <div key={s} className={`${STAGE_META[s].bar} relative min-w-[2.5rem] flex-1`} title={`${STAGE_META[s].label}: ${c}`}>
                {pct >= 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    {c}
                  </span>
                )}
              </div>
            );
          })}
          {totalInFunnel === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 bg-slate-50">No leads yet</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {pipelineStages.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-full ${STAGE_META[s].bar}`} />
              {STAGE_META[s].label}
              <span className="font-semibold text-slate-800 ml-0.5">{statusGroups[s]?.count || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="card card-pad">
          <h2 className="font-semibold text-slate-900 mb-4">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {recent.map((a, i) => (
                <div key={a.id} className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center self-stretch">
                    <span className="icon-tile w-7 h-7 rounded-full bg-slate-100 text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                      <Icon name={activityIcon[a.activity_type] || 'activity'} size={14} />
                    </span>
                    {i < recent.length - 1 && <span className="w-px flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="pt-1 pb-4 min-w-0">
                    <p className="text-[13px] text-slate-800 leading-snug">
                      <span className="font-medium text-slate-900">{a.customer_name || 'Unknown'}</span>
                      <span className="text-slate-400"> — </span>
                      <span>{a.description}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {a.user_name && <span>{a.user_name} · </span>}
                      {new Date(a.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quotation overview + revenue */}
        <div className="space-y-6">
          <div className="card card-pad">
            <h2 className="font-semibold text-slate-900 mb-4">Quotation Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="icon-tile w-10 h-10 rounded-lg bg-white text-amber-600 ring-1 ring-slate-200">
                  <Icon name="fileText" size={18} />
                </span>
                <div>
                  <p className="stat-value !text-xl">{quoteStats.total || 0}</p>
                  <p className="stat-label">Total quotations</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50/60 px-4 py-3">
                <span className="icon-tile w-10 h-10 rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-100">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <p className="stat-value !text-xl">{quoteStats.accepted || 0}</p>
                  <p className="stat-label">Accepted</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-amber-50/60 px-4 py-3">
                <span className="icon-tile w-10 h-10 rounded-lg bg-white text-amber-600 ring-1 ring-amber-100">
                  <Icon name="send" size={18} />
                </span>
                <div>
                  <p className="stat-value !text-xl">{quoteStats.sent || 0}</p>
                  <p className="stat-label">Awaiting response</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-rose-50/60 px-4 py-3">
                <span className="icon-tile w-10 h-10 rounded-lg bg-white text-rose-600 ring-1 ring-rose-100">
                  <Icon name="xCircle" size={18} />
                </span>
                <div>
                  <p className="stat-value !text-xl">{quoteStats.expired || 0}</p>
                  <p className="stat-label">Expired</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-slate-800 text-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] text-slate-400 font-medium">Revenue booked this month</p>
                <p className="text-[26px] font-bold tracking-tight mt-1 tabular-nums">
                  Rs {Number(stats.revenue || 0).toLocaleString()}
                </p>
              </div>
              <span className="icon-tile w-10 h-10 rounded-lg bg-white/10 text-amber-400">
                <Icon name="trendUp" size={20} />
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: `${Math.min(conversionRate, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{conversionRate}% lead-to-deal conversion</span>
              <span>{stats.won || 0} won of {stats.total_leads || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}