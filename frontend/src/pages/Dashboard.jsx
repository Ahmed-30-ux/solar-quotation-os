import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const STAGE_META = {
  new: { label: 'New', color: '#38bdf8', count: 0, value: 0 },
  qualified: { label: 'Qualified', color: '#60a5fa', count: 0, value: 0 },
  quoted: { label: 'Quoted', color: '#fbbf24', count: 0, value: 0 },
  interested: { label: 'Interested', color: '#fb923c', count: 0, value: 0 },
  negotiating: { label: 'Negotiating', color: '#a78bfa', count: 0, value: 0 },
  won: { label: 'Won', color: '#34d399', count: 0, value: 0 },
  lost: { label: 'Lost', color: '#f87171', count: 0, value: 0 },
};

const STATUS_COLORS = ['#38bdf8', '#60a5fa', '#fbbf24', '#fb923c', '#a78bfa', '#34d399', '#f87171'];

function StatCard({ label, value, sub, icon, trend, trendUp }) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center text-amber-400 shrink-0">
          <Icon name={icon} size={18} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            <Icon name={trendUp ? 'trendUp' : 'trendDown'} size={12} /> {trend}%
          </span>
          <span className="text-[11px] text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-slate-400">
          {p.name}: <span className="text-white font-medium">{typeof p.value === 'number' && p.name !== 'Leads' ? `Rs ${p.value.toLocaleString()}` : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/overview')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-500">Loading dashboard…</div>;
  if (!data) return <div className="text-center py-20 text-rose-400">Failed to load dashboard</div>;

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

  const conversionRate = parseInt(stats.total_leads || 0) > 0
    ? Math.round((parseInt(stats.won || 0) / parseInt(stats.total_leads || 1)) * 100)
    : 0;

  // Chart data
  const pipelineChartData = pipelineStages.map((s) => ({
    name: STAGE_META[s].label,
    Leads: statusGroups[s]?.count || 0,
    Value: statusGroups[s]?.value || 0,
  }));

  const pieData = pipelineStages
    .filter((s) => (statusGroups[s]?.count || 0) > 0)
    .map((s) => ({
      name: STAGE_META[s].label,
      value: statusGroups[s]?.count || 0,
    }));

  // Mock monthly data (in production, this comes from the API)
  const monthlyData = [
    { month: 'Jul', Leads: 12, Revenue: 2400000 },
    { month: 'Aug', Leads: 18, Revenue: 3600000 },
    { month: 'Sep', Leads: 24, Revenue: 5200000 },
    { month: 'Oct', Leads: 15, Revenue: 2800000 },
    { month: 'Nov', Leads: 22, Revenue: 4400000 },
    { month: 'Dec', Leads: stats.total_leads || 28, Revenue: stats.revenue || 5600000 },
  ];

  const activityIcon = {
    created: 'plus',
    quotation_generated: 'fileText',
    status_changed: 'activity',
    followup_sent: 'send',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-sub mt-1">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
            <Icon name="trendUp" size={13} />
            {conversionRate}% conversion
          </span>
          <button onClick={() => navigate('/leads')} className="btn-brand btn-xs">
            <Icon name="plus" size={14} />
            New Lead
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Total Leads" value={stats.total_leads || 0} sub={`${stats.new_this_month || 0} this month`} icon="users" trend={12} trendUp />
        <StatCard label="Pipeline Value" value={`Rs ${Number(pipeline.pipeline_value || 0).toLocaleString()}`} sub="open opportunities" icon="wallet" trend={8} trendUp />
        <StatCard label="Won Deals" value={pipeline.won || 0} sub={`Rs ${Number(pipeline.won_value || 0).toLocaleString()}`} icon="checkCircle" trend={15} trendUp />
        <StatCard label="Quotations" value={quoteStats.total || 0} sub={`${quoteStats.accepted || 0} accepted`} icon="fileText" />
        <StatCard label="Revenue" value={`Rs ${Number(stats.revenue || 0).toLocaleString()}`} sub="this month" icon="trendingUp" trend={22} trendUp />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Bar Chart */}
        <div className="card card-pad lg:col-span-2">
          <h2 className="font-semibold text-white mb-4">Sales Pipeline</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#1e2d4d' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#1e2d4d' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Leads" radius={[6, 6, 0, 0]}>
                  {pipelineChartData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card card-pad">
          <h2 className="font-semibold text-white mb-4">Lead Distribution</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[pipelineStages.findIndex((s) => STAGE_META[s].label === entry.name)] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[pipelineStages.findIndex((s) => STAGE_META[s].label === d.name)] || '#64748b' }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="font-semibold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Area Chart */}
      <div className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Revenue & Leads Trend</h2>
          <span className="text-xs text-slate-500">Last 6 months</span>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#1e2d4d' }} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#1e2d4d' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#1e2d4d' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="Revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="Leads" stroke="#38bdf8" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Activity</h2>
            <button onClick={() => navigate('/leads')} className="text-xs text-amber-400 hover:text-amber-300">View all</button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {recent.slice(0, 8).map((a, i) => (
                <div key={a.id} className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center self-stretch">
                    <span className="icon-tile w-7 h-7 rounded-full bg-surface-3 text-slate-500 group-hover:bg-amber-500/15 group-hover:text-amber-400 transition-colors">
                      <Icon name={activityIcon[a.activity_type] || 'activity'} size={13} />
                    </span>
                    {i < Math.min(recent.length, 8) - 1 && <span className="w-px flex-1 bg-surface-4 my-1" />}
                  </div>
                  <div className="pt-1 pb-3 min-w-0">
                    <p className="text-[13px] text-slate-300 leading-snug">
                      <span className="font-medium text-white">{a.customer_name || 'Unknown'}</span>
                      <span className="text-slate-600"> — </span>
                      <span>{a.description}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {a.user_name && <span>{a.user_name} · </span>}
                      {new Date(a.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quotation Overview */}
        <div className="card card-pad">
          <h2 className="font-semibold text-white mb-4">Quotation Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-surface-3 px-4 py-3">
              <span className="icon-tile w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400">
                <Icon name="fileText" size={18} />
              </span>
              <div>
                <p className="stat-value !text-xl">{quoteStats.total || 0}</p>
                <p className="stat-label">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3">
              <span className="icon-tile w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400">
                <Icon name="check" size={18} />
              </span>
              <div>
                <p className="stat-value !text-xl">{quoteStats.accepted || 0}</p>
                <p className="stat-label">Accepted</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-sky-500/10 px-4 py-3">
              <span className="icon-tile w-10 h-10 rounded-lg bg-sky-500/15 text-sky-400">
                <Icon name="send" size={18} />
              </span>
              <div>
                <p className="stat-value !text-xl">{quoteStats.sent || 0}</p>
                <p className="stat-label">Sent</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-rose-500/10 px-4 py-3">
              <span className="icon-tile w-10 h-10 rounded-lg bg-rose-500/15 text-rose-400">
                <Icon name="xCircle" size={18} />
              </span>
              <div>
                <p className="stat-value !text-xl">{quoteStats.expired || 0}</p>
                <p className="stat-label">Expired</p>
              </div>
            </div>
          </div>

          {/* Conversion bar */}
          <div className="mt-5 rounded-xl bg-surface-3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Conversion Rate</span>
              <span className="text-xs font-bold text-amber-400">{conversionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                style={{ width: `${Math.min(conversionRate, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{stats.won || 0} won of {stats.total_leads || 0} leads</span>
              <span>Target: 25%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
