/**
 * Netback Calculator
 * Computes the netback ($/bu) for each route
 *
 * Netback = (Futures + Destination Basis) - Freight - Origin Basis
 *
 * Alternatively expressed as:
 * Netback = Destination Basis - Origin Basis - Freight
 * (since futures cancel out when comparing routes)
 */

/**
 * Calculate netback for a single route
 * @param {Object} params
 * @param {number} params.futuresPrice - Futures price ($/bu)
 * @param {number} params.originBasis - Origin basis vs futures ($/bu, typically negative)
 * @param {number} params.destinationBasis - Destination basis vs futures ($/bu)
 * @param {number} params.freightCost - Total freight cost ($/bu)
 * @param {number} params.otherCosts - Other costs like quality discount, carrying costs ($/bu)
 * @returns {Object} Netback results
 */
export function calculateNetback({
  futuresPrice,
  originBasis,
  destinationBasis,
  freightCost,
  otherCosts = 0
}) {
  // Cash price at origin
  const originCashPrice = futuresPrice + originBasis;

  // Cash price at destination
  const destinationCashPrice = futuresPrice + destinationBasis;

  // Gross margin (before freight and other costs)
  const grossMargin = destinationBasis - originBasis;

  // Net margin (after freight and other costs)
  const netback = grossMargin - freightCost - otherCosts;

  return {
    originCashPrice,
    destinationCashPrice,
    grossMargin,
    freightCost,
    otherCosts,
    netback
  };
}

/**
 * Calculate carry cost based on storage and interest
 * @param {Object} params
 * @param {number} params.originCashPrice - Origin cash price ($/bu)
 * @param {number} params.daysHeld - Days held in storage
 * @param {number} params.storageCentsPerMonth - Storage cost in cents per bushel per month
 * @param {number} params.interestRatePercent - Annual interest rate as percentage
 * @returns {Object} Carry cost breakdown
 */
export function calculateCarryCost({
  originCashPrice,
  daysHeld,
  storageCentsPerMonth,
  interestRatePercent
}) {
  if (!daysHeld || daysHeld === 0) {
    return { interestCost: 0, storageCost: 0, totalCarry: 0 };
  }

  // Interest cost: OriginCashPrice × (Rate/100) × (Days/365)
  const interestCost = originCashPrice * (interestRatePercent / 100) * (daysHeld / 365);

  // Storage cost: (¢/month / 100) × (Days/30)
  const storageCost = (storageCentsPerMonth / 100) * (daysHeld / 30);

  // Total carry cost
  const totalCarry = interestCost + storageCost;

  return {
    interestCost,
    storageCost,
    totalCarry,
    daysHeld
  };
}

/**
 * Calculate netbacks for multiple routes and rank them
 * @param {Object} params
 * @param {number} params.futuresPrice - Futures price ($/bu)
 * @param {number} params.originBasis - Origin basis vs futures ($/bu)
 * @param {number} params.volume - Volume in bushels
 * @param {Array} params.routes - Array of route objects
 * @param {Object} params.carry - Carry cost parameters (optional)
 * @returns {Array} Ranked routes with netback calculations
 */
export function calculateAllNetbacks({
  futuresPrice,
  originBasis,
  volume,
  routes,
  carry = null
}) {
  // Calculate origin cash price for carry calculation
  const originCashPrice = futuresPrice + originBasis;

  // Calculate carry cost if enabled
  const carryCost = carry ? calculateCarryCost({
    originCashPrice,
    daysHeld: carry.daysHeld,
    storageCentsPerMonth: carry.storageCentsPerMonth,
    interestRatePercent: carry.interestRatePercent
  }) : { interestCost: 0, storageCost: 0, totalCarry: 0 };

  const results = routes.map(route => {
    const netbackResult = calculateNetback({
      futuresPrice,
      originBasis,
      destinationBasis: route.destinationBasis,
      freightCost: route.freightCost,
      otherCosts: route.otherCosts || 0
    });

    // Calculate netback after carry
    const netbackBeforeCarry = netbackResult.netback;
    const netbackAfterCarry = netbackBeforeCarry - carryCost.totalCarry;

    return {
      ...route,
      ...netbackResult,
      // Override netback with carry-adjusted value
      netbackBeforeCarry,
      netback: netbackAfterCarry,
      carryCost: carryCost.totalCarry,
      carryBreakdown: carryCost,
      totalMargin: netbackAfterCarry * volume,
      volume
    };
  });

  // Sort by netback descending (best first)
  results.sort((a, b) => b.netback - a.netback);

  // Add rank
  results.forEach((result, index) => {
    result.rank = index + 1;
    result.isBest = index === 0;
  });

  return results;
}

/**
 * Calculate truck freight cost based on distance
 * @param {number} distance - Distance in miles
 * @param {number} ratePerMile - Rate per bushel per mile (default from USDA)
 * @returns {number} Total freight cost per bushel
 */
export function calculateTruckFreight(distance, ratePerMile = 0.004) {
  return distance * ratePerMile;
}

/**
 * Format currency for display
 * @param {number} value - Dollar value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Format basis for display (always show sign)
 * @param {number} value - Basis value in dollars
 * @returns {string} Formatted basis string in cents
 */
export function formatBasis(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const cents = value * 100;
  const sign = cents >= 0 ? '+' : '';
  return `${sign}${cents.toFixed(0)}¢`;
}

/**
 * Apply execution constraints to filter and adjust routes
 * Hard constraints filter out routes entirely
 * Soft constraints adjust netback values
 *
 * @param {Object} params
 * @param {Array} params.routes - Array of routes with netback calculations
 * @param {Object} params.constraints - Constraint settings
 * @param {number} params.volume - Volume in bushels
 * @param {number} params.futuresPrice - Futures price for A/R interest calculation
 * @param {boolean} params.carryEnabled - Whether carry costs are enabled (required for A/R interest)
 * @param {number} params.interestRate - Interest rate for A/R calculation (default 8%)
 * @returns {Object} { routes: adjusted routes, excluded: excluded routes with reasons }
 */
export function applyConstraints({ routes, constraints, volume, futuresPrice, carryEnabled = false, interestRate = 8 }) {
  if (!constraints) return { routes, excluded: [] };

  const excluded = [];

  // Apply hard constraints (filter out routes)
  let filtered = routes.filter(route => {
    // Hard constraint: Rail unavailable
    if (constraints.railUnavailable && route.freightMode === 'rail') {
      excluded.push({ route, reason: 'Rail capacity unavailable' });
      return false;
    }

    // Hard constraint: Truck capacity exceeded
    if (constraints.maxTruckCapacity > 0 &&
        route.freightMode === 'truck' &&
        volume > constraints.maxTruckCapacity) {
      const diff = volume - constraints.maxTruckCapacity;
      excluded.push({
        route,
        reason: `Volume ${volume.toLocaleString()} bu exceeds truck capacity ${constraints.maxTruckCapacity.toLocaleString()} bu (exceeds by ${diff.toLocaleString()} bu)`
      });
      return false;
    }

    // Hard constraint: Delivery window
    if (constraints.deliveryWindow > 0 &&
        route.transitDays > constraints.deliveryWindow) {
      excluded.push({
        route,
        reason: `Transit ${route.transitDays}d exceeds ${constraints.deliveryWindow}d window`
      });
      return false;
    }

    return true;
  });

  // Apply soft constraints (adjust netback)
  filtered = filtered.map(route => {
    let adjustment = 0;
    let qualityAdjustment = 0;
    let arInterestCost = 0;

    // Quality discount
    if (constraints.qualityDiscount > 0) {
      qualityAdjustment = constraints.qualityDiscount;
      adjustment += qualityAdjustment;
    }

    // A/R interest cost (only when carry is enabled)
    // Uses destination cash price (sale price) as the basis
    if (carryEnabled && constraints.paymentDays > 0) {
      const saleCashPrice = futuresPrice + route.destinationBasis;
      arInterestCost = saleCashPrice * (interestRate / 100) * (constraints.paymentDays / 365);
      adjustment += arInterestCost;
    }

    if (adjustment === 0) {
      return route;
    }

    return {
      ...route,
      constraintAdjustment: adjustment,
      qualityAdjustment,
      arInterestCost,
      netbackBeforeConstraints: route.netback,
      netback: route.netback - adjustment,
      totalMargin: (route.netback - adjustment) * volume
    };
  });

  // Re-rank after adjustments
  filtered.sort((a, b) => b.netback - a.netback);
  filtered.forEach((r, i) => {
    r.rank = i + 1;
    r.isBest = i === 0;
  });

  return { routes: filtered, excluded };
}
