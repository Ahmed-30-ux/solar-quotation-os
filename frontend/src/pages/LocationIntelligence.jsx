import { useState } from 'react';
import Icon from '../components/icons';

const CITIES = [
  {
    name: 'Lahore',
    irradiance: 5.2,
    climate: 'Hot dry climate',
    panelType: 'Mono-crystalline PERC',
    considerations: 'High dust levels require regular panel cleaning. Optimal tilt angle 25-30°.',
    transportRate: 1500,
    laborRate: 12000,
  },
  {
    name: 'Karachi',
    irradiance: 5.5,
    climate: 'Coastal (salt-resistant materials needed)',
    panelType: 'Mono-crystalline with anti-corrosion coating',
    considerations: 'High humidity and salt air. Use marine-grade mounting hardware and IP67 components.',
    transportRate: 2000,
    laborRate: 14000,
  },
  {
    name: 'Islamabad',
    irradiance: 4.8,
    climate: 'Moderate climate',
    panelType: 'Mono-crystalline PERC',
    considerations: 'Moderate conditions with occasional fog in winter. Good year-round performance.',
    transportRate: 1800,
    laborRate: 13000,
  },
  {
    name: 'Faisalabad',
    irradiance: 5.3,
    climate: 'Industrial area',
    panelType: 'Mono-crystalline PERC',
    considerations: 'Industrial pollution may reduce panel efficiency. Schedule quarterly cleanings.',
    transportRate: 1600,
    laborRate: 11000,
  },
  {
    name: 'Multan',
    irradiance: 5.6,
    climate: 'Extreme heat',
    panelType: 'Mono-crystalline with high temp tolerance',
    considerations: 'Extreme summer temperatures (45°C+). Use micro-inverters for heat management.',
    transportRate: 1700,
    laborRate: 10500,
  },
  {
    name: 'Peshawar',
    irradiance: 5.0,
    climate: 'Moderate',
    panelType: 'Mono-crystalline PERC',
    considerations: 'Good solar conditions with mild winters. Standard installation recommended.',
    transportRate: 2200,
    laborRate: 11500,
  },
  {
    name: 'Quetta',
    irradiance: 5.8,
    climate: 'High altitude',
    panelType: 'Mono-crystalline PERC',
    considerations: 'Highest irradiance in Pakistan. High altitude requires UV-resistant materials.',
    transportRate: 2500,
    laborRate: 12500,
  },
];

function CityCard({ city }) {
  return (
    <div className="card card-pad flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Icon name="mapPin" size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{city.name}</h3>
            <p className="text-xs text-slate-500">{city.climate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber-400 tabular-nums">{city.irradiance}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">kWh/m²/day</p>
        </div>
      </div>

      <div className="space-y-2.5 flex-1">
        <div className="p-2.5 rounded-lg bg-surface-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Recommended Panel</p>
          <p className="text-xs text-slate-200">{city.panelType}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Considerations</p>
          <p className="text-xs text-slate-400 leading-relaxed">{city.considerations}</p>
        </div>
      </div>
    </div>
  );
}

export default function LocationIntelligence() {
  const [search, setSearch] = useState('');
  const [rates, setRates] = useState(
    CITIES.map((c) => ({
      city: c.name,
      transportRate: c.transportRate,
      laborRate: c.laborRate,
    }))
  );

  const filteredCities = CITIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.climate.toLowerCase().includes(search.toLowerCase())
  );

  const updateRate = (index, field, value) => {
    const copy = [...rates];
    copy[index] = { ...copy[index], [field]: parseInt(value) || 0 };
    setRates(copy);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-heading">Location Intelligence</h1>
        <p className="page-sub mt-1">Solar irradiance data and regional pricing for Pakistani cities</p>
      </div>

      {/* Map Placeholder */}
      <div className="card overflow-hidden">
        <div className="relative h-[260px] bg-surface-3 flex flex-col items-center justify-center">
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 800 260" className="w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f59e0b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="800" height="260" fill="url(#grid)" />
              <circle cx="400" cy="130" r="100" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="400" cy="130" r="200" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <div className="relative z-10 text-center">
            <Icon name="mapPin" size={40} className="text-amber-400/60 mx-auto mb-3" />
            <p className="text-lg font-semibold text-white/80">Map Integration</p>
            <p className="text-sm text-slate-500 mt-1">Google Maps / Mapbox integration point</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search city or climate type..."
          className="input !pl-10"
        />
      </div>

      {/* City Cards */}
      <div>
        <h2 className="font-semibold text-white mb-4">City Solar Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCities.map((city) => (
            <CityCard key={city.name} city={city} />
          ))}
          {filteredCities.length === 0 && (
            <div className="col-span-full card card-pad text-center py-12 text-slate-500">
              No cities match your search
            </div>
          )}
        </div>
      </div>

      {/* Location Rates Admin */}
      <div className="card card-pad">
        <div className="flex items-center gap-2 mb-5">
          <Icon name="settings" size={16} className="text-amber-400" />
          <h2 className="font-semibold text-white">Location Rates</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">Configure transportation and labor rates per city</p>
        <div className="table-wrap !border-0 !shadow-none">
          <table className="data-table">
            <thead>
              <tr>
                <th>City</th>
                <th className="text-right">Transport Rate (Rs)</th>
                <th className="text-right">Labor Rate (Rs/kW)</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r, i) => (
                <tr key={r.city}>
                  <td className="font-medium text-white">
                    <div className="flex items-center gap-2">
                      <Icon name="mapPin" size={14} className="text-amber-400" />
                      {r.city}
                    </div>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      value={r.transportRate}
                      onChange={(e) => updateRate(i, 'transportRate', e.target.value)}
                      className="input !w-28 text-right !py-1.5 !text-xs"
                    />
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      value={r.laborRate}
                      onChange={(e) => updateRate(i, 'laborRate', e.target.value)}
                      className="input !w-28 text-right !py-1.5 !text-xs"
                    />
                  </td>
                  <td className="text-right">
                    <button className="btn-secondary btn-xs">
                      <Icon name="check" size={13} />
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn-primary">
            <Icon name="download" size={16} />
            Save All Rates
          </button>
        </div>
      </div>
    </div>
  );
}
