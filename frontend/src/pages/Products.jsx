import { useState, useEffect } from 'react';
import api from '../api';
import Icon from '../components/icons';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [form, setForm] = useState({
    name: '', brand: '', model: '', category_id: '', unit_price: '', cost_price: '', unit: 'pieces', description: '', specs: '{}'
  });

  const fetchProducts = () => {
    setLoading(true);
    const params = {};
    if (selectedCategory) params.category = selectedCategory;
    if (search) params.search = search;
    api.get('/products', { params })
      .then(r => setProducts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchCategories = () => {
    api.get('/products/categories')
      .then(r => setCategories(r.data))
      .catch(console.error);
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [selectedCategory, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...form,
        unit_price: parseFloat(form.unit_price),
        cost_price: parseFloat(form.cost_price) || 0,
        specs: JSON.parse(form.specs || '{}'),
      });
      setShowCreate(false);
      setForm({ name: '', brand: '', model: '', category_id: '', unit_price: '', cost_price: '', unit: 'pieces', description: '', specs: '{}' });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create product');
    }
  };

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/products/${id}`, { is_active: !current });
      fetchProducts();
    } catch (err) {
      alert('Failed to update product');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/products/import', fd);
      setImportMsg(`Imported ${r.data.created} product(s)${r.data.skipped ? `, skipped ${r.data.skipped}` : ''}`);
      e.target.reset();
      fetchProducts();
      fetchCategories();
    } catch (err) {
      setImportMsg(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const grouped = {};
  products.forEach(p => {
    const cat = p.category_name || 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Products & Prices</h1>
          <p className="page-sub mt-1">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowImport(!showImport); setShowCreate(false); }} className="btn-secondary">
            <Icon name="download" size={15} />
            {showImport ? 'Cancel' : 'Import CSV'}
          </button>
          <button onClick={() => { setShowCreate(!showCreate); setShowImport(false); }} className="btn-brand">
            <Icon name={showCreate ? 'x' : 'plus'} size={16} />
            {showCreate ? 'Cancel' : 'Add Product'}
          </button>
        </div>
      </div>

      {showImport && (
        <div className="card card-pad">
          <div className="flex items-start gap-3">
            <div className="icon-tile bg-amber-50 text-amber-600">
              <Icon name="download" size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Import products from CSV</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload a CSV with columns: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">name, category, brand, model, unit, unit_price, cost_price, description</code>
                — new categories are created automatically. Unit price is required.
              </p>
              <form onSubmit={handleImport} className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  required
                />
                <button type="submit" className="btn-primary" disabled={importing}>
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </form>
              {importMsg && <p className="mt-2 text-sm text-slate-600">{importMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="card card-pad space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Category *</label>
              <select className="input-field" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Name *</label>
              <input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input-field" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input-field" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
            </div>
            <div>
              <label className="label">Unit Price *</label>
              <input className="input-field" type="number" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} required />
            </div>
            <div>
              <label className="label">Cost Price</label>
              <input className="input-field" type="number" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input-field" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                <option value="pieces">Pieces</option>
                <option value="meters">Meters</option>
                <option value="sets">Sets</option>
                <option value="kW">kW</option>
                <option value="trips">Trips</option>
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input-field" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Add Product</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-10"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${!selectedCategory ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${selectedCategory === c.id ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products by Category */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="table-wrap">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Icon name="package" size={15} className="text-slate-400" />
                <h3 className="font-semibold text-slate-800">{cat}</h3>
                <span className="badge bg-slate-200/70 text-slate-500 ml-1">{items.length}</span>
              </div>
              <table className="data-table">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-2 font-medium text-gray-500">Product</th>
                    <th className="text-left px-5 py-2 font-medium text-gray-500">Brand</th>
                    <th className="text-left px-5 py-2 font-medium text-gray-500">Model</th>
                    <th className="text-right px-5 py-2 font-medium text-gray-500">Price</th>
                    <th className="text-right px-5 py-2 font-medium text-gray-500">Cost</th>
                    <th className="text-right px-5 py-2 font-medium text-gray-500">Margin</th>
                    <th className="text-center px-5 py-2 font-medium text-gray-500">Status</th>
                    <th className="text-center px-5 py-2 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => {
                    const margin = p.cost_price > 0 ? Math.round(((p.unit_price - p.cost_price) / p.unit_price) * 100) : 0;
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-5 py-3 text-gray-600">{p.brand || '—'}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{p.model || '—'}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          Rs {Number(p.unit_price).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          Rs {Number(p.cost_price).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            margin > 15 ? 'bg-green-100 text-green-700' :
                            margin > 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => toggleActive(p.id, p.is_active)}
                            className="text-xs text-orange-600 hover:text-orange-800"
                          >
                            {p.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}