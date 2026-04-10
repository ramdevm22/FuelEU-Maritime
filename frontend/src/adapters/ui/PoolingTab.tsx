import React, { useState } from 'react';
import { getAdjustedCB, createPool, getPools } from '../../adapters/infrastructure/api';
import { PoolResult, Pool } from '../../core/domain/types';
import { Badge, Button, Card, Input, Spinner, ErrorMessage, SectionHeader, KpiCard } from '../../shared/components';

interface MemberEntry { shipId: string; cbBefore: number | null; loaded: boolean; }

export const PoolingTab: React.FC = () => {
  const [year, setYear] = useState('2025');
  const [members, setMembers] = useState<MemberEntry[]>([{ shipId: '', cbBefore: null, loaded: false }]);
  const [result, setResult] = useState<PoolResult | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addMember = () => setMembers(prev => [...prev, { shipId: '', cbBefore: null, loaded: false }]);
  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i));
  const updateShipId = (i: number, val: string) =>
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, shipId: val, cbBefore: null, loaded: false } : m));

  const loadCB = async (i: number) => {
    const m = members[i];
    if (!m.shipId) return;
    setLoading(true);
    try {
      const data = await getAdjustedCB(m.shipId, parseInt(year));
      setMembers(prev => prev.map((mem, idx) => idx === i ? { ...mem, cbBefore: data.adjustedCB, loaded: true } : mem));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalCB = members.reduce((s, m) => s + (m.cbBefore ?? 0), 0);
  const allLoaded = members.every(m => m.loaded && m.shipId);
  const canCreate = allLoaded && totalCB >= 0 && members.length >= 2;

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const shipIds = members.map(m => m.shipId);
      const res = await createPool(parseInt(year), shipIds);
      setResult(res);
      const allPools = await getPools();
      setPools(allPools);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Article 21 — Pooling" subtitle="Aggregate adjusted CB across ships. Pool sum must be ≥ 0." />

      {/* Config */}
      <Card className="p-5">
        <div className="flex items-end gap-4 mb-5">
          <Input label="Pool Year" type="number" value={year} onChange={e => setYear(e.target.value)} />
        </div>

        <h3 className="text-xs font-mono text-ocean-400 uppercase tracking-wider mb-3">Pool Members</h3>
        <div className="space-y-2">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-ocean-900/50 rounded-lg border border-ocean-800/50">
              <span className="text-xs font-mono text-ocean-500 w-4">{i + 1}</span>
              <Input
                value={m.shipId}
                onChange={e => updateShipId(i, e.target.value)}
                placeholder="Ship ID (e.g. SHIP001)"
                className="flex-1"
              />
              <Button size="sm" variant="ghost" onClick={() => loadCB(i)} disabled={!m.shipId || loading}>
                Load CB
              </Button>
              {m.loaded && m.cbBefore !== null && (
                <div className="text-right min-w-[120px]">
                  <span className={`font-mono text-sm font-semibold ${m.cbBefore >= 0 ? 'text-teal-300' : 'text-red-300'}`}>
                    {m.cbBefore >= 0 ? '+' : ''}{m.cbBefore.toFixed(0)}
                  </span>
                  <span className="text-xs text-ocean-500 ml-1">gCO₂eq</span>
                  <Badge variant={m.cbBefore >= 0 ? 'success' : 'danger'} >
                    {m.cbBefore >= 0 ? 'Surplus' : 'Deficit'}
                  </Badge>
                </div>
              )}
              {members.length > 1 && (
                <button onClick={() => removeMember(i)} className="text-ocean-600 hover:text-red-400 text-lg transition-colors">×</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ocean-800/50">
          <Button variant="ghost" size="sm" onClick={addMember}>+ Add Ship</Button>
          <div className="flex items-center gap-4">
            {allLoaded && (
              <div className="text-right">
                <span className="text-xs font-mono text-ocean-400">Pool Sum: </span>
                <span className={`font-mono font-bold ${totalCB >= 0 ? 'text-teal-300' : 'text-red-300'}`}>
                  {totalCB >= 0 ? '+' : ''}{totalCB.toFixed(0)} gCO₂eq
                </span>
                {totalCB < 0 && <p className="text-xs text-red-400 font-mono">Pool sum must be ≥ 0</p>}
              </div>
            )}
            <Button onClick={handleCreate} disabled={!canCreate || loading}>
              {loading ? 'Creating…' : '🌊 Create Pool'}
            </Button>
          </div>
        </div>
      </Card>

      {error && <ErrorMessage message={error} />}
      {loading && <Spinner />}

      {/* Pool Result */}
      {result && (
        <Card className="p-5 border-teal-400/30">
          <h3 className="text-sm font-mono text-teal-300 uppercase tracking-wider mb-4">✓ Pool Created</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <KpiCard label="Pool ID" value={result.pool.id.slice(0, 8) + '…'} />
            <KpiCard label="Year" value={result.pool.year} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-700/50">
                  {['Ship ID', 'CB Before', 'CB After', 'Change'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-mono text-ocean-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.members.map(m => (
                  <tr key={m.shipId} className="border-b border-ocean-800/50">
                    <td className="px-4 py-2 font-mono text-ocean-200">{m.shipId}</td>
                    <td className={`px-4 py-2 font-mono ${m.cbBefore >= 0 ? 'text-teal-300' : 'text-red-300'}`}>
                      {m.cbBefore >= 0 ? '+' : ''}{m.cbBefore.toFixed(0)}
                    </td>
                    <td className={`px-4 py-2 font-mono ${m.cbAfter >= 0 ? 'text-teal-300' : 'text-red-300'}`}>
                      {m.cbAfter >= 0 ? '+' : ''}{m.cbAfter.toFixed(0)}
                    </td>
                    <td className="px-4 py-2 font-mono text-ocean-400">
                      {(m.cbAfter - m.cbBefore) >= 0 ? '+' : ''}{(m.cbAfter - m.cbBefore).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Existing Pools */}
      {pools.length > 0 && (
        <Card>
          <div className="p-4 border-b border-ocean-700/50">
            <h3 className="text-sm font-mono text-ocean-400 uppercase tracking-wider">Pool Registry</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-700/50">
                  {['Pool ID', 'Year', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono text-ocean-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pools.map(p => (
                  <tr key={p.id} className="border-b border-ocean-800/50 hover:bg-ocean-800/20">
                    <td className="px-4 py-3 font-mono text-ocean-400 text-xs">{p.id.slice(0, 12)}…</td>
                    <td className="px-4 py-3 font-mono text-ocean-300">{p.year}</td>
                    <td className="px-4 py-3 text-ocean-400 text-xs">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
