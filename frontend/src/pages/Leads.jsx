import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/icons';

const STATUSES = [
  { value: '', label: 'All', color: 'bg-slate-900 text-white' },
  { value: 'new', label: 'New', color: 'bg-sky-100 text-sky-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { value: 'quoted', label: 'Quoted', color: 'bg-amber-100 text-amber-700' },
  { value: 'interested', label: 'Interested', color: 'bg-orange-100 text-orange-700' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-violet-100 text-violet-700' },
  { value: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost', label: 'Lost', color: 'bg-rose-100 text-rose-700' },
];

const STATUS_BADGES = {
  new: 'bg-sky-100 text-sky-700',
  bill_uploaded: 'bg-purple-100 text-purple-700',
  qualifying: 'bg-amber-100 text-amber-700',
  qualified: 'bg-blue-100 text-blue-700',
  quoted: 'bg-amber-100 text-amber-700',
  interested: 'bg-orange-100 text-orange-700',
  negotiating: 'bg-violet-100 text-violet-700',
  site_visit_scheduled: 'bg-indigo-100 text-indigo-700',
  site_visit_done: 'bg-cyan-100 text-cyan-700',
  contract_signed: 'bg-emerald-100 text-emerald-700',
  under_installation: 'bg-fuchsia-100 text-fuchsia-700',
  installed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-200 text-emerald-800',
  dormant: 'bg-slate-100 text-slate-600',
  lost: 'bg-rose-100 text-rose-700',
};

const TEMP_BADGES = {
  hot: 'bg-rose-100 text-rose-700',
  warm: 'bg-orange-100 text-orange-700',
  cooling: 'bg-yellow-100 text-yellow-700',
  cold: 'bg-slate-100 text-slate-600',
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    customer_city: '', monthly_consumption: '', system_type: 'hybrid',
    roof_area: '', appliances: '',
  });
  const navigate = useNavigate();

  const fetchLeads = () => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    if (search) params.search = search;
    api.get('/leads', { params })
      .then((r) => setLeads(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, [filter, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leads', {
        ...form,
        monthly_consumption: form.monthly_consumption ? parseFloat(form.monthly_consumption) : null,
        roof_area: form.roof_area ? parseFloat(form.roof_area) : null,
      });
      setShowCreate(false);
      setForm({ customer_name: '', customer_phone: '', customer_email: '', customer_city: '', monthly_consumption: '', system_type: 'hybrid', roof_area: '', appliances: '' });
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create lead');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Leads</h1>
          <p className="page-sub mt-1">{leads.length} leads total</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-brand">
          <Icon name={showCreate ? 'x' : 'plus'} size={16} />
          {showCreate ? 'Cancel' : 'New Lead'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card card-pad space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.customer_city} onChange={(e) => setForm({ ...form, customer_city: e.target.value })} />
            </div>
            <div>
              <label className="label">Monthly Consumption (kWh)</label>
              <input className="input" type="number" value={form.monthly_consumption} onChange={(e) => setForm({ ...form, monthly_consumption: e.target.value })} />
            </div>
            <div>
              <label className="label">System Type</label>
              <select className="select" value={form.system_type} onChange={(e) => setForm({ ...form, system_type: e.target.value })}>
                <option value="hybrid">Hybrid</option>
                <option value="on_grid">On-Grid</option>
                <option value="off_grid">Off-Grid</option>
              </select>
            </div>
            <div>
              <label className="label">Roof Area (sq ft)</label>
              <input className="input" type="number" value={form.roof_area} onChange={(e) => setForm({ ...form, roof_area: e.target.value })} />
            </div>
            <div>
              <label className="label">Appliances</label>
              <input className="input" value={form.appliances} onChange={(e) => setForm({ ...form, appliances: e.target.value })} placeholder="2 AC, Fridge..." />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Create Lead</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-10"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                filter === s.value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {s.label}
              {s.value && (
                <span className="ml-1 opacity-60">
                  {filter === s.value ? leads.length : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>City</th>
              <th>Consumption</th>
              <th>System</th>
              <th>Status</th>
              <th className="text-right">Quotation</th>
              <th>Assigned</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No leads found</td></tr>
            ) : leads.map((l) => (
              <tr
                key={l.id}
                className="cursor-pointer"
                onClick={() => navigate(`/leads/${l.id}`)}
              >
                <td className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {l.customer_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-slate-900 font-semibold">{l.customer_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{l.customer_phone || l.customer_email || 'No contact'}</div>
                    </div>
                  </div>
                </td>
                <td className="text-slate-600">{l.customer_city || '—'}</td>
                <td className="text-slate-600">{l.monthly_consumption ? `${l.monthly_consumption} kWh` : '—'}</td>
                <td className="capitalize text-slate-600">{l.system_type?.replace(/_/g, ' ') || '—'}</td>
                <td>
                  <span className={`badge ${STATUS_BADGES[l.status] || 'bg-slate-100 text-slate-600'}`}>
                    {l.status?.replace(/_/g, ' ')}
                  </span>
                  {l.temperature && (
                    <span className={`badge ml-1 ${TEMP_BADGES[l.temperature] || 'bg-slate-100 text-slate-600'}`}>
                      <Icon name="flame" size={11} />
                      {l.temperature}
                    </span>
                  )}
                </td>
                <td className="text-right font-semibold text-slate-900 tabular-nums">
                  {l.quotation_amount ? `Rs ${Number(l.quotation_amount).toLocaleString()}` : <span className="font-normal text-slate-300">—</span>}
                </td>
                <td className="text-xs text-slate-500">{l.assigned_to_name || 'Unassigned'}</td>
                <td className="text-right text-slate-300">
                  <Icon name="chevronRight" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}