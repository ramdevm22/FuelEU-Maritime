import React, { useState } from 'react';
import { getCB, getBankRecords, bankSurplus, applyBanked } from '../../adapters/infrastructure/api';
import { ComplianceBalance, BankRecords } from '../../core/domain/types';
import {Button, Card, Input, Spinner, ErrorMessage, SectionHeader, KpiCard } from '../../shared/components';

export const BankingTab: React.FC = () => {
  const [shipId, setShipId] = useState('SHIP001');
  const [year, setYear] = useState('2025');
  const [cb, setCb] = useState<ComplianceBalance | null>(null);
  const [records, setRecords] = useState<BankRecords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadData = async () => {
    if (!shipId || !year) return;
    setLoading(true);
    setError('');
    setActionMsg('');
    try {
      const [cbData, recData] = await Promise.all([
        getCB(shipId, parseInt(year)),
        getBankRecords(shipId, parseInt(year)),
      ]);
      setCb(cbData);
      setRecords(recData);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBank = async () => {
    const amt = parseFloat(bankAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    setError('');
    try {
      await bankSurplus(shipId, parseInt(year), amt);
      setActionMsg(`✓ Banked ${amt.toLocaleString()} gCO₂eq successfully`);
      setBankAmount('');
      await loadData();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const amt = parseFloat(applyAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    setError('');
    try {
      const result = await applyBanked(shipId, parseInt(year), amt);
      setActionMsg(`✓ Applied ${result.applied.toLocaleString()} gCO₂eq. Remaining banked: ${result.remaining.toLocaleString()}`);
      setApplyAmount('');
      await loadData();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cbPositive = cb && cb.cbGco2eq > 0;

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Article 20 — Banking" subtitle="Bank surplus compliance balance or apply banked amounts to deficits" />

      {/* Query Form */}
      <Card className="p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <Input label="Ship ID" value={shipId} onChange={e => setShipId(e.target.value)} placeholder="e.g. SHIP001" />
          <Input label="Year" type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2025" />
          <Button onClick={loadData} disabled={loading}>
            {loading ? 'Loading…' : 'Load Compliance Data'}
          </Button>
        </div>
      </Card>

      {error && <ErrorMessage message={error} />}
      {actionMsg && (
        <div className="p-4 bg-teal-400/10 border border-teal-400/30 rounded-xl text-teal-300 text-sm font-mono">
          {actionMsg}
        </div>
      )}

      {loading && <Spinner />}

      {cb && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Compliance Balance"
              value={cb.cbGco2eq.toFixed(0)}
              unit="gCO₂eq"
              accent={cbPositive ? 'text-teal-300' : 'text-red-300'}
              sub={cbPositive ? 'Surplus — eligible to bank' : 'Deficit — can apply banked'}
            />
            <KpiCard
              label="Total Banked"
              value={records?.totalBanked.toFixed(0) ?? '0'}
              unit="gCO₂eq"
              accent="text-ocean-300"
            />
            <KpiCard
              label="Status"
              value={cbPositive ? 'SURPLUS' : 'DEFICIT'}
              accent={cbPositive ? 'text-teal-300' : 'text-red-300'}
            />
          </div>

          {/* Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Bank Surplus */}
            <Card className="p-5">
              <h3 className="text-sm font-mono text-ocean-400 uppercase tracking-wider mb-4">Bank Surplus CB</h3>
              <div className="space-y-3">
                <Input
                  label="Amount (gCO₂eq)"
                  type="number"
                  value={bankAmount}
                  onChange={e => setBankAmount(e.target.value)}
                  placeholder="Enter amount to bank"
                  disabled={!cbPositive}
                />
                <Button
                  onClick={handleBank}
                  disabled={!cbPositive || !bankAmount || loading}
                  className="w-full justify-center"
                >
                  🏦 Bank Surplus
                </Button>
                {!cbPositive && (
                  <p className="text-xs text-ocean-500 font-mono">CB must be positive to bank surplus</p>
                )}
              </div>
            </Card>

            {/* Apply Banked */}
            <Card className="p-5">
              <h3 className="text-sm font-mono text-ocean-400 uppercase tracking-wider mb-4">Apply Banked Surplus</h3>
              <div className="space-y-3">
                <Input
                  label="Amount (gCO₂eq)"
                  type="number"
                  value={applyAmount}
                  onChange={e => setApplyAmount(e.target.value)}
                  placeholder="Enter amount to apply"
                  disabled={!records || records.totalBanked <= 0}
                />
                <Button
                  variant="ghost"
                  onClick={handleApply}
                  disabled={!records || records.totalBanked <= 0 || !applyAmount || loading}
                  className="w-full justify-center"
                >
                  ↩ Apply Banked
                </Button>
                {(!records || records.totalBanked <= 0) && (
                  <p className="text-xs text-ocean-500 font-mono">No banked surplus available</p>
                )}
              </div>
            </Card>
          </div>

          {/* Bank Entries */}
          {records && records.records.length > 0 && (
            <Card>
              <div className="p-4 border-b border-ocean-700/50">
                <h3 className="text-sm font-mono text-ocean-400 uppercase tracking-wider">Bank Entry History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ocean-700/50">
                      {['Entry ID', 'Ship ID', 'Year', 'Amount (gCO₂eq)'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-mono text-ocean-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.records.map(r => (
                      <tr key={r.id} className="border-b border-ocean-800/50 hover:bg-ocean-800/20">
                        <td className="px-4 py-3 font-mono text-ocean-400 text-xs">{r.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-ocean-300">{r.shipId}</td>
                        <td className="px-4 py-3 font-mono text-ocean-300">{r.year}</td>
                        <td className="px-4 py-3 font-mono text-teal-300">{r.amountGco2eq.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
