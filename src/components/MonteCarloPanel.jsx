import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { runFullSimulation, DEFAULT_UNCERTAINTY } from '../utils/monteCarloSim';

/**
 * MonteCarloPanel - Monte Carlo risk simulation with distribution visualization
 *
 * Props:
 * - routes: Array of route configurations
 * - originBasis: Origin basis ($/bu)
 * - enabled: Whether simulation is enabled
 * - onToggle: Callback to toggle enabled state
 * - carryEnabled: Whether carry costs are enabled
 * - carry: Carry cost parameters (daysHeld, storageCentsPerMonth, interestRatePercent)
 * - originCashPrice: Futures + origin basis (for delay interest calculation)
 * - carryCost: Pre-calculated carry cost per bushel (if carry enabled)
 */
export default function MonteCarloPanel({
  routes,
  originBasis,
  enabled,
  onToggle,
  carryEnabled = false,
  carry = { daysHeld: 0, storageCentsPerMonth: 0, interestRatePercent: 8 },
  originCashPrice = 4.50,
  carryCost = 0
}) {
  const [uncertainty, setUncertainty] = useState(DEFAULT_UNCERTAINTY);
  const [showSettings, setShowSettings] = useState(false);

  // Build carry settings object for simulation
  const carrySettings = useMemo(() => ({
    enabled: carryEnabled,
    carryCost: carryCost,
    originCashPrice: originCashPrice,
    interestRate: carry.interestRatePercent,
    storageCentsPerMonth: carry.storageCentsPerMonth
  }), [carryEnabled, carryCost, originCashPrice, carry]);

  const simulationResults = useMemo(() => {
    if (!enabled || !routes || routes.length === 0) return null;

    return runFullSimulation({
      routes,
      originBasis,
      uncertainty,
      carrySettings,
      iterations: 10000
    });
  }, [routes, originBasis, uncertainty, carrySettings, enabled]);

  if (!enabled) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-slate-800">
              Monte Carlo Simulation
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Probabilistic analysis of outcome distributions
            </p>
          </div>
          <button
            onClick={onToggle}
            className="btn-ghost"
          >
            Enable
          </button>
        </div>
      </div>
    );
  }

  if (!simulationResults) {
    return (
      <div className="card p-5 text-center text-slate-500 text-sm">
        Running simulation...
      </div>
    );
  }

  const bestResult = simulationResults.routeResults[0];
  const { statistics, percentiles, risk, histogram } = bestResult;

  // Format histogram for Recharts
  const chartData = histogram.map(bin => ({
    x: bin.binMid * 100, // Convert to cents
    count: bin.count,
    frequency: bin.frequency * 100
  }));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg text-slate-800">
            Monte Carlo Simulation
          </h3>
          <span className="text-xs text-slate-400 font-mono">10,000 iterations</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            {showSettings ? 'Hide' : 'Settings'}
          </button>
          <button
            onClick={onToggle}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Disable
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl">
          <h4 className="section-subheader mb-3">Uncertainty Inputs</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">
                Freight s ($/bu)
                <span className="ml-1 text-slate-400" title="Standard deviation of freight cost uncertainty">?</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={uncertainty.freightSigma}
                onChange={(e) => setUncertainty(prev => ({
                  ...prev,
                  freightSigma: parseFloat(e.target.value) || 0
                }))}
                className="input py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">
                Basis s ($/bu)
                <span className="ml-1 text-slate-400" title="Standard deviation of destination basis uncertainty">?</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={uncertainty.basisSigma}
                onChange={(e) => setUncertainty(prev => ({
                  ...prev,
                  basisSigma: parseFloat(e.target.value) || 0
                }))}
                className="input py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Delay Prob (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={uncertainty.delayProbability * 100}
                onChange={(e) => setUncertainty(prev => ({
                  ...prev,
                  delayProbability: (parseFloat(e.target.value) || 0) / 100
                }))}
                className="input py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Delay Days</label>
              <input
                type="number"
                step="1"
                min="0"
                value={uncertainty.delayDays}
                onChange={(e) => setUncertainty(prev => ({
                  ...prev,
                  delayDays: parseInt(e.target.value) || 0
                }))}
                className="input py-2"
              />
            </div>
          </div>
          {/* Delay explanation */}
          <p className="text-xs text-slate-400 mt-3 italic">
            {carryEnabled
              ? 'Delay adds interest + storage for extra days.'
              : 'Delay adds interest cost only (no storage).'}
          </p>
          {/* Carry status indicator */}
          <div className="mt-2 text-xs">
            {carryEnabled ? (
              <span className="text-green-600 font-medium">Carry costs included in simulation</span>
            ) : (
              <span className="text-slate-400">Carry costs OFF - only delay interest modeled</span>
            )}
          </div>
        </div>
      )}

      {/* Distribution Chart */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-600 mb-2">
          {bestResult.route.name} - Outcome Distribution
        </h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <XAxis
                dataKey="x"
                tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickFormatter={(v) => `${v.toFixed(0)}c`}
                label={{ value: 'Netback (c/bu)', position: 'bottom', offset: 0, fontSize: 10 }}
              />
              <YAxis
                dataKey="frequency"
                tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                width={35}
              />
              <Tooltip
                formatter={(value) => [`${value.toFixed(1)}%`, 'Frequency']}
                labelFormatter={(label) => `${label.toFixed(1)}c/bu`}
              />
              <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine x={statistics.mean * 100} stroke="#3b82f6" strokeWidth={2} />
              <Bar
                dataKey="frequency"
                fill="#64748b"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500"></span> Expected
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 border-dashed"></span> Break-even
          </span>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500">Expected</div>
          <div className={`text-lg font-mono font-bold ${statistics.mean >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {(statistics.mean * 100).toFixed(1)}c
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center" title="5th percentile: 95% of outcomes are better than this">
          <div className="text-xs text-slate-500">Downside (5%)</div>
          <div className={`text-lg font-mono font-bold ${percentiles.p5 >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {(percentiles.p5 * 100).toFixed(1)}c
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center" title="95th percentile: only 5% of outcomes are better than this">
          <div className="text-xs text-slate-500">Upside (95%)</div>
          <div className="text-lg font-mono font-bold text-slate-800">
            {(percentiles.p95 * 100).toFixed(1)}c
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="p-4 bg-wheat-50 rounded-xl border border-wheat-200">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-wheat-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium text-wheat-800">Risk Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-wheat-700">Probability of Loss:</span>
            <span className={`ml-2 font-mono font-bold ${risk.probLoss > 0.2 ? 'text-red-600' : 'text-wheat-800'}`}>
              {risk.probLossPct.toFixed(1)}%
            </span>
          </div>
          <div title="VaR (5%) = magnitude of loss at the 5th percentile outcome. 95% of outcomes are better than this.">
            <span className="text-wheat-700 cursor-help border-b border-dashed border-wheat-400">VaR (5%):</span>
            <span className="ml-2 font-mono font-bold text-wheat-800">
              ${risk.var5.toFixed(2)}/bu
            </span>
          </div>
        </div>
      </div>

      {/* Win Probabilities */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <h4 className="section-subheader mb-3">Route Win Probabilities</h4>
        <div className="space-y-2">
          {simulationResults.winProbabilities.map(wp => (
            <div key={wp.id} className="flex items-center gap-2">
              <div className="w-24 text-sm text-slate-700 truncate">{wp.name}</div>
              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-navy-500 rounded-full transition-all"
                  style={{ width: `${wp.probabilityPct}%` }}
                />
              </div>
              <div className="w-12 text-right text-sm font-mono font-medium text-slate-700">
                {wp.probabilityPct.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
