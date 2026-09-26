import { useState, useEffect, Fragment } from 'react';
import api from '../api';
import Icon from '../components/icons';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'materials_prepared', label: 'Materials Prepared' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  scheduled: 'bg-sky-500/20 text-sky-400',
  site_inspection: 'bg-violet-500/20 text-violet-400',
  materials_prepared: 'bg-amber-500/20 text-amber-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-rose-500/20 text-rose-400',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  site_inspection: 'Site Inspection',
  materials_prepared: 'Materials Prepared',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TYPE_LABELS = {
  on_grid: 'On-Grid',
  hybrid: 'Hybrid',
  off_grid: 'Off-Grid',
};

const CHECKLIST_ITEMS = [
  'Roof structural assessment',
  'Electrical panel inspection',
  'Shading analysis',
  'Roof measurements verified',
  'Permit requirements reviewed',
  'Utility interconnection check',
  'Access & safety review',
];

export default function Installations() {
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [leads, setLeads] = useState([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    lead_id: '',
    system_size: '',
    system_type: 'on_grid',
    scheduled_date: '',
    team_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchInstallations();
  }, [statusFilter]);

  const fetchInstallations = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/installations${params}`);
      setInstallations(res.data);
    } catch (err) {
      setInstallations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch {
      setLeads([]);
    }
  };

  const handleOpenNew = () => {
    setFormData({ lead_id: '', system_size: '', system_type: 'on_grid', scheduled_date: '', team_name: '', notes: '' });
    fetchLeads();
    setShowNewModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/installations', formData);
      setShowNewModal(false);
      fetchInstallations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create installation');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/installations/${id}`, { status: newStatus });
      fetchInstallations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleChecklistToggle = async (installationId, index) => {
    const installation = installations.find((i) => i.id === installationId);
    if (!installation) return;

    const checklist = [...(installation.checklist || [])];
    checklist[index] = !checklist[index];

    try {
      await api.put(`/installations/${installationId}/checklist`, { checklist });
      setInstallations((prev) =>
        prev.map((i) => (i.id === installationId ? { ...i, checklist } : i))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update checklist');
    }
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Icon name="wrench" className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Installation Management</h1>
            <p className="text-slate-400 text-sm">{installations.length} total installations</p>
          </div>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
        >
          <Icon name="plus" className="w-4 h-4" />
          New Installation
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-indigo-500 text-white'
                : 'bg-surface-3 text-slate-400 hover:bg-surface-4 hover:text-slate-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-2 rounded-2xl border border-surface-4 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : installations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Icon name="wrench" className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No installations found</p>
            <p className="text-sm">Create your first installation to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">System Size</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Team</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {installations.map((inst) => (
                <Fragment key={inst.id}>
                  <tr
                    onClick={() => toggleRow(inst.id)}
                    className="border-b border-surface-4 hover:bg-surface-3 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{inst.customer_name}</div>
                      <div className="text-slate-400 text-sm">{inst.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 text-white">{inst.system_size} kW</td>
                    <td className="px-6 py-4 text-slate-300">{TYPE_LABELS[inst.system_type] || inst.system_type}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {inst.scheduled_date ? new Date(inst.scheduled_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{inst.team_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inst.status] || ''}`}>
                        {STATUS_LABELS[inst.status] || inst.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={inst.status}
                        onChange={(e) => handleStatusChange(inst.id, e.target.value)}
                        className="bg-surface-3 text-slate-300 text-sm rounded-lg px-2 py-1 border border-surface-4 focus:outline-none focus:border-indigo-500"
                      >
                        {STATUS_OPTIONS.filter((s) => s.value !== 'all').map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedRow === inst.id && (
                    <tr>
                      <td colSpan={7} className="bg-surface-3 px-6 py-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Customer Details */}
                          <div className="space-y-3">
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              <Icon name="user" className="w-4 h-4 text-indigo-400" />
                              Customer Details
                            </h4>
                            <div className="bg-surface-2 rounded-xl p-4 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Name</span>
                                <span className="text-white">{inst.customer_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Email</span>
                                <span className="text-white">{inst.customer_email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Phone</span>
                                <span className="text-white">{inst.customer_phone || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Address</span>
                                <span className="text-white text-right max-w-[200px]">{inst.customer_address || '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* System Config */}
                          <div className="space-y-3">
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              <Icon name="zap" className="w-4 h-4 text-amber-400" />
                              System Configuration
                            </h4>
                            <div className="bg-surface-2 rounded-xl p-4 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-400">System Size</span>
                                <span className="text-white">{inst.system_size} kW</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Type</span>
                                <span className="text-white">{TYPE_LABELS[inst.system_type]}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Panel Count</span>
                                <span className="text-white">{inst.panel_count || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Inverter</span>
                                <span className="text-white">{inst.inverter_model || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Battery</span>
                                <span className="text-white">{inst.battery_spec || '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Site Inspection Checklist */}
                          <div className="space-y-3">
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              <Icon name="clipboard-check" className="w-4 h-4 text-emerald-400" />
                              Site Inspection Checklist
                            </h4>
                            <div className="bg-surface-2 rounded-xl p-4 space-y-2">
                              {CHECKLIST_ITEMS.map((item, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-center gap-3 text-sm cursor-pointer group"
                                  onClick={() => handleChecklistToggle(inst.id, idx)}
                                >
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      inst.checklist?.[idx]
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-surface-4 group-hover:border-slate-300'
                                    }`}
                                  >
                                    {inst.checklist?.[idx] && (
                                      <Icon name="check" className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <span className={inst.checklist?.[idx] ? 'text-slate-300 line-through' : 'text-slate-300'}>
                                    {item}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Materials List */}
                        {inst.materials && inst.materials.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              <Icon name="package" className="w-4 h-4 text-violet-400" />
                              Materials List
                            </h4>
                            <div className="bg-surface-2 rounded-xl p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {inst.materials.map((mat, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-surface-3 rounded-lg px-4 py-2.5 text-sm">
                                    <span className="text-slate-300">{mat.name}</span>
                                    <span className="text-white font-medium">x{mat.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {inst.notes && (
                          <div className="mt-6 space-y-3">
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              <Icon name="file-text" className="w-4 h-4 text-slate-400" />
                              Notes
                            </h4>
                            <div className="bg-surface-2 rounded-xl p-4 text-sm text-slate-300">{inst.notes}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Installation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-4">
              <h2 className="text-lg font-bold text-white">New Installation</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Lead / Customer</label>
                <select
                  required
                  value={formData.lead_id}
                  onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                  className="w-full bg-surface-3 text-white rounded-xl px-4 py-2.5 border border-surface-4 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a lead...</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} — {lead.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">System Size (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.system_size}
                    onChange={(e) => setFormData({ ...formData, system_size: e.target.value })}
                    className="w-full bg-surface-3 text-white rounded-xl px-4 py-2.5 border border-surface-4 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 10.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">System Type</label>
                  <select
                    value={formData.system_type}
                    onChange={(e) => setFormData({ ...formData, system_type: e.target.value })}
                    className="w-full bg-surface-3 text-white rounded-xl px-4 py-2.5 border border-surface-4 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="on_grid">On-Grid</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="off_grid">Off-Grid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full bg-surface-3 text-white rounded-xl px-4 py-2.5 border border-surface-4 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Team Name</label>
                  <input
                    type="text"
                    value={formData.team_name}
                    onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                    className="w-full bg-surface-3 text-white rounded-xl px-4 py-2.5 border border-surface-4 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Team Alpha"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-surface-3 text-white rounded-xl px-4 py-2.5 border border-surface-4 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Installation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 bg-surface-3 hover:bg-surface-4 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


