import { formatCurrency, formatBasis } from '../utils/netbackCalc';

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

// Trophy icon for winner
const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-1.17a3 3 0 01-5.66 0H8.83a3 3 0 01-5.66 0H2a2 2 0 110-4h1.17A3 3 0 015 5zm5 8a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

/**
 * NetbackResults - Displays ranked netback comparison for all routes
 */
export default function NetbackResults({ rankedRoutes, excludedRoutes = [], futuresPrice, constraintsEnabled = false }) {
  if (!rankedRoutes || rankedRoutes.length === 0) {
    // Check if all routes were excluded by constraints
    if (excludedRoutes.length > 0) {
      return (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h4 className="font-display text-lg text-red-800 mb-2">No Viable Routes</h4>
            <p className="text-sm text-red-600">
              All routes are excluded by current constraints. Adjust constraints to see available options.
            </p>
          </div>
          <div className="bg-slate-100 rounded-xl p-3">
            <div className="section-subheader mb-2">
              Excluded by Constraints ({excludedRoutes.length})
            </div>
            {excludedRoutes.map(({ route, reason }) => (
              <div key={route.id} className="text-xs text-slate-500 flex justify-between py-1">
                <span className="line-through">{getRouteName(route)}</span>
                <span className="text-red-500">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="card p-6 text-center text-slate-500">
        Configure routes to see netback comparison
      </div>
    );
  }

  const bestRoute = rankedRoutes[0];
  const allNegative = rankedRoutes.every(r => r.netback < 0);

  // Route color coding with glow classes
  const routeColors = {
    'route-1': {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-700',
      badge: 'bg-blue-100',
      glow: 'shadow-blue-500/25'
    },
    'route-2': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-500',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100',
      glow: 'shadow-emerald-500/25'
    },
    'route-3': {
      bg: 'bg-amber-50',
      border: 'border-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-100',
      glow: 'shadow-amber-500/25'
    },
    'route-4': {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      text: 'text-purple-700',
      badge: 'bg-purple-100',
      glow: 'shadow-purple-500/25'
    },
    'route-5': {
      bg: 'bg-rose-50',
      border: 'border-rose-500',
      text: 'text-rose-700',
      badge: 'bg-rose-100',
      glow: 'shadow-rose-500/25'
    }
  };

  const getColors = (routeId, rank) => {
    return routeColors[routeId] || {
      bg: 'bg-slate-50',
      border: 'border-slate-500',
      text: 'text-slate-700',
      badge: 'bg-slate-100',
      glow: 'shadow-slate-500/25'
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-slate-800">
          Netback Comparison
        </h3>
        <span className="text-xs text-slate-500 font-mono">
          Futures: ${futuresPrice.toFixed(2)}/bu
        </span>
      </div>

      {/* No Profitable Outlet Warning */}
      {allNegative && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-800">No Profitable Outlet</h4>
              <p className="text-sm text-red-700 mt-1">
                All routes show negative netbacks. Consider: reprice, wait for better basis, or renegotiate freight.
              </p>
              <p className="text-xs text-red-600 mt-2">
                Least-loss outlet: <span className="font-medium">{getRouteName(bestRoute)}</span> ({(bestRoute.netback * 100).toFixed(1)}c/bu)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Route Cards */}
      <div className="space-y-3">
        {rankedRoutes.map((route) => {
          const colors = getColors(route.id, route.rank);
          const isWinner = route.rank === 1;
          const isNegative = route.netback < 0;

          return (
            <div
              key={route.id}
              className={`rounded-xl p-4 transition-all duration-200 ${
                isWinner
                  ? `border-4 ${colors.border} ${colors.bg} shadow-lg ${colors.glow} transform hover:scale-[1.01]`
                  : 'border-2 border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Route Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isWinner ? (
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${colors.badge} ${colors.text}`}>
                      <TrophyIcon />
                    </span>
                  ) : (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-slate-100 text-slate-600`}>
                      {route.rank}
                    </span>
                  )}
                  <div>
                    <h4 className={`font-medium ${isWinner ? 'text-slate-900' : 'text-slate-800'}`}>
                      {getRouteName(route)}
                    </h4>
                    {route.destinationProxyLabel && (
                      <p className="text-xs text-slate-400">Proxy: {route.destinationProxyLabel}</p>
                    )}
                  </div>
                </div>

                {/* Netback Badge */}
                <div className={`text-right ${isWinner ? '' : ''}`}>
                  <div className={`font-mono font-semibold ${
                    isWinner ? 'text-2xl' : 'text-xl'
                  } ${
                    isNegative ? 'text-red-600' : isWinner ? colors.text : 'text-slate-700'
                  }`}>
                    {route.netback >= 0 ? '+' : ''}{(route.netback * 100).toFixed(1)}c
                  </div>
                  <div className="text-xs text-slate-500">netback/bu</div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  <span className="text-slate-500 block">Dest Basis</span>
                  <span className="font-mono font-medium text-slate-700">
                    {route.destinationBasis >= 0 ? '+' : ''}{(route.destinationBasis * 100).toFixed(0)}c
                  </span>
                </div>
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  <span className="text-slate-500 block">Freight</span>
                  <span className="font-mono font-medium text-slate-700">
                    ${route.freightCost.toFixed(2)}
                  </span>
                </div>
                {route.carryCost > 0 && (
                  <div className="bg-wheat-50 rounded-lg px-2.5 py-1.5 border border-wheat-200">
                    <span className="text-wheat-600 block">Carry</span>
                    <span className="font-mono font-medium text-wheat-700">
                      -{(route.carryCost * 100).toFixed(1)}c
                    </span>
                  </div>
                )}
                {route.constraintAdjustment > 0 && (
                  <div className="bg-purple-50 rounded-lg px-2.5 py-1.5 border border-purple-200">
                    <span className="text-purple-600 block">Constraint Adj</span>
                    <span className="font-mono font-medium text-purple-700">
                      -{(route.constraintAdjustment * 100).toFixed(1)}c
                    </span>
                  </div>
                )}
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  <span className="text-slate-500 block">Gross</span>
                  <span className="font-mono font-medium text-slate-700">
                    {route.grossMargin >= 0 ? '+' : ''}{(route.grossMargin * 100).toFixed(0)}c
                  </span>
                </div>
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  <span className="text-slate-500 block">Total $</span>
                  <span className={`font-mono font-medium ${
                    route.totalMargin >= 0 ? 'text-slate-700' : 'text-red-600'
                  }`}>
                    {formatCurrency(route.totalMargin, 0)}
                  </span>
                </div>
              </div>

              {/* Carry breakdown if enabled */}
              {route.carryCost > 0 && route.carryBreakdown && (
                <div className="mt-2 text-xs text-wheat-600 bg-wheat-50/50 rounded-lg px-2.5 py-1.5 border border-wheat-100">
                  <span className="font-medium">Carry ({route.carryBreakdown.daysHeld}d):</span> Interest {(route.carryBreakdown.interestCost * 100).toFixed(1)}c + Storage {(route.carryBreakdown.storageCost * 100).toFixed(1)}c
                </div>
              )}

              {/* Constraint breakdown */}
              {route.constraintAdjustment > 0 && (route.qualityAdjustment > 0 || route.arInterestCost > 0) && (
                <div className="mt-2 text-xs text-purple-600 bg-purple-50/50 rounded-lg px-2.5 py-1.5 border border-purple-100">
                  <span className="font-medium">Constraint adj:</span> {route.qualityAdjustment > 0 && `Quality -${(route.qualityAdjustment * 100).toFixed(1)}c`}
                  {route.qualityAdjustment > 0 && route.arInterestCost > 0 && ' + '}
                  {route.arInterestCost > 0 && `A/R interest -${(route.arInterestCost * 100).toFixed(1)}c`}
                </div>
              )}

              {/* Winner Badge */}
              {isWinner && (
                <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${allNegative ? 'text-amber-600' : colors.text}`}>
                  {allNegative ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Least-Loss Outlet</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {constraintsEnabled && (excludedRoutes.length > 0 || route.constraintAdjustment > 0)
                          ? 'Best Outlet (after constraints)'
                          : 'Best Outlet'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Advantage over #2:</span>
          <span className="font-mono font-semibold text-slate-800">
            {rankedRoutes.length > 1
              ? `+${((bestRoute.netback - rankedRoutes[1].netback) * 100).toFixed(1)}c/bu`
              : 'N/A'}
          </span>
        </div>
        {rankedRoutes.length > 1 && (
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-600">Total $ advantage:</span>
            <span className="font-mono font-semibold text-slate-800">
              {formatCurrency(bestRoute.totalMargin - rankedRoutes[1].totalMargin, 0)}
            </span>
          </div>
        )}
      </div>

      {/* Excluded Routes Section */}
      {excludedRoutes.length > 0 && (
        <div className="mt-4 bg-slate-100 rounded-xl p-4">
          <div className="section-subheader mb-2">
            Excluded by Constraints ({excludedRoutes.length})
          </div>
          {excludedRoutes.map(({ route, reason }) => (
            <div key={route.id} className="text-xs text-slate-500 flex justify-between py-1.5 border-b border-slate-200 last:border-0">
              <span className="line-through">{getRouteName(route)}</span>
              <span className="text-red-500 ml-2">{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
