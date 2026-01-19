// Helper to get dynamic route name
const getRouteName = (route) => {
  const modeLabels = {
    'truck': 'Truck',
    'rail': 'Rail',
    'barge': 'Barge',
    'truck+barge': 'Truck+Barge'
  };
  const mode = modeLabels[route.freightMode] || route.freightMode;
  const dest = route.destinationName || 'Unknown';
  return `${mode} -> ${dest}`;
};

/**
 * BreakEvenPanel - Shows break-even points and decision triggers
 */
export default function BreakEvenPanel({ rankedRoutes, decisionTrigger }) {
  if (!rankedRoutes || rankedRoutes.length < 2) {
    return (
      <div className="card p-5 text-center text-slate-500 text-sm">
        Need at least 2 routes for break-even analysis
      </div>
    );
  }

  const bestRoute = rankedRoutes[0];
  const secondRoute = rankedRoutes[1];

  // Check if we have valid break-even data
  const hasBreakEven = bestRoute.breakEven?.freight && bestRoute.breakEven?.basis;

  if (!hasBreakEven) {
    return (
      <div className="card p-5 text-center text-slate-500 text-sm">
        Configure routes to see break-even analysis
      </div>
    );
  }

  const freightBE = bestRoute.breakEven.freight;
  const basisBE = bestRoute.breakEven.basis;

  return (
    <div className="card p-5">
      <h3 className="font-display text-lg text-slate-800 mb-4">
        Decision Triggers
      </h3>

      {/* Main Decision Summary */}
      <div className="bg-navy-50 rounded-xl p-4 mb-4 border border-navy-100">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-navy-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-navy-900">
              {getRouteName(bestRoute)} wins by {((bestRoute.netback - secondRoute.netback) * 100).toFixed(0)}c/bu
            </p>
            <p className="text-sm text-navy-700 mt-1">
              Flip to <span className="font-medium">{getRouteName(secondRoute)}</span> if:
            </p>
            <ul className="text-sm text-navy-600 mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-navy-400 rounded-full"></span>
                Freight exceeds <span className="font-mono font-medium">${freightBE.breakEvenFreight.toFixed(2)}/bu</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-navy-400 rounded-full"></span>
                Basis weakens below <span className="font-mono font-medium">{(basisBE.breakEvenBasis * 100).toFixed(0)}c</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed Break-evens */}
      <div className="grid grid-cols-2 gap-3">
        {/* Freight Break-even */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="section-subheader">Freight</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Current:</span>
              <span className="font-mono font-medium text-slate-700">
                ${freightBE.currentFreight.toFixed(2)}/bu
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Break-even:</span>
              <span className="font-mono font-medium text-slate-700">
                ${freightBE.breakEvenFreight.toFixed(2)}/bu
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Headroom:</span>
              <span className={`font-mono font-medium ${
                freightBE.headroom >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {freightBE.headroom >= 0 ? '+' : ''}${freightBE.headroom.toFixed(2)}/bu
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="mt-3">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  freightBE.headroom >= 0.05 ? 'bg-green-500' :
                  freightBE.headroom >= 0 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, (freightBE.currentFreight / freightBE.breakEvenFreight) * 100))}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>$0</span>
              <span>BE: ${freightBE.breakEvenFreight.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Basis Break-even */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="section-subheader">Basis</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Current:</span>
              <span className="font-mono font-medium text-slate-700">
                {basisBE.currentBasis >= 0 ? '+' : ''}{(basisBE.currentBasis * 100).toFixed(0)}c
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Break-even:</span>
              <span className="font-mono font-medium text-slate-700">
                {basisBE.breakEvenBasis >= 0 ? '+' : ''}{(basisBE.breakEvenBasis * 100).toFixed(0)}c
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Headroom:</span>
              <span className={`font-mono font-medium ${
                basisBE.headroom >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {basisBE.headroom >= 0 ? '+' : ''}{(basisBE.headroom * 100).toFixed(0)}c
              </span>
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-3 text-xs text-slate-500">
            Basis can weaken {(basisBE.headroom * 100).toFixed(0)}c before switch
          </div>
        </div>
      </div>

      {/* All Routes Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <h4 className="section-subheader mb-3">All Routes</h4>
        <div className="space-y-1">
          {rankedRoutes.map((route, idx) => (
            <div key={route.id} className="flex items-center justify-between text-sm py-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded text-xs flex items-center justify-center font-medium ${
                  idx === 0 ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-slate-700">{getRouteName(route)}</span>
              </div>
              <span className={`font-mono font-medium ${
                route.netback >= 0 ? 'text-slate-700' : 'text-red-600'
              }`}>
                {route.netback >= 0 ? '+' : ''}{(route.netback * 100).toFixed(1)}c
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
