import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/icons';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-sky-100 text-sky-700',
  viewed: 'bg-violet-100 text-violet-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  expired: 'bg-rose-100 text-rose-700',
  accepted_with_changes: 'bg-emerald-100 text-emerald-700',
};

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
];

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const fetchQuotations = () => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    api.get('/quotations', { params })
      .then((r) => setQuotations(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuotations(); }, [filter]);

  const downloadPdf = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to download PDF');
    }
  };

  const markStatus = async (e, id, status) => {
    e.stopPropagation();
    try {
      await api.put(`/quotations/${id}/status`, { status });
      fetchQuotations();
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Quotations</h1>
          <p className="page-sub mt-1">{quotations.length} total quotations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((s) => (
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
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : quotations.length === 0 ? (
        <div className="card card-pad text-center py-16">
          <span className="mx-auto icon-tile w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Icon name="fileText" size={24} />
          </span>
          <p className="text-slate-600 font-medium">No quotations yet</p>
          <p className="text-sm text-slate-400 mt-1">Generate one from any lead.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quotations.map((q) => (
            <div
              key={q.id}
              className="card card-pad card-hover cursor-pointer flex flex-col"
              onClick={() => navigate(`/quotations/${q.id}`)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[12.5px] text-slate-400 font-medium">{q.reference_number}</span>
                <span className={`badge ${STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-600'}`}>
                  {q.status?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mb-4">
                <p className="font-semibold text-slate-900">{q.customer_name || 'Unknown'}</p>
                <p className="text-[13px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Icon name="mapPin" size={12} /> {q.customer_city || '—'} · {q.customer_phone}
                </p>
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">System</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {q.system_size_kw} kW <span className="capitalize font-normal text-slate-500">{q.system_type?.replace(/_/g, ' ')}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total</p>
                  <p className="text-lg font-bold text-amber-600 tabular-nums">Rs {Number(q.total).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                <span className="text-xs text-slate-400">
                  {new Date(q.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {q.status === 'sent' && (
                    <button
                      onClick={(e) => markStatus(e, q.id, 'accepted')}
                      className="btn-secondary btn-xs !bg-emerald-50 !text-emerald-700 !border-emerald-100 hover:!bg-emerald-100 hover:!border-emerald-200"
                    >
                      <Icon name="check" size={13} /> Accept
                    </button>
                  )}
                  <button
                    onClick={(e) => downloadPdf(e, q.id)}
                    className="btn-secondary btn-xs"
                    title="Download PDF"
                  >
                    <Icon name="download" size={13} /> PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}