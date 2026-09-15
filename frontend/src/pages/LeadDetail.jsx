import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const STATUS_OPTIONS = [
  'new', 'bill_uploaded', 'qualifying', 'qualified', 'quoted', 'interested',
  'negotiating', 'site_visit_scheduled', 'site_visit_done', 'contract_signed',
  'under_installation', 'installed', 'completed', 'dormant', 'lost'
];

const STATUS_BADGES = {
  new: 'bg-blue-100 text-blue-700',
  quoted: 'bg-orange-100 text-orange-700',
  interested: 'bg-green-100 text-green-700',
  negotiating: 'bg-teal-100 text-teal-700',
  won: 'bg-green-200 text-green-800',
  lost: 'bg-red-100 text-red-700',
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchLead = () => {
    setLoading(true);
    api.get(`/leads/${id}`)
      .then(r => setLead(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLead(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      setLead(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const generateQuotation = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/quotations/generate', { lead_id: id });
      alert(`Quotation ${res.data.quotation.reference_number} generated! Total: Rs ${Number(res.data.quotation.total).toLocaleString()}`);
      fetchLead();
      navigate(`/quotations/${res.data.quotation.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate quotation');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!lead) return <div className="text-center py-10 text-red-500">Lead not found</div>;

  const activities = lead.activities || [];
  const quotations = lead.quotations || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/leads')} className="btn-secondary text-sm px-3">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.customer_name || 'Unknown Lead'}</h1>
            <p className="text-sm text-gray-500">{lead.customer_phone} · {lead.customer_city}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {lead.status !== 'won' && lead.status !== 'lost' && (
            <button onClick={generateQuotation} disabled={generating} className="btn-primary disabled:opacity-50">
              {generating ? 'Generating...' : '⚡ Generate Quotation'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Customer Requirements</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Monthly Consumption</p>
                <p className="font-medium">{lead.monthly_consumption ? `${lead.monthly_consumption} kWh` : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-400">System Type</p>
                <p className="font-medium capitalize">{lead.system_type?.replace(/_/g, ' ') || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-400">Roof Area</p>
                <p className="font-medium">{lead.roof_area ? `${lead.roof_area} sq ft` : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-400">Budget</p>
                <p className="font-medium">
                  {lead.budget_min ? `Rs ${Number(lead.budget_min).toLocaleString()} - ${Number(lead.budget_max).toLocaleString()}` : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Battery Required</p>
                <p className="font-medium">{lead.battery_required ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-400">Panel Preference</p>
                <p className="font-medium">{lead.panel_preference || 'No preference'}</p>
              </div>
              <div>
                <p className="text-gray-400">Inverter Preference</p>
                <p className="font-medium">{lead.inverter_preference || 'No preference'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400">Appliances</p>
                <p className="font-medium">{lead.appliances || 'Not specified'}</p>
              </div>
              {lead.special_requirements && (
                <div className="col-span-3">
                  <p className="text-gray-400">Special Requirements</p>
                  <p className="font-medium">{lead.special_requirements}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quotations */}
          {quotations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Quotations</h2>
              <div className="space-y-3">
                {quotations.map(q => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => navigate(`/quotations/${q.id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{q.reference_number}</p>
                      <p className="text-xs text-gray-500">{q.system_size_kw} kW {q.system_type} · {q.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">Rs {Number(q.total).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('en-PK')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
            <select
              className="input-field"
              value={lead.status}
              onChange={e => handleStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-400">Temperature:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                lead.temperature === 'hot' ? 'bg-red-100 text-red-700' :
                lead.temperature === 'warm' ? 'bg-orange-100 text-orange-700' :
                lead.temperature === 'cooling' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {lead.temperature}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Assigned: {lead.assigned_to_name || 'Unassigned'}
            </p>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Activity Log</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400">No activity yet</p>
              ) : activities.map(a => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{a.description}</p>
                    <p className="text-xs text-gray-400">
                      {a.user_name && <span>{a.user_name} · </span>}
                      {new Date(a.created_at).toLocaleString('en-PK', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}