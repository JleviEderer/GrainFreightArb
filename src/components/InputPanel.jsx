import RouteCard from './RouteCard';

/**
 * InputPanel - Main input configuration panel
 * Handles origin, futures, volume, and route configuration
 */
export default function InputPanel({
  origin,
  setOrigin,
  futuresPrice,
  setFuturesPrice,
  volume,
  setVolume,
  routes,
  setRoutes,
  defaults
}) {
  const handleOriginChange = (field, value) => {
    setOrigin(prev => ({ ...prev, [field]: value }));
  };

  const handleRouteChange = (index, field, value) => {
    setRoutes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addRoute = () => {
    if (routes.length >= 5) return;
    const newRoute = {
      id: `route-${routes.length + 1}`,
      name: `Route ${routes.length + 1}`,
      destinationBasis: 0,
      freightCost: 0,
      freightMode: 'truck',
      distance: 0,
      transitDays: 1
    };
    setRoutes(prev => [...prev, newRoute]);
  };

  const removeRoute = (index) => {
    if (routes.length <= 2) return;
    setRoutes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Origin Configuration */}
      <section className="card p-5">
        <h3 className="font-display text-lg text-slate-800 mb-4">
          Origin
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Location</label>
            <select
              value={origin.id || ''}
              onChange={(e) => {
                const selected = defaults.origins.find(o => o.id === e.target.value);
                if (selected) {
                  setOrigin({
                    id: selected.id,
                    name: selected.name,
                    location: selected.location,
                    basis: selected.basis,
                    proxyLabel: selected.proxyLabel
                  });
                }
              }}
              className="input"
            >
              {defaults.origins.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            {origin.proxyLabel && (
              <p className="text-xs text-slate-500 mt-1.5">
                Proxy: {origin.proxyLabel}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">
              Local Basis (c/bu)
            </label>
            <input
              type="number"
              step="0.1"
              value={(origin.basis * 100).toFixed(1)}
              onChange={(e) => handleOriginChange('basis', (parseFloat(e.target.value) || 0) / 100)}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1.5 font-mono">
              {origin.basis >= 0 ? '+' : ''}{(origin.basis * 100).toFixed(1)}c vs futures
            </p>
          </div>
        </div>
      </section>

      {/* Futures & Volume */}
      <section className="card p-5">
        <h3 className="font-display text-lg text-slate-800 mb-4">
          Trade Parameters
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">
              Futures Price ($/bu)
            </label>
            <input
              type="number"
              step="0.01"
              value={futuresPrice}
              onChange={(e) => setFuturesPrice(parseFloat(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {defaults.futures.corn.description}
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">
              Volume (bushels)
            </label>
            <input
              type="number"
              step="1000"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value) || 0)}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1.5 font-mono">
              {volume >= 1000 ? `${(volume / 1000).toFixed(0)}K` : volume} bushels
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Origin Cash Price:</span>
            <span className="font-mono font-semibold text-slate-900">
              ${(futuresPrice + origin.basis).toFixed(2)}/bu
            </span>
          </div>
        </div>
      </section>

      {/* Routes */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-slate-800">
            Outlet Routes
          </h3>
          {routes.length < 5 && (
            <button
              onClick={addRoute}
              className="btn-ghost text-sm"
            >
              + Add Route
            </button>
          )}
        </div>

        <div className="space-y-4">
          {routes.map((route, index) => (
            <RouteCard
              key={route.id}
              route={route}
              index={index}
              onChange={(field, value) => handleRouteChange(index, field, value)}
              onRemove={() => removeRoute(index)}
              canRemove={routes.length > 2}
              destinations={defaults.destinations}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
