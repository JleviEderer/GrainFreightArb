/**
 * Break-even Calculator
 * Computes break-even points and decision triggers for route switching
 */

/**
 * Calculate break-even freight for a route
 * This is the maximum freight where this route still beats the next best alternative
 *
 * @param {Object} params
 * @param {Object} params.currentRoute - The route to analyze
 * @param {Object} params.alternativeRoute - The next best alternative
 * @returns {Object} Break-even analysis
 */
export function calculateBreakEvenFreight(currentRoute, alternativeRoute) {
  if (!alternativeRoute) {
    return {
      breakEvenFreight: Infinity,
      currentFreight: currentRoute.freightCost,
      headroom: Infinity,
      description: 'No alternative route to compare'
    };
  }

  // Current route wins when:
  // (destBasis_current - freightCost_current) > (destBasis_alt - freightCost_alt)
  //
  // Break-even freight for current route:
  // destBasis_current - breakEvenFreight = destBasis_alt - freightCost_alt
  // breakEvenFreight = destBasis_current - destBasis_alt + freightCost_alt

  const breakEvenFreight =
    currentRoute.destinationBasis -
    alternativeRoute.destinationBasis +
    alternativeRoute.freightCost;

  const headroom = breakEvenFreight - currentRoute.freightCost;

  return {
    breakEvenFreight,
    currentFreight: currentRoute.freightCost,
    headroom,
    alternativeRoute: alternativeRoute.name,
    description:
      headroom > 0
        ? `Freight can increase $${headroom.toFixed(2)}/bu before switching to ${alternativeRoute.name}`
        : `Already losing to ${alternativeRoute.name} by $${Math.abs(headroom).toFixed(2)}/bu on freight`
  };
}

/**
 * Calculate break-even basis for a route
 * This is how much the destination basis can weaken before switching
 *
 * @param {Object} params
 * @param {Object} params.currentRoute - The route to analyze
 * @param {Object} params.alternativeRoute - The next best alternative
 * @returns {Object} Break-even basis analysis
 */
export function calculateBreakEvenBasis(currentRoute, alternativeRoute) {
  if (!alternativeRoute) {
    return {
      breakEvenBasis: -Infinity,
      currentBasis: currentRoute.destinationBasis,
      headroom: Infinity,
      description: 'No alternative route to compare'
    };
  }

  // Break-even basis for current route:
  // breakEvenBasis - freightCost_current = destBasis_alt - freightCost_alt
  // breakEvenBasis = destBasis_alt - freightCost_alt + freightCost_current

  const breakEvenBasis =
    alternativeRoute.destinationBasis -
    alternativeRoute.freightCost +
    currentRoute.freightCost;

  const headroom = currentRoute.destinationBasis - breakEvenBasis;

  return {
    breakEvenBasis,
    currentBasis: currentRoute.destinationBasis,
    headroom,
    headroomCents: headroom * 100,
    alternativeRoute: alternativeRoute.name,
    description:
      headroom > 0
        ? `Basis can weaken ${(headroom * 100).toFixed(0)}¢ before switching to ${alternativeRoute.name}`
        : `Already losing to ${alternativeRoute.name} by ${Math.abs(headroom * 100).toFixed(0)}¢ on basis`
  };
}

/**
 * Generate complete break-even analysis for all routes
 *
 * @param {Array} rankedRoutes - Routes already sorted by netback (best first)
 * @returns {Array} Routes with break-even analysis attached
 */
export function analyzeAllBreakEvens(rankedRoutes) {
  return rankedRoutes.map((route, index) => {
    // Compare against next best alternative
    const alternativeRoute = rankedRoutes.find(
      (r, i) => i !== index && r.rank > route.rank
    );

    // For the worst route, compare against the best
    const comparisonRoute =
      alternativeRoute || (index > 0 ? rankedRoutes[0] : null);

    const freightAnalysis = calculateBreakEvenFreight(route, comparisonRoute);
    const basisAnalysis = calculateBreakEvenBasis(route, comparisonRoute);

    return {
      ...route,
      breakEven: {
        freight: freightAnalysis,
        basis: basisAnalysis
      }
    };
  });
}

/**
 * Generate decision trigger summary
 *
 * @param {Object} bestRoute - The currently best route with break-even analysis
 * @param {Object} secondRoute - The second best route
 * @returns {Object} Decision trigger information
 */
export function generateDecisionTrigger(bestRoute, secondRoute) {
  if (!secondRoute) {
    return {
      trigger: null,
      summary: 'Only one route available'
    };
  }

  const freightTrigger = bestRoute.breakEven.freight.breakEvenFreight;
  const basisTrigger = bestRoute.breakEven.basis.breakEvenBasis;
  const marginAdvantage = bestRoute.netback - secondRoute.netback;

  return {
    currentBest: bestRoute.name,
    runnerUp: secondRoute.name,
    marginAdvantage,
    marginAdvantageCents: marginAdvantage * 100,
    triggers: {
      freight: {
        value: freightTrigger,
        current: bestRoute.freightCost,
        flipWhen: `freight exceeds $${freightTrigger.toFixed(2)}/bu`
      },
      basis: {
        value: basisTrigger,
        current: bestRoute.destinationBasis,
        flipWhen: `basis weakens below ${(basisTrigger * 100).toFixed(0)}¢`
      }
    },
    summary: `${bestRoute.name} wins by ${(marginAdvantage * 100).toFixed(0)}¢/bu. ` +
      `Flip to ${secondRoute.name} if freight exceeds $${freightTrigger.toFixed(2)}/bu ` +
      `or basis weakens ${(bestRoute.breakEven.basis.headroom * 100).toFixed(0)}¢.`
  };
}
