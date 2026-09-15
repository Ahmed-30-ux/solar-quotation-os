import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/quotations/${id}`)
      .then(r => setQuotation(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quotation.reference_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to download PDF');
    }
  };

  const markStatus = async (status) => {
    try {
      await api.put(`/quotations/${id}/status`, { status });
      setQuotation(prev => ({ ...prev, status }));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!quotation) return <div className="text-center py-10 text-red-500">Quotation not found</div>;

  const items = quotation.items || [];
  const equipment = items.filter(i => i.item_type === 'equipment');
  const services = items.filter(i => i.item_type === 'service');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotations')} className="btn-secondary text-sm px-3">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quotation.reference_number}</h1>
            <p className="text-sm text-gray-500">
              {quotation.customer_name} · {quotation.customer_city} · Created {new Date(quotation.created_at).toLocaleDateString('en-PK')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPdf} className="btn-primary">Download PDF</button>
          {quotation.status === 'draft' && (
            <button onClick={() => markStatus('sent')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Send to Customer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Recommendation */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">☀️</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{quotation.system_size_kw} kW {quotation.system_type === 'hybrid' ? 'Hybrid' : quotation.system_type === 'on_grid' ? 'On-Grid' : 'Off-Grid'} System</h2>
                <p className="text-sm text-gray-500">Recommended based on {quotation.monthly_consumption || 'N/A'} kWh/month consumption</p>
              </div>
            </div>
          </div>

          {/* Equipment Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Equipment</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-2 font-medium text-gray-500">Item</th>
                  <th className="text-right px-5 py-2 font-medium text-gray-500">Qty</th>
                  <th className="text-right px-5 py-2 font-medium text-gray-500">Unit Price</th>
                  <th className="text-right px-5 py-2 font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{item.quantity} {item.unit}</td>
                    <td className="px-5 py-3 text-right text-gray-600">Rs {Number(item.unit_price).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">Rs {Number(item.total_price).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td colSpan={3} className="px-5 py-2 text-right text-gray-600">Equipment Subtotal</td>
                  <td className="px-5 py-2 text-right text-gray-900">Rs {Number(quotation.equipment_subtotal).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Services</h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {services.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">{item.quantity} {item.unit}</td>
                      <td className="px-5 py-3 text-right text-gray-600">Rs {Number(item.unit_price).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">Rs {Number(item.total_price).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={3} className="px-5 py-2 text-right text-gray-600">Services Subtotal</td>
                    <td className="px-5 py-2 text-right text-gray-900">Rs {Number(quotation.services_subtotal).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cost Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Equipment</span>
                <span>Rs {Number(quotation.equipment_subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Services</span>
                <span>Rs {Number(quotation.services_subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>Rs {Number(quotation.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin ({quotation.margin_percentage}%)</span>
                <span>Rs {Number(quotation.margin_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({quotation.tax_percentage}%)</span>
                <span>Rs {Number(quotation.tax_amount).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-orange-600">Rs {Number(quotation.total).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings */}
          <div className="bg-green-50 rounded-xl border border-green-100 p-5">
            <h3 className="font-semibold text-green-800 mb-3">Savings Projection</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Monthly Savings</span>
                <span className="font-bold text-green-800">Rs {Number(quotation.monthly_savings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Annual Savings</span>
                <span className="font-bold text-green-800">Rs {Number(quotation.annual_savings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Payback Period</span>
                <span className="font-bold text-green-800">{quotation.payback_years} years</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
            <select
              className="input-field"
              value={quotation.status}
              onChange={e => markStatus(e.target.value)}
            >
              {['draft', 'sent', 'viewed', 'accepted', 'revision_requested', 'expired'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">Valid until: {new Date(quotation.valid_until).toLocaleDateString('en-PK')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}