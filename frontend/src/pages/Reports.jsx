import { useState, useEffect } from 'react';
import api from '../api';
import Icon from '../components/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const DATE_RANGES = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
];

const PIE_COLORS = ['#38bdf8', '#60a5fa', '#fbbf24', '#fb923c', '#a78bfa', '#34d399', '#f87171'];
const STAGE_COLORS = { new: '#38bdf8', qualified: '#60a5fa', quoted: '#fbbf24', won: '#34d399', lost: '#f87171' };

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

function StatCard({ label, value, icon, sub }) {
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
    </div>
  );
}

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [leadStats, setLeadStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('this_month');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard/overview'),
      api.get('/leads/stats'),
      api.get('/leads'),
    ])
      .then(([ov, ls, ld]) => {
        setOverview(ov.data);
        setLeadStats(ls.data);
        setLeads(ld.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange]);

  if (loading) return <div className="text-center py-20 text-slate-500">Loading reports…</div>;

  const stats = overview?.month_stats || {};
  const pipeline = overview?.pipeline || {};
  const quoteStats = overview?.quotation_stats || {};

  const totalRevenue = parseInt(stats.revenue || 0);
  const avgQuotation = quoteStats.total > 0 ? Math.round(totalRevenue / quoteStats.total) : 0;
  const totalLeads = parseInt(stats.total_leads || 0);
  const wonLeads = parseInt(stats.won || 0);
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Leads by source
  const sourceGroups = {};
  leads.forEach((l) => {
    const src = l.lead_source || 'Unknown';
    if (!sourceGroups[src]) sourceGroups[src] = 0;
    sourceGroups[src]++;
  });
  const sourceData = Object.entries(sourceGroups)
    .map(([name, count]) => ({ name, Leads: count }))
    .sort((a, b) => b.Leads - a.Leads);

  // Top quotations by value
  const quotData = leads
    .filter((l) => l.quotation_amount)
    .sort((a, b) => parseFloat(b.quotation_amount) - parseFloat(a.quotation_amount))
    .slice(0, 10)
    .map((l) => ({
      name: l.customer_name?.substring(0, 12) || 'Unknown',
      Value: parseFloat(l.quotation_amount),
    }));

  // Status distribution
  const statusGroups = {};
  leads.forEach((l) => {
    const st = l.status || 'new';
    if (!statusGroups[st]) statusGroups[st] = 0;
    statusGroups[st]++;
  });
  const pieData = Object.entries(statusGroups)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value);

  // Conversion funnel
  const funnelStages = ['new', 'qualified', 'quoted', 'won'];
  const funnelData = funnelStages.map((s) => ({
    stage: s.replace(/_/g, ' '),
    count: statusGroups[s] || 0,
  }));

  const maxFunnel = Math.max(...funnelData.map((d) => d.count), 1);

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'City', 'Status', 'Consumption', 'System Type', 'Quotation'];
    const rows = leads.map((l) => [
      l.customer_name, l.customer_phone, l.customer_city, l.status,
      l.monthly_consumption, l.system_type, l.quotation_amount,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-heading">Reports & Analytics</h1>
          <p className="page-sub mt-1">Insights across your solar sales pipeline</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="select w-auto"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`Rs ${totalRevenue.toLocaleString()}`} icon="trendingUp" sub="cumulative" />
        <StatCard label="Avg Quotation Value" value={`Rs ${avgQuotation.toLocaleString()}`} icon="wallet" sub="per quotation" />
        <StatCard label="Win Rate" value={`${winRate}%`} icon="target" sub={`${wonLeads} of ${totalLeads} leads`} />
        <StatCard label="Total Quotations" value={quoteStats.total || 0} icon="fileText" sub={`${quoteStats.accepted || 0} accepted`} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <div className="card card-pad">
          <h2 className="font-semibold text-white mb-4">Leads by Source</h2>
          <div className="h-[280px]">
            {sourceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">No source data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e2d4d' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e2d4d' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Leads" radius={[6, 6, 0, 0]}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quotation Values */}
        <div className="card card-pad">
          <h2 className="font-semibold text-white mb-4">Top Quotation Values</h2>
          <div className="h-[280px]">
            {quotData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">No quotation data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quotData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e2d4d' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e2d4d' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Value" radius={[6, 6, 0, 0]}>
                    {quotData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Status Distribution - Pie Chart */}
        <div className="card card-pad">
          <h2 className="font-semibold text-white mb-4">Lead Status Distribution</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-slate-400 capitalize">{d.name}</span>
                </div>
                <span className="font-semibold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card card-pad">
          <h2 className="font-semibold text-white mb-4">Conversion Funnel</h2>
          <div className="h-[300px] flex flex-col justify-center gap-4 px-4">
            {funnelData.map((stage, i) => {
              const widthPct = maxFunnel > 0 ? (stage.count / maxFunnel) * 100 : 0;
              const colors = ['#38bdf8', '#60a5fa', '#fbbf24', '#34d399'];
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300 capitalize">{stage.stage}</span>
                    <span className="text-sm font-semibold text-white">{stage.count}</span>
                  </div>
                  <div className="h-8 rounded-lg bg-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                      style={{ width: `${Math.max(widthPct, 8)}%`, backgroundColor: colors[i] + '30', borderLeft: `3px solid ${colors[i]}` }}
                    >
                      <span className="text-xs font-semibold" style={{ color: colors[i] }}>
                        {stage.count > 0 ? `${i > 0 ? Math.round((stage.count / (funnelData[i - 1]?.count || stage.count)) * 100) : 100}%` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="text-center text-xs text-slate-500 mt-2">
              Drop-off: {funnelData[0].count > 0 ? Math.round(((funnelData[0].count - funnelData[funnelData.length - 1].count) / funnelData[0].count) * 100) : 0}% from New to Won
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Leads</h2>
          <button onClick={exportCSV} className="btn-secondary btn-xs">
            <Icon name="download" size={14} />
            Export CSV
          </button>
        </div>
        <div className="table-wrap !border-0 !shadow-none">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>City</th>
                <th>Status</th>
                <th>Consumption</th>
                <th>System</th>
                <th className="text-right">Quotation</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No leads found</td></tr>
              ) : (
                leads.slice(0, 10).map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium text-white">{l.customer_name || 'Unknown'}</td>
                    <td className="text-slate-400">{l.customer_city || '—'}</td>
                    <td>
                      <span className="badge bg-amber-500/15 text-amber-400">
                        {l.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-slate-400">{l.monthly_consumption ? `${l.monthly_consumption} kWh` : '—'}</td>
                    <td className="text-slate-400 capitalize">{l.system_type?.replace(/_/g, ' ') || '—'}</td>
                    <td className="text-right font-semibold text-white tabular-nums">
                      {l.quotation_amount ? `Rs ${Number(l.quotation_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="text-xs text-slate-500">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
