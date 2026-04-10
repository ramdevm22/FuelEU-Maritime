import React, { useEffect, useState } from 'react';
import { Route } from '../../core/domain/types';
import { getRoutes, setBaseline } from '../../adapters/infrastructure/api';
import { Badge, Button, Card, Select, Spinner, ErrorMessage, SectionHeader, KpiCard } from '../../shared/components';
import { TARGET_INTENSITY } from '../../core/domain/types';

const VESSEL_TYPES = ['Container', 'BulkCarrier', 'Tanker', 'RoRo'];
const FUEL_TYPES = ['HFO', 'LNG', 'MGO'];
const YEARS = ['2024', '2025'];

export const RoutesTab: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setting, setSetting] = useState('');
  const [filterVessel, setFilterVessel] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRoutes();
      setRoutes(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSetBaseline = async (routeId: string) => {
    setSetting(routeId);
    try {
      await setBaseline(routeId);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSetting('');
    }
  };

  const filtered = routes.filter(r =>
    (!filterVessel || r.vesselType === filterVessel) &&
    (!filterFuel || r.fuelType === filterFuel) &&
    (!filterYear || r.year === parseInt(filterYear))
  );

  const baseline = routes.find(r => r.isBaseline);
  const compliantCount = routes.filter(r => r.ghgIntensity <= TARGET_INTENSITY).length;

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Route Registry" subtitle="Manage vessel routes and set compliance baseline" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Routes" value={routes.length} />
        <KpiCard label="Compliant" value={compliantCount} accent="text-teal-300" sub={`≤ ${TARGET_INTENSITY} gCO₂e/MJ`} />
        <KpiCard label="Target GHG" value={TARGET_INTENSITY} unit="gCO₂e/MJ" accent="text-amber-300" />
        <KpiCard label="Baseline Route" value={baseline?.routeId ?? '—'} accent="text-ocean-300" sub={baseline ? `${baseline.ghgIntensity} gCO₂e/MJ` : 'Not set'} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select label="Vessel Type" value={filterVessel} onChange={e => setFilterVessel(e.target.value)}
            options={VESSEL_TYPES.map(v => ({ value: v, label: v }))} />
          <Select label="Fuel Type" value={filterFuel} onChange={e => setFilterFuel(e.target.value)}
            options={FUEL_TYPES.map(f => ({ value: f, label: f }))} />
          <Select label="Year" value={filterYear} onChange={e => setFilterYear(e.target.value)}
            options={YEARS.map(y => ({ value: y, label: y }))} />
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setFilterVessel(''); setFilterFuel(''); setFilterYear(''); }}>
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      {error && <ErrorMessage message={error} />}
      {loading ? <Spinner /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-700/50">
                  {['Route ID', 'Vessel Type', 'Fuel Type', 'Year', 'GHG Intensity', 'Fuel Cons. (t)', 'Distance (km)', 'Emissions (t)', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono text-ocean-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b border-ocean-800/50 hover:bg-ocean-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-ocean-900/20'}`}>
                    <td className="px-4 py-3 font-mono text-ocean-200 font-medium">{r.routeId}</td>
                    <td className="px-4 py-3 text-ocean-300">{r.vesselType}</td>
                    <td className="px-4 py-3"><Badge variant="neutral">{r.fuelType}</Badge></td>
                    <td className="px-4 py-3 font-mono text-ocean-300">{r.year}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-semibold ${r.ghgIntensity <= TARGET_INTENSITY ? 'text-teal-300' : 'text-red-300'}`}>
                        {r.ghgIntensity.toFixed(1)}
                      </span>
                      <span className="text-ocean-500 text-xs ml-1">gCO₂e/MJ</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-ocean-300">{r.fuelConsumption.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-ocean-300">{r.distance.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-ocean-300">{r.totalEmissions.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {r.isBaseline
                        ? <Badge variant="warning">⚓ Baseline</Badge>
                        : r.ghgIntensity <= TARGET_INTENSITY
                          ? <Badge variant="success">✓ Compliant</Badge>
                          : <Badge variant="danger">✗ Non-compliant</Badge>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {!r.isBaseline && (
                        <Button size="sm" variant="ghost"
                          disabled={setting === r.routeId}
                          onClick={() => handleSetBaseline(r.routeId)}>
                          {setting === r.routeId ? '...' : 'Set Baseline'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-ocean-500 py-8 font-mono text-sm">No routes match filters</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
