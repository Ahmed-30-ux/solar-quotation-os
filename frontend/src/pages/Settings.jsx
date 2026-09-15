import { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
  const [company, setCompany] = useState(null);
  const [pricingRules, setPricingRules] = useState({});
  const [sizingRules, setSizingRules] = useState([]);
  const [template, setTemplate] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('company');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [co, pr, sr, tm, tl] = await Promise.all([
        api.get('/settings/company'),
        api.get('/settings/pricing-rules'),
        api.get('/settings/sizing-rules'),
        api.get('/settings/team'),
        api.get('/settings/template'),
      ]);
      setCompany(co.data);
      setPricingRules(pr.data);
      setSizingRules(sr.data);
      setTeam(tm.data);
      setTemplate(tl.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const saveCompany = async () => {
    setSaving(true);
    try {
      await api.put('/settings/company', company);
      alert('Company settings saved');
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const savePricingRules = async () => {
    setSaving(true);
    try {
      await api.put('/settings/pricing-rules', pricingRules);
      alert('Pricing rules saved');
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveSizingRules = async () => {
    setSaving(true);
    try {
      await api.put('/settings/sizing-rules', sizingRules);
      alert('Sizing rules saved');
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await api.put('/settings/template', template);
      alert('Template saved');
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addTeamMember = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    if (!name || !email) return;
    try {
      await api.post('/settings/team', { name, email });
      form.reset();
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading settings...</div>;

  const tabs = [
    { id: 'company', label: 'Company Profile' },
    { id: 'pricing', label: 'Pricing Rules' },
    { id: 'sizing', label: 'Sizing Rules' },
    { id: 'template', label: 'Quotation Template' },
    { id: 'team', label: 'Team Members' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Company Profile */}
      {tab === 'company' && company && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Company Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input className="input-field" value={company.name || ''} onChange={e => setCompany({...company, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={company.phone || ''} onChange={e => setCompany({...company, phone: e.target.value})} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" value={company.email || ''} onChange={e => setCompany({...company, email: e.target.value})} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input-field" value={company.city || ''} onChange={e => setCompany({...company, city: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input-field" value={company.address || ''} onChange={e => setCompany({...company, address: e.target.value})} />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input className="input-field" value={company.gst_number || ''} onChange={e => setCompany({...company, gst_number: e.target.value})} />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input-field" value={company.website || ''} onChange={e => setCompany({...company, website: e.target.value})} />
            </div>
            <div>
              <label className="label">Logo (appears on quotation PDFs)</label>
              <div className="flex items-center gap-3">
                {company.logo_data ? (
                  <img
                    src={company.logo_data}
                    alt="logo preview"
                    className="h-10 w-10 object-contain rounded border border-gray-200 bg-white"
                  />
                ) : (
                  <div className="h-10 w-10 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs">none</div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="input-field"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      alert('Logo must be under 1MB. Use a small PNG or JPG.');
                      e.target.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setCompany({...company, logo_data: reader.result});
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="label">Brand Color (quotation PDF accent)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(company.brand_color || '') ? company.brand_color : '#f59e0b'}
                  onChange={e => setCompany({...company, brand_color: e.target.value})}
                  className="h-10 w-14 rounded border border-gray-200 bg-white cursor-pointer"
                />
                <input
                  className="input-field font-mono"
                  value={company.brand_color || '#f59e0b'}
                  onChange={e => setCompany({...company, brand_color: e.target.value})}
                />
              </div>
            </div>
          </div>
          <button onClick={saveCompany} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Pricing Rules */}
      {tab === 'pricing' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Company Margin (%)</label>
              <input className="input-field" type="number" value={pricingRules.margin_percentage || ''} onChange={e => setPricingRules({...pricingRules, margin_percentage: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Tax / GST (%)</label>
              <input className="input-field" type="number" value={pricingRules.tax_percentage || ''} onChange={e => setPricingRules({...pricingRules, tax_percentage: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Installation Cost (Rs/kW)</label>
              <input className="input-field" type="number" value={pricingRules.installation_per_kw || ''} onChange={e => setPricingRules({...pricingRules, installation_per_kw: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Transportation (Rs flat)</label>
              <input className="input-field" type="number" value={pricingRules.transport_flat || ''} onChange={e => setPricingRules({...pricingRules, transport_flat: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
          <button onClick={savePricingRules} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Pricing Rules'}
          </button>
        </div>
      )}

      {/* Sizing Rules */}
      {tab === 'sizing' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Sizing Rules</h2>
            <button
              onClick={() => setSizingRules([...sizingRules, {
                name: '', min_consumption: 0, max_consumption: 300, recommended_system_kw: 3, system_type: 'hybrid'
              }])}
              className="btn-secondary text-sm"
            >
              + Add Rule
            </button>
          </div>
          <div className="space-y-3">
            {sizingRules.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input className="input-field w-48" value={r.name} onChange={e => {
                  const copy = [...sizingRules]; copy[i] = {...copy[i], name: e.target.value}; setSizingRules(copy);
                }} placeholder="Rule name" />
                <input className="input-field w-28" type="number" value={r.min_consumption} onChange={e => {
                  const copy = [...sizingRules]; copy[i] = {...copy[i], min_consumption: parseFloat(e.target.value)}; setSizingRules(copy);
                }} placeholder="Min kWh" />
                <span className="text-gray-400">to</span>
                <input className="input-field w-28" type="number" value={r.max_consumption} onChange={e => {
                  const copy = [...sizingRules]; copy[i] = {...copy[i], max_consumption: parseFloat(e.target.value)}; setSizingRules(copy);
                }} placeholder="Max kWh" />
                <input className="input-field w-28" type="number" value={r.recommended_system_kw} onChange={e => {
                  const copy = [...sizingRules]; copy[i] = {...copy[i], recommended_system_kw: parseFloat(e.target.value)}; setSizingRules(copy);
                }} placeholder="kW" />
                <select className="input-field w-32" value={r.system_type} onChange={e => {
                  const copy = [...sizingRules]; copy[i] = {...copy[i], system_type: e.target.value}; setSizingRules(copy);
                }}>
                  <option value="hybrid">Hybrid</option>
                  <option value="on_grid">On-Grid</option>
                  <option value="off_grid">Off-Grid</option>
                </select>
                <button onClick={() => setSizingRules(sizingRules.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={saveSizingRules} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Sizing Rules'}
          </button>
        </div>
      )}

      {/* Template */}
      {tab === 'template' && template && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Quotation Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Template Name</label>
              <input className="input-field" value={template.name || ''} onChange={e => setTemplate({...template, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Validity (days)</label>
              <input className="input-field" type="number" value={template.validity_days || 15} onChange={e => setTemplate({...template, validity_days: parseInt(e.target.value)})} />
            </div>
            <div className="col-span-2">
              <label className="label">Terms & Conditions</label>
              <textarea className="input-field" rows={8} value={template.terms_conditions || ''} onChange={e => setTemplate({...template, terms_conditions: e.target.value})} />
            </div>
          </div>
          <button onClick={saveTemplate} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      )}

      {/* Team */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Team Members</h2>
            {team.length === 0 ? (
              <p className="text-sm text-gray-400">No team members yet</p>
            ) : (
              <div className="space-y-2">
                {team.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm">
                        {m.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={addTeamMember} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Add Team Member</h3>
            <div className="flex gap-3">
              <input name="name" className="input-field" placeholder="Name" required />
              <input name="email" type="email" className="input-field" placeholder="Email" required />
              <button type="submit" className="btn-primary">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}