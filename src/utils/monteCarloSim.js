/**
 * Monte Carlo Risk Simulation
 * Runs probabilistic analysis of outcome distributions
 *
 * ECONOMICS SUMMARY:
 * -----------------
 * Per route, per iteration:
 *
 * 1. FREIGHT UNCERTAINTY
 *    freight = max(0, base_freight + Normal(0, freight_sigma))
 *    - Freight costs can vary due to market conditions, fuel prices, capacity
 *    - Clamped to 0 (freight can't be negative)
 *
 * 2. BASIS UNCERTAINTY
 *    dest_basis = base_dest_basis + Normal(0, basis_sigma)
 *    - Destination basis can strengthen or weaken from current quote
 *    - Origin basis is held fixed (we're committed at origin)
 *
 * 3. GROSS MARGIN
 *    gross = dest_basis - origin_basis
 *    - Spread between destination and origin basis
 *
 * 4. BASE NETBACK
 *    netback = gross - freight - carry_cost (if carry enabled)
 *    - Carry cost only included when carry toggle is ON
 *
 * 5. DELAY RISK
 *    With probability p, a delay of extra_days occurs:
 *    - delay_interest = origin_cash * (rate/100) * (extra_days/365)
 *      (financing cost on capital tied up during delay)
 *    - delay_storage = (storageCentsPerMonth/100) * (extra_days/30)
 *      (storage cost only if carry is enabled)
 *    - delay_cost = delay_interest + delay_storage
 *
 * 6. FINAL NETBACK
 *    final_netback = netback - delay_cost
 *
 * SANITY CHECK:
 * When freight_sigma=0, basis_sigma=0, delay_prob=0:
 * MC expected netback should equal deterministic netback exactly.
 */

/**
 * Generate a random number from a normal distribution
 * Using Box-Muller transform
 *
 * @param {number} mean - Mean of distribution
 * @param {number} stdDev - Standard deviation
 * @returns {number} Random sample
 */
function normalRandom(mean, stdDev) {
  if (stdDev === 0) return mean;
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Calculate netback for a Monte Carlo iteration
 *
 * Economics:
 * - Freight sampled around base with normal distribution, floored at 0
 * - Destination basis sampled around base with normal distribution
 * - Origin basis is fixed (committed position)
 * - Gross margin = dest_basis - origin_basis
 * - Netback = gross - freight - carry (if enabled)
 * - Delay adds financing cost (interest on origin cash) + storage (if carry enabled)
 *
 * @param {Object} route - Route configuration
 * @param {number} originBasis - Origin basis (fixed)
 * @param {Object} sample - Sampled values for this iteration
 * @param {Object} carrySettings - Carry cost settings
 * @returns {number} Netback for this iteration
 */
function calculateIterationNetback(route, originBasis, sample, carrySettings) {
  // Freight uncertainty: max(0, base + Normal(0, sigma))
  // Freight can't go negative
  const adjustedFreight = Math.max(0, route.freightCost + sample.freightDelta);

  // Basis uncertainty: base + Normal(0, sigma)
  // Destination basis can strengthen or weaken
  const adjustedDestBasis = route.destinationBasis + sample.basisDelta;

  // Gross margin = dest_basis - origin_basis (origin fixed)
  const grossMargin = adjustedDestBasis - originBasis;

  // Base carry cost (only if carry enabled)
  const baseCarryCost = carrySettings.enabled ? carrySettings.carryCost : 0;

  // Base netback before delay
  const baseNetback = grossMargin - adjustedFreight - baseCarryCost - (route.otherCosts || 0);

  // Delay cost calculation
  // Interest component: financing cost on origin cash during delay
  // origin_cash = futures + origin_basis
  // delay_interest = origin_cash * (rate/100) * (delay_days/365)
  const delayInterest = sample.delayDays > 0
    ? carrySettings.originCashPrice * (carrySettings.interestRate / 100) * (sample.delayDays / 365)
    : 0;

  // Storage component: only if carry is enabled
  // delay_storage = (storageCentsPerMonth/100) * (delay_days/30)
  const delayStorage = (sample.delayDays > 0 && carrySettings.enabled)
    ? (carrySettings.storageCentsPerMonth / 100) * (sample.delayDays / 30)
    : 0;

  const delayCost = delayInterest + delayStorage;

  // Final netback
  const netback = baseNetback - delayCost;

  return netback;
}

/**
 * Run Monte Carlo simulation for a single route
 *
 * @param {Object} params
 * @param {Object} params.route - Route to simulate
 * @param {number} params.originBasis - Origin basis (fixed)
 * @param {Object} params.uncertainty - Uncertainty parameters
 * @param {Object} params.carrySettings - Carry cost settings
 * @param {number} params.iterations - Number of iterations
 * @returns {Object} Simulation results
 */
export function runRouteSimulation({
  route,
  originBasis,
  uncertainty,
  carrySettings,
  iterations = 10000
}) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    // Freight uncertainty: Normal(0, freight_sigma)
    // Will be clamped to ensure freight >= 0 in calculation
    const freightDelta = normalRandom(0, uncertainty.freightSigma);

    // Basis uncertainty: Normal(0, basis_sigma)
    const basisDelta = normalRandom(0, uncertainty.basisSigma);

    // Delay risk: discrete event with probability p
    const hasDelay = Math.random() < uncertainty.delayProbability;
    const delayDays = hasDelay ? uncertainty.delayDays : 0;

    const sample = { freightDelta, basisDelta, delayDays };
    const netback = calculateIterationNetback(route, originBasis, sample, carrySettings);

    results.push({
      iteration: i,
      netback,
      ...sample
    });
  }

  return analyzeResults(results, route);
}

/**
 * Analyze Monte Carlo results
 *
 * @param {Array} results - Array of iteration results
 * @param {Object} route - Route info
 * @returns {Object} Statistical analysis
 */
function analyzeResults(results, route) {
  const netbacks = results.map(r => r.netback).sort((a, b) => a - b);
  const n = netbacks.length;

  // Basic statistics
  const mean = netbacks.reduce((a, b) => a + b, 0) / n;
  const median = netbacks[Math.floor(n / 2)];

  // Variance and std dev
  const variance = netbacks.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Percentiles
  const p5 = netbacks[Math.floor(n * 0.05)];
  const p10 = netbacks[Math.floor(n * 0.10)];
  const p25 = netbacks[Math.floor(n * 0.25)];
  const p75 = netbacks[Math.floor(n * 0.75)];
  const p90 = netbacks[Math.floor(n * 0.90)];
  const p95 = netbacks[Math.floor(n * 0.95)];

  // Probability of loss
  const lossCount = netbacks.filter(x => x < 0).length;
  const probLoss = lossCount / n;

  // Value at Risk (5th percentile loss)
  const var5 = -p5;

  // Generate histogram data for charting
  const histogram = generateHistogram(netbacks, 30);

  return {
    route: {
      id: route.id,
      name: route.name
    },
    statistics: {
      mean,
      median,
      stdDev,
      min: netbacks[0],
      max: netbacks[n - 1]
    },
    percentiles: {
      p5,
      p10,
      p25,
      p75,
      p90,
      p95
    },
    risk: {
      probLoss,
      probLossPct: probLoss * 100,
      var5,
      lossCount,
      totalIterations: n
    },
    histogram,
    rawResults: results
  };
}

/**
 * Generate histogram data for visualization
 *
 * @param {Array} values - Sorted array of values
 * @param {number} bins - Number of bins
 * @returns {Array} Histogram data
 */
function generateHistogram(values, bins) {
  const min = values[0];
  const max = values[values.length - 1];

  // Handle edge case where all values are the same
  if (min === max) {
    return [{
      binStart: min,
      binEnd: max,
      binMid: min,
      count: values.length,
      frequency: 1
    }];
  }

  const binWidth = (max - min) / bins;

  const histogram = [];
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = values.filter(v => v >= binStart && v < binEnd).length;

    histogram.push({
      binStart,
      binEnd,
      binMid: (binStart + binEnd) / 2,
      count,
      frequency: count / values.length
    });
  }

  // Last bin includes max value
  if (histogram.length > 0) {
    const lastBin = histogram[histogram.length - 1];
    const maxCount = values.filter(v => v >= lastBin.binStart).length;
    lastBin.count = maxCount;
    lastBin.frequency = maxCount / values.length;
  }

  return histogram;
}

/**
 * Run Monte Carlo simulation for all routes and compare
 *
 * @param {Object} params
 * @param {Array} params.routes - Routes to simulate
 * @param {number} params.originBasis - Origin basis
 * @param {Object} params.uncertainty - Uncertainty parameters
 * @param {Object} params.carrySettings - Carry cost settings
 * @param {number} params.iterations - Number of iterations
 * @returns {Object} Combined simulation results
 */
export function runFullSimulation({
  routes,
  originBasis,
  uncertainty,
  carrySettings,
  iterations = 10000
}) {
  const routeResults = routes.map(route =>
    runRouteSimulation({
      route,
      originBasis,
      uncertainty,
      carrySettings,
      iterations
    })
  );

  // Calculate which route wins each iteration
  const winCounts = {};
  routes.forEach(r => { winCounts[r.id] = 0; });

  for (let i = 0; i < iterations; i++) {
    let bestRoute = null;
    let bestNetback = -Infinity;

    routeResults.forEach(result => {
      const netback = result.rawResults[i].netback;
      if (netback > bestNetback) {
        bestNetback = netback;
        bestRoute = result.route.id;
      }
    });

    if (bestRoute) {
      winCounts[bestRoute]++;
    }
  }

  // Win probabilities
  const winProbabilities = routes.map(route => ({
    id: route.id,
    name: route.name,
    wins: winCounts[route.id],
    probability: winCounts[route.id] / iterations,
    probabilityPct: (winCounts[route.id] / iterations) * 100
  }));

  // Rank by expected value
  routeResults.sort((a, b) => b.statistics.mean - a.statistics.mean);

  return {
    routeResults,
    winProbabilities,
    iterations,
    uncertainty,
    bestExpectedRoute: routeResults[0]?.route
  };
}

/**
 * Default uncertainty parameters
 *
 * freightSigma: Standard deviation for freight cost ($/bu)
 *   - Typical range: 0.05-0.15 depending on market volatility
 *
 * basisSigma: Standard deviation for destination basis ($/bu)
 *   - Typical range: 0.03-0.10 depending on market
 *
 * delayProbability: Chance of load-out delay (0-1)
 *   - Typical: 5-15% depending on elevator congestion
 *
 * delayDays: Days of delay if delay occurs
 *   - Typical: 3-7 days for elevator delays
 */
export const DEFAULT_UNCERTAINTY = {
  freightSigma: 0.05,          // $0.05/bu standard deviation
  basisSigma: 0.03,            // $0.03/bu (3¢) standard deviation
  delayProbability: 0.10,      // 10% chance of delay
  delayDays: 5                 // 5 day delay if it occurs
};
