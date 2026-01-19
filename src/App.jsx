import { useState, useMemo, useCallback } from 'react';
import defaults from './data/defaults.json';

// Components
import InputPanel from './components/InputPanel';
import NetbackResults from './components/NetbackResults';
import BreakEvenPanel from './components/BreakEvenPanel';
import SensitivityHeatmap from './components/SensitivityHeatmap';
import MonteCarloPanel from './components/MonteCarloPanel';
import ConstraintsPanel from './components/ConstraintsPanel';
import MarketWire from './components/MarketWire';
import DataSourceBox from './components/DataSourceBox';
import CarryPanel from './components/CarryPanel';

// Utils
import { calculateAllNetbacks, applyConstraints, calculateCarryCost } from './utils/netbackCalc';
import { analyzeAllBreakEvens, generateDecisionTrigger } from './utils/breakEvenCalc';
import { generateMarketWire } from './utils/marketWireGen';

// Initial state values (used for reset functionality)
const getInitialOrigin = () => ({
  id: defaults.origins[0].id,
  name: defaults.origins[0].name,
  location: defaults.origins[0].location,
  basis: defaults.origins[0].basis,
  proxyLabel: defaults.origins[0].proxyLabel
});

const getInitialRoutes = () => {
  // Map destination data from defaults
  const destMap = {};
  defaults.destinations.forEach(d => {
    destMap[d.id] = d;
  });

  return defaults.defaultRoutes.map(route => {
    const dest = destMap[route.destinationId];
    return {
      id: route.id,
      name: route.name,
      destinationId: route.destinationId,
      destinationName: dest?.name || '',
      destinationBasis: dest?.basis || 0,
      destinationProxyLabel: dest?.proxyLabel || '',
      freightCost: route.freightCost,
      freightMode: route.freightMode,
      distance: route.distance,
      transitDays: route.transitDays
    };
  });
};

const getInitialConstraints = () => ({
  railUnavailable: false,
  maxTruckCapacity: 0,
  deliveryWindow: 0,
  qualityDiscount: 0,
  paymentDays: 0
});

const getInitialCarry = () => ({
  daysHeld: 0,
  storageCentsPerMonth: 0,
  interestRatePercent: 8
});

const INITIAL_VOLUME = 50000;

function App() {
  // Core state
  const [origin, setOrigin] = useState(getInitialOrigin);
  const [futuresPrice, setFuturesPrice] = useState(defaults.futures.corn.price);
  const [volume, setVolume] = useState(INITIAL_VOLUME);

  // Routes state (3 default routes)
  const [routes, setRoutes] = useState(getInitialRoutes);

  // Feature toggles
  const [monteCarloEnabled, setMonteCarloEnabled] = useState(false);
  const [constraintsEnabled, setConstraintsEnabled] = useState(false);
  const [carryEnabled, setCarryEnabled] = useState(false);

  // Constraints state
  const [constraints, setConstraints] = useState(getInitialConstraints);

  // Carry/storage state
  const [carry, setCarry] = useState(getInitialCarry);

  // Reset all inputs to defaults
  const handleReset = useCallback(() => {
    setOrigin(getInitialOrigin());
    setFuturesPrice(defaults.futures.corn.price);
    setVolume(INITIAL_VOLUME);
    setRoutes(getInitialRoutes());
    setConstraints(getInitialConstraints());
    setCarry(getInitialCarry());
    setMonteCarloEnabled(false);
    setConstraintsEnabled(false);
    setCarryEnabled(false);
  }, []);

  // Computed values
  const { rankedRoutes, excludedRoutes } = useMemo(() => {
    const netbacks = calculateAllNetbacks({
      futuresPrice,
      originBasis: origin.basis,
      volume,
      routes,
      carry: carryEnabled ? carry : null
    });

    const withBreakEvens = analyzeAllBreakEvens(netbacks);

    // Apply constraints if enabled
    if (constraintsEnabled && constraints) {
      const { routes: constrainedRoutes, excluded } = applyConstraints({
        routes: withBreakEvens,
        constraints,
        volume,
        futuresPrice,
        carryEnabled,
        interestRate: carry.interestRatePercent
      });
      return { rankedRoutes: constrainedRoutes, excludedRoutes: excluded };
    }

    return { rankedRoutes: withBreakEvens, excludedRoutes: [] };
  }, [futuresPrice, origin.basis, volume, routes, carryEnabled, carry, constraintsEnabled, constraints]);

  // Calculate carry cost for Monte Carlo simulation
  const carryCostPerBu = useMemo(() => {
    if (!carryEnabled) return 0;
    const result = calculateCarryCost({
      originCashPrice: futuresPrice + origin.basis,
      daysHeld: carry.daysHeld,
      storageCentsPerMonth: carry.storageCentsPerMonth,
      interestRatePercent: carry.interestRatePercent
    });
    return result.totalCarry;
  }, [carryEnabled, carry, futuresPrice, origin.basis]);

  const decisionTrigger = useMemo(() => {
    if (rankedRoutes.length < 2) return null;
    return generateDecisionTrigger(rankedRoutes[0], rankedRoutes[1]);
  }, [rankedRoutes]);

  const marketWire = useMemo(() => {
    return generateMarketWire({
      rankedRoutes,
      decisionTrigger,
      constraints: constraintsEnabled ? constraints : {},
      monteCarloResults: null, // Would pass MC results if enabled
      inputs: { volume }
    });
  }, [rankedRoutes, decisionTrigger, constraints, constraintsEnabled, volume]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-navy-900 via-navy-900 to-navy-800 text-white border-b-2 border-wheat-500/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl tracking-tight">
                Grain Freight Arbitrage
              </h1>
              <p className="text-navy-300 text-sm mt-0.5">
                Multi-route netback analysis with break-evens and decision triggers
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="text-navy-300">Origin: {origin.name}</div>
                <div className="text-wheat-400 font-mono font-medium">
                  {volume >= 1000 ? `${(volume / 1000).toFixed(0)}K` : volume} bushels
                </div>
              </div>
              <button
                onClick={handleReset}
                className="btn-secondary text-sm border-slate-500 bg-slate-700/50 text-slate-200 hover:bg-slate-600 hover:text-white"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <InputPanel
              origin={origin}
              setOrigin={setOrigin}
              futuresPrice={futuresPrice}
              setFuturesPrice={setFuturesPrice}
              volume={volume}
              setVolume={setVolume}
              routes={routes}
              setRoutes={setRoutes}
              defaults={defaults}
            />

            {/* Toggleable Panels */}
            <CarryPanel
              carry={carry}
              setCarry={setCarry}
              enabled={carryEnabled}
              onToggle={() => setCarryEnabled(!carryEnabled)}
              originCashPrice={futuresPrice + origin.basis}
            />

            <ConstraintsPanel
              constraints={constraints}
              setConstraints={setConstraints}
              enabled={constraintsEnabled}
              onToggle={() => setConstraintsEnabled(!constraintsEnabled)}
              rankedRoutes={rankedRoutes}
              excludedRoutes={excludedRoutes}
              futuresPrice={futuresPrice}
              carryEnabled={carryEnabled}
              interestRate={carry.interestRatePercent}
              volume={volume}
            />

            <MonteCarloPanel
              routes={routes}
              originBasis={origin.basis}
              enabled={monteCarloEnabled}
              onToggle={() => setMonteCarloEnabled(!monteCarloEnabled)}
              carryEnabled={carryEnabled}
              carry={carry}
              originCashPrice={futuresPrice + origin.basis}
              carryCost={carryCostPerBu}
            />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7 space-y-6">
            {/* Netback Results */}
            <div className="card p-5">
              <NetbackResults
                rankedRoutes={rankedRoutes}
                excludedRoutes={excludedRoutes}
                futuresPrice={futuresPrice}
                constraintsEnabled={constraintsEnabled}
              />
            </div>

            {/* Break-even Panel */}
            <BreakEvenPanel
              rankedRoutes={rankedRoutes}
              decisionTrigger={decisionTrigger}
            />

            {/* Sensitivity Heatmap */}
            <SensitivityHeatmap
              routes={routes}
              originBasis={origin.basis}
            />
          </div>
        </div>

        {/* Market Wire - Full Width */}
        <div className="mt-6">
          <MarketWire wire={marketWire} />
        </div>

        {/* Data Source Box */}
        <div className="mt-6">
          <DataSourceBox metadata={defaults.metadata} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-xs text-slate-500 font-sans">
            <span className="font-medium">Data:</span> {defaults.metadata.dataSource} ({defaults.metadata.snapshotDate})
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
