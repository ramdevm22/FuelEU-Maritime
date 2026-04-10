import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { RouteComparison } from '../../core/domain/types';
import { getComparison } from '../../adapters/infrastructure/api';
import { Badge, Card, Spinner, ErrorMessage, SectionHeader, KpiCard } from '../../shared/components';
import { TARGET_INTENSITY } from '../../core/domain/types';

export const CompareTab: React.FC = () => {
  const [data, setData] = useState<RouteComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getComparison()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const compliant = data.filter(d => d.compliant).length;
  const avgDiff = data.length
    ? (data.reduce((s, d) => s + d.percentDiff, 0) / data.length).toFixed(2)
    : '0';

  const chartData = data.map(d => ({
    name: d.routeId,
    Baseline: parseFloat(d.baselineGhg.toFixed(2)),
    Comparison: parseFloat(d.comparisonGhg.toFixed(2)),
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const row = data.find(d => d.routeId === label);
    return (
      <div className="bg-ocean-900 border border-ocean-700 rounded-xl p-3 text-xs font-mono shadow-xl">
        <p className="text-ocean-200 font-bold mb-2">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value} gCO₂e/MJ</p>
        ))}
        {row && <p className={`mt-1 font-semibold ${row.percentDiff > 0 ? 'text-red-300' : 'text-teal-300'}`}>
          Δ {row.percentDiff > 0 ? '+' : ''}{row.percentDiff}%
        </p>}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        title="Baseline vs Comparison"
        subtitle={`Target: ${TARGET_INTENSITY} gCO₂e/MJ — 2% below 91.16 (FuelEU 2025)`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Routes Compared" value={data.length} />
        <KpiCard label="Compliant" value={compliant} accent="text-teal-300" />
        <KpiCard label="Non-Compliant" value={data.length - compliant} accent="text-red-300" />
        <KpiCard label="Avg Δ from Baseline" value={avgDiff} unit="%" accent={parseFloat(avgDiff) > 0 ? 'text-red-300' : 'text-teal-300'} />
      </div>

      {error && <ErrorMessage message={error} />}
      {loading ? <Spinner /> : (
        <>
          {/* Chart */}
          <Card className="p-6">
            <h3 className="text-sm font-mono text-ocean-400 uppercase tracking-wider mb-4">GHG Intensity Comparison</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d3254" />
                <XAxis dataKey="name" tick={{ fill: '#7aadcc', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#7aadcc', fontSize: 11 }} domain={[80, 100]} unit=" gCO₂" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#7aadcc', fontSize: 12 }} />
                <ReferenceLine y={TARGET_INTENSITY} stroke="#fbbf24" strokeDasharray="4 2"
                  label={{ value: `Target ${TARGET_INTENSITY}`, fill: '#fbbf24', fontSize: 10 }} />
                <Bar dataKey="Baseline" fill="#164d7a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comparison" fill="#2a8fcb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ocean-700/50">
                    {['Route ID', 'Vessel', 'Fuel', 'Year', 'Baseline GHG', 'Comparison GHG', '% Diff', 'Compliant'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-mono text-ocean-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={r.routeId} className={`border-b border-ocean-800/50 hover:bg-ocean-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-ocean-900/20'}`}>
                      <td className="px-4 py-3 font-mono text-ocean-200 font-medium">{r.routeId}</td>
                      <td className="px-4 py-3 text-ocean-300">{r.vesselType}</td>
                      <td className="px-4 py-3"><Badge variant="neutral">{r.fuelType}</Badge></td>
                      <td className="px-4 py-3 font-mono text-ocean-300">{r.year}</td>
                      <td className="px-4 py-3 font-mono text-amber-300">{r.baselineGhg.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-ocean-200">{r.comparisonGhg.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono">
                        <span className={r.percentDiff > 0 ? 'text-red-300' : 'text-teal-300'}>
                          {r.percentDiff > 0 ? '+' : ''}{r.percentDiff}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.compliant
                          ? <Badge variant="success">✓ Yes</Badge>
                          : <Badge variant="danger">✗ No</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && (
                <p className="text-center text-ocean-500 py-8 font-mono text-sm">
                  No comparison data — please set a baseline route first
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
