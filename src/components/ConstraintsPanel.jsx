/**
 * ConstraintsPanel - Real-world constraints that override pure margin
 */
export default function ConstraintsPanel({
  constraints,
  setConstraints,
  enabled,
  onToggle,
  rankedRoutes,
  excludedRoutes = [],
  futuresPrice = 4.50,
  carryEnabled = false,
  interestRate = 8,
  volume = 50000
}) {
  const handleChange = (field, value) => {
    setConstraints(prev => ({ ...prev, [field]: value }));
  };

  // Get average destination basis for A/R preview (use first ranked route as reference)
  const referenceDestBasis = rankedRoutes && rankedRoutes.length > 0
    ? rankedRoutes[0].destinationBasis
    : 0.35;
  const referenceSalePrice = futuresPrice + referenceDestBasis;

  // Calculate A/R interest cost (only when carry is enabled)
  const calculateArInterest = () => {
    if (!carryEnabled || constraints.paymentDays <= 0) return 0;
    return referenceSalePrice * (interestRate / 100) * (constraints.paymentDays / 365);
  };

  // Calculate total soft constraint adjustment
  const calculateAdjustment = () => {
    let adjustment = 0;
    if (constraints.qualityDiscount > 0) {
      adjustment += constraints.qualityDiscount;
    }
    // A/R interest only applies when carry is enabled
    adjustment += calculateArInterest();
    return adjustment;
  };

  const arInterestCost = calculateArInterest();
  const totalAdjustment = enabled ? calculateAdjustment() : 0;
  const hasActiveConstraints = enabled && (
    constraints.railUnavailable ||
    constraints.maxTruckCapacity > 0 ||
    constraints.deliveryWindow > 0 ||
    constraints.qualityDiscount > 0 ||
    (carryEnabled && constraints.paymentDays > 0)
  );

  if (!enabled) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-slate-800">
              Execution Constraints
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Real-world limitations that may override margin optimization
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

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-slate-800">
          Execution Constraints
        </h3>
        <button
          onClick={onToggle}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          Disable
        </button>
      </div>

      {/* Impact Summary */}
      {hasActiveConstraints && (excludedRoutes.length > 0 || totalAdjustment > 0) && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-purple-800">
              Constraint Impact
            </span>
          </div>
          <div className="space-y-1">
            {excludedRoutes.length > 0 && (
              <div className="text-sm text-purple-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0"></span>
                <span><strong>{excludedRoutes.length}</strong> route{excludedRoutes.length > 1 ? 's' : ''} excluded</span>
              </div>
            )}
            {constraints.qualityDiscount > 0 && (
              <div className="text-sm text-purple-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                <span>Quality discount: <strong className="font-mono">-{(constraints.qualityDiscount * 100).toFixed(1)}c</strong></span>
              </div>
            )}
            {arInterestCost > 0 && (
              <div className="text-sm text-purple-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                <span>A/R interest ({constraints.paymentDays}d @ {interestRate}%): <strong className="font-mono">-{(arInterestCost * 100).toFixed(1)}c</strong></span>
              </div>
            )}
            {totalAdjustment > 0 && (
              <div className="text-sm text-purple-700 flex items-center gap-2 pt-1 border-t border-purple-200 mt-1">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0"></span>
                <span>Total adjustment: <strong className="font-mono">-{(totalAdjustment * 100).toFixed(1)}c/bu</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Constraint Inputs */}
      <div className="space-y-4">
        {/* Rail Capacity */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <span className="text-sm font-medium text-slate-700">Rail Capacity Available</span>
            <p className="text-xs text-slate-500">Shuttle train slots for delivery window</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!constraints.railUnavailable}
              onChange={(e) => handleChange('railUnavailable', !e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
          </label>
        </div>

        {/* Max Truck Capacity */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Max Weekly Truck Capacity</span>
            <span className="text-xs text-slate-500 font-mono">
              {constraints.maxTruckCapacity > 0
                ? `${(constraints.maxTruckCapacity / 1000).toFixed(0)}K bu`
                : 'Unlimited'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="500000"
            step="25000"
            value={constraints.maxTruckCapacity}
            onChange={(e) => handleChange('maxTruckCapacity', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-navy-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span>
            <span>250K</span>
            <span>500K</span>
          </div>
          {/* Live capacity vs volume status */}
          {constraints.maxTruckCapacity > 0 && (
            <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
              volume <= constraints.maxTruckCapacity
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              <span className="font-medium">Capacity:</span> <span className="font-mono">{constraints.maxTruckCapacity.toLocaleString()}</span> bu/week | <span className="font-medium">Volume:</span> <span className="font-mono">{volume.toLocaleString()}</span> bu
              {volume <= constraints.maxTruckCapacity ? (
                <span className="ml-1 text-green-600">OK</span>
              ) : (
                <span className="ml-1 font-medium"> Exceeds by <span className="font-mono">{(volume - constraints.maxTruckCapacity).toLocaleString()}</span> bu</span>
              )}
            </div>
          )}
        </div>

        {/* Delivery Window */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Delivery Window</span>
            <span className="text-xs text-slate-500 font-mono">
              {constraints.deliveryWindow > 0
                ? `${constraints.deliveryWindow} days`
                : 'No constraint'}
            </span>
          </div>
          <input
            type="number"
            min="0"
            step="1"
            value={constraints.deliveryWindow}
            onChange={(e) => handleChange('deliveryWindow', parseInt(e.target.value) || 0)}
            placeholder="Days"
            className="input py-2"
          />
        </div>

        {/* Quality Discount */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Quality/Spec Discount Risk</span>
            <span className="text-xs text-slate-500 font-mono">
              {constraints.qualityDiscount > 0
                ? `$${constraints.qualityDiscount.toFixed(2)}/bu`
                : 'None'}
            </span>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={constraints.qualityDiscount}
            onChange={(e) => handleChange('qualityDiscount', parseFloat(e.target.value) || 0)}
            placeholder="$/bu"
            className="input py-2"
          />
        </div>

        {/* Payment Terms / A/R Financing */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-slate-700">Payment Terms (days to cash receipt / A/R)</span>
            <span className="text-xs text-slate-500 font-mono">
              {constraints.paymentDays > 0
                ? `Net ${constraints.paymentDays} days`
                : 'Cash on delivery'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            After delivery, storage stops but financing continues until cash is received. We model this as interest on A/R (no storage).
          </p>
          <input
            type="number"
            min="0"
            step="1"
            value={constraints.paymentDays}
            onChange={(e) => handleChange('paymentDays', parseInt(e.target.value) || 0)}
            placeholder="Days"
            className="input py-2"
          />
          {constraints.paymentDays > 0 && (
            <div className="mt-2">
              {carryEnabled ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600 font-medium">
                    A/R interest cost: <span className="font-mono">{(arInterestCost * 100).toFixed(1)}c/bu</span>
                  </span>
                  <span className="text-slate-400">
                    (sale price <span className="font-mono">${referenceSalePrice.toFixed(2)}</span> x {interestRate}% x {constraints.paymentDays}d/365)
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Enable "Include Carry Costs" to apply A/R interest adjustment
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Constraint Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <h4 className="section-subheader mb-3">Active Constraints</h4>
        <div className="flex flex-wrap gap-2">
          {constraints.railUnavailable && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-lg font-medium">Rail Unavailable</span>
          )}
          {constraints.maxTruckCapacity > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg font-medium">
              Truck Cap: <span className="font-mono">{(constraints.maxTruckCapacity / 1000).toFixed(0)}K</span>
            </span>
          )}
          {constraints.deliveryWindow > 0 && (
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
              <span className="font-mono">{constraints.deliveryWindow}d</span> Window
            </span>
          )}
          {constraints.qualityDiscount > 0 && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">
              <span className="font-mono">-{(constraints.qualityDiscount * 100).toFixed(0)}c</span> Quality
            </span>
          )}
          {constraints.paymentDays > 0 && carryEnabled && (
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
              A/R: Net {constraints.paymentDays} (<span className="font-mono">-{(arInterestCost * 100).toFixed(1)}c</span>)
            </span>
          )}
          {constraints.paymentDays > 0 && !carryEnabled && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-xs rounded-lg line-through">
              Net {constraints.paymentDays} (carry off)
            </span>
          )}
          {!constraints.railUnavailable &&
           constraints.maxTruckCapacity === 0 &&
           constraints.deliveryWindow === 0 &&
           constraints.qualityDiscount === 0 &&
           !(constraints.paymentDays > 0 && carryEnabled) && (
            <span className="text-xs text-slate-500">No active constraints</span>
          )}
        </div>
      </div>
    </div>
  );
}
