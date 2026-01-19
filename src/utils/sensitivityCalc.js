/**
 * Sensitivity Analysis Calculator
 * Generates 2D grid showing which route wins under different scenarios
 */

/**
 * Default sensitivity ranges
 */
export const DEFAULT_FREIGHT_MULTIPLIERS = [0.8, 0.9, 1.0, 1.1, 1.2, 1.4];
export const DEFAULT_BASIS_SHIFTS = [-0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15];

/**
 * Calculate netback for a scenario with modified freight and basis
 *
 * @param {Object} route - Base route configuration
 * @param {number} freightMultiplier - Multiplier for freight cost
 * @param {number} basisShift - Shift to apply to destination basis ($/bu)
 * @param {number} originBasis - Origin basis (constant)
 * @returns {number} Adjusted netback
 */
function calculateScenarioNetback(route, freightMultiplier, basisShift, originBasis) {
  const adjustedFreight = route.freightCost * freightMultiplier;
  const adjustedBasis = route.destinationBasis + basisShift;
  const grossMargin = adjustedBasis - originBasis;
  const netback = grossMargin - adjustedFreight - (route.otherCosts || 0);
  return netback;
}

/**
 * Find the best route for a given scenario
 *
 * @param {Array} routes - All routes to compare
 * @param {number} freightMultiplier - Multiplier for freight cost
 * @param {number} basisShift - Shift to apply to destination basis
 * @param {number} originBasis - Origin basis
 * @returns {Object} Best route info for this scenario
 */
function findBestRouteForScenario(routes, freightMultiplier, basisShift, originBasis) {
  let bestRoute = null;
  let bestNetback = -Infinity;

  routes.forEach(route => {
    const netback = calculateScenarioNetback(route, freightMultiplier, basisShift, originBasis);
    if (netback > bestNetback) {
      bestNetback = netback;
      bestRoute = route;
    }
  });

  return {
    routeId: bestRoute?.id,
    routeName: bestRoute?.name,
    netback: bestNetback
  };
}

/**
 * Generate complete sensitivity grid
 *
 * @param {Object} params
 * @param {Array} params.routes - Routes to analyze
 * @param {number} params.originBasis - Origin basis
 * @param {Array} params.freightMultipliers - Array of freight multipliers
 * @param {Array} params.basisShifts - Array of basis shifts ($/bu)
 * @returns {Object} Sensitivity grid data
 */
export function generateSensitivityGrid({
  routes,
  originBasis,
  freightMultipliers = DEFAULT_FREIGHT_MULTIPLIERS,
  basisShifts = DEFAULT_BASIS_SHIFTS
}) {
  const grid = [];
  const routeWinCounts = {};

  // Initialize win counts
  routes.forEach(route => {
    routeWinCounts[route.id] = 0;
  });

  // Generate grid data
  basisShifts.forEach(basisShift => {
    const row = {
      basisShift,
      basisShiftCents: basisShift * 100,
      cells: []
    };

    freightMultipliers.forEach(freightMultiplier => {
      const result = findBestRouteForScenario(
        routes,
        freightMultiplier,
        basisShift,
        originBasis
      );

      row.cells.push({
        freightMultiplier,
        freightPct: Math.round((freightMultiplier - 1) * 100),
        ...result
      });

      // Track wins
      if (result.routeId && routeWinCounts[result.routeId] !== undefined) {
        routeWinCounts[result.routeId]++;
      }
    });

    grid.push(row);
  });

  // Calculate statistics
  const totalScenarios = freightMultipliers.length * basisShifts.length;
  const routeStats = routes.map(route => ({
    id: route.id,
    name: route.name,
    wins: routeWinCounts[route.id],
    winPct: (routeWinCounts[route.id] / totalScenarios) * 100
  }));

  return {
    grid,
    freightMultipliers,
    basisShifts,
    routeStats,
    totalScenarios
  };
}

/**
 * Get color for route in heatmap
 *
 * @param {string} routeId - Route identifier
 * @param {number} netback - Netback value (for intensity)
 * @returns {Object} Color configuration
 */
export function getRouteColor(routeId, netback) {
  const colors = {
    'route-1': { base: '#1e40af', light: '#3b82f6', name: 'blue' },    // Rail to Gulf
    'route-2': { base: '#047857', light: '#10b981', name: 'green' },   // Truck + Barge
    'route-3': { base: '#b45309', light: '#f59e0b', name: 'amber' },   // Local Feed
    default: { base: '#64748b', light: '#94a3b8', name: 'slate' }
  };

  const routeColor = colors[routeId] || colors.default;

  // Adjust intensity based on netback (positive = more intense)
  const intensity = Math.min(1, Math.max(0, (netback + 0.2) / 0.4));

  return {
    ...routeColor,
    intensity,
    backgroundColor: netback >= 0 ? routeColor.base : routeColor.light,
    textColor: netback >= 0 ? '#ffffff' : '#1f2937'
  };
}

/**
 * Format cell label for heatmap
 *
 * @param {Object} cell - Cell data
 * @returns {string} Formatted label
 */
export function formatCellLabel(cell) {
  if (cell.netback === -Infinity || cell.netback === Infinity) {
    return '-';
  }
  return `${(cell.netback * 100).toFixed(0)}¢`;
}
