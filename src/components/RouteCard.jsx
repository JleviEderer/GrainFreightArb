/**
 * RouteCard - Individual route configuration card
 */
export default function RouteCard({
  route,
  index,
  onChange,
  onRemove,
  canRemove,
  destinations
}) {
  const freightModes = [
    { value: 'truck', label: 'Local Truck', shortLabel: 'Truck' },
    { value: 'rail', label: 'Rail', shortLabel: 'Rail' },
    { value: 'barge', label: 'Barge', shortLabel: 'Barge' },
    { value: 'truck+barge', label: 'Truck + Barge', shortLabel: 'Truck+Barge' }
  ];

  const handleDestinationChange = (destId) => {
    const dest = destinations.find(d => d.id === destId);
    if (dest) {
      onChange('destinationId', destId);
      onChange('destinationBasis', dest.basis);
      onChange('destinationName', dest.name);
      onChange('destinationProxyLabel', dest.proxyLabel);
    }
  };

  // Get current destination's proxy label
  const currentDest = destinations.find(d => d.id === route.destinationId);
  const proxyLabel = route.destinationProxyLabel || currentDest?.proxyLabel;
  const destName = route.destinationName || currentDest?.name || 'Select Destination';

  // Get mode label for display
  const modeInfo = freightModes.find(m => m.value === route.freightMode);
  const modeLabel = modeInfo?.shortLabel || route.freightMode;

  // Dynamic route name: {Mode} -> {Destination}
  const dynamicName = `${modeLabel} -> ${destName}`;

  // Route color coding
  const routeColors = [
    'border-l-blue-500',
    'border-l-emerald-500',
    'border-l-amber-500',
    'border-l-purple-500',
    'border-l-rose-500'
  ];

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 border-l-4 ${routeColors[index % routeColors.length]} hover:shadow-sm transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-medium text-slate-800">{dynamicName}</span>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
            title="Remove route"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Destination */}
        <div className="col-span-2">
          <label className="block text-slate-500 text-xs mb-1.5 font-medium">Destination</label>
          <select
            value={route.destinationId || ''}
            onChange={(e) => handleDestinationChange(e.target.value)}
            className="input py-2"
          >
            <option value="">Select destination...</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {proxyLabel && (
            <span className="text-xs text-slate-400 mt-1 block">
              Proxy: {proxyLabel}
            </span>
          )}
        </div>

        {/* Destination Basis */}
        <div>
          <label className="block text-slate-500 text-xs mb-1.5 font-medium">Dest. Basis (c/bu)</label>
          <input
            type="number"
            step="0.1"
            value={(route.destinationBasis * 100).toFixed(1)}
            onChange={(e) => onChange('destinationBasis', (parseFloat(e.target.value) || 0) / 100)}
            className="input py-2"
          />
          <span className="text-xs text-slate-400 font-mono">
            {route.destinationBasis >= 0 ? '+' : ''}{(route.destinationBasis * 100).toFixed(1)}c vs futures
          </span>
        </div>

        {/* Freight Mode */}
        <div>
          <label className="block text-slate-500 text-xs mb-1.5 font-medium">Freight Mode</label>
          <select
            value={route.freightMode}
            onChange={(e) => onChange('freightMode', e.target.value)}
            className="input py-2"
          >
            {freightModes.map(mode => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
        </div>

        {/* Freight Cost */}
        <div>
          <label className="block text-slate-500 text-xs mb-1.5 font-medium">Freight ($/bu)</label>
          <input
            type="number"
            step="0.01"
            value={route.freightCost}
            onChange={(e) => onChange('freightCost', parseFloat(e.target.value) || 0)}
            className="input py-2"
          />
        </div>

        {/* Distance (for truck) */}
        {(route.freightMode === 'truck' || route.freightMode === 'truck+barge') && (
          <div>
            <label className="block text-slate-500 text-xs mb-1.5 font-medium">Distance (mi)</label>
            <input
              type="number"
              step="10"
              value={route.distance || ''}
              onChange={(e) => {
                const dist = parseInt(e.target.value) || 0;
                onChange('distance', dist);
                // Auto-calculate truck freight if using truck mode
                if (route.freightMode === 'truck') {
                  onChange('freightCost', parseFloat((dist * 0.004).toFixed(2)));
                }
              }}
              className="input py-2"
              placeholder="miles"
            />
          </div>
        )}

        {/* Transit Days */}
        <div>
          <label className="block text-slate-500 text-xs mb-1.5 font-medium">Transit (days)</label>
          <input
            type="number"
            step="1"
            min="1"
            value={route.transitDays || 1}
            onChange={(e) => onChange('transitDays', parseInt(e.target.value) || 1)}
            className="input py-2"
          />
        </div>
      </div>

      {/* Quick freight estimate */}
      {route.freightMode === 'truck' && route.distance > 0 && (
        <div className="mt-3 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          Est. truck freight: <span className="font-mono font-medium">${(route.distance * 0.004).toFixed(2)}/bu</span> @ $0.04/10mi
        </div>
      )}
    </div>
  );
}
