/**
 * Market Wire Generator
 * Auto-generates actionable summary bullets for the trading desk
 */

import { formatCurrency, formatBasis } from './netbackCalc';

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
  return `${mode} → ${dest}`;
};

/**
 * Generate the complete market wire summary
 *
 * @param {Object} params
 * @param {Array} params.rankedRoutes - Routes ranked by netback
 * @param {Object} params.decisionTrigger - Decision trigger analysis
 * @param {Object} params.constraints - Active constraints
 * @param {Object} params.monteCarloResults - Monte Carlo simulation results (optional)
 * @param {Object} params.inputs - User inputs (origin, volume, etc.)
 * @returns {Object} Market wire content
 */
export function generateMarketWire({
  rankedRoutes,
  decisionTrigger,
  constraints = {},
  monteCarloResults = null,
  inputs = {}
}) {
  const bullets = [];
  const warnings = [];

  // Get best and second-best routes
  const bestRoute = rankedRoutes[0];
  const secondRoute = rankedRoutes[1];

  if (!bestRoute) {
    return {
      bullets: ['No routes available for analysis'],
      warnings: ['Add route configurations to generate recommendations'],
      timestamp: new Date().toISOString()
    };
  }

  // 1. Best outlet recommendation
  bullets.push({
    type: 'recommendation',
    priority: 1,
    text: `Best outlet: ${getRouteName(bestRoute)} (${formatNetback(bestRoute.netback)} netback)`,
    detail: `Delivers ${formatCurrency(bestRoute.totalMargin)} total margin on ${formatVolume(bestRoute.volume)}`
  });

  // 2. Margin advantage over alternatives
  if (secondRoute) {
    const advantage = bestRoute.netback - secondRoute.netback;
    bullets.push({
      type: 'comparison',
      priority: 2,
      text: `Margin advantage: ${formatCents(advantage)} over ${getRouteName(secondRoute)}`,
      detail: secondRoute.netback >= 0
        ? `${getRouteName(secondRoute)} netback: ${formatNetback(secondRoute.netback)}`
        : `${getRouteName(secondRoute)} shows negative margin`
    });
  }

  // 3. Break-even freight
  if (bestRoute.breakEven?.freight) {
    const { breakEvenFreight, currentFreight, headroom } = bestRoute.breakEven.freight;
    if (isFinite(breakEvenFreight)) {
      bullets.push({
        type: 'breakeven',
        priority: 3,
        text: `Break-even freight: ${formatCurrency(breakEvenFreight)}/bu (current: ${formatCurrency(currentFreight)})`,
        detail: `${formatCurrency(headroom)}/bu headroom before route switch`
      });
    }
  }

  // 4. Decision trigger
  if (decisionTrigger?.triggers) {
    const { freight, basis } = decisionTrigger.triggers;
    bullets.push({
      type: 'trigger',
      priority: 4,
      text: `Flip trigger: Switch to ${decisionTrigger.runnerUp} if freight > ${formatCurrency(freight.value)}/bu or basis < ${formatCents(basis.value)}`,
      detail: decisionTrigger.summary
    });
  }

  // 5. Execution notes
  if (bestRoute.transitDays) {
    bullets.push({
      type: 'execution',
      priority: 5,
      text: `Transit time: ${bestRoute.transitDays} days to destination`,
      detail: bestRoute.freightMode === 'rail'
        ? 'Secure rail slot early; capacity can be constrained'
        : bestRoute.freightMode === 'truck'
          ? 'Confirm truck availability for delivery window'
          : 'Coordinate barge loading schedule'
    });
  }

  // 6. Monte Carlo risk summary
  if (monteCarloResults?.routeResults?.[0]) {
    const mcResult = monteCarloResults.routeResults.find(
      r => r.route.id === bestRoute.id
    );

    if (mcResult) {
      const { risk, percentiles } = mcResult;
      bullets.push({
        type: 'risk',
        priority: 6,
        text: `Risk analysis: ${risk.probLossPct.toFixed(1)}% probability of loss`,
        detail: `Expected: ${formatNetback(mcResult.statistics.mean)}, 5th pctl: ${formatNetback(percentiles.p5)}, 95th pctl: ${formatNetback(percentiles.p95)}`
      });

      // Win probability if multiple routes
      if (monteCarloResults.winProbabilities?.length > 1) {
        const winProb = monteCarloResults.winProbabilities.find(
          w => w.id === bestRoute.id
        );
        if (winProb) {
          bullets.push({
            type: 'probability',
            priority: 7,
            text: `Win probability: ${winProb.probabilityPct.toFixed(0)}% chance ${getRouteName(bestRoute)} remains optimal`,
            detail: 'Based on Monte Carlo simulation with input uncertainties'
          });
        }
      }
    }
  }

  // 7. Constraint warnings
  if (constraints.railUnavailable && bestRoute.freightMode === 'rail') {
    warnings.push({
      type: 'constraint',
      text: `WARNING: ${getRouteName(bestRoute)} requires rail but rail capacity is unavailable`,
      recommendation: `Consider ${secondRoute?.name || 'alternative routes'}`
    });
  }

  if (constraints.maxTruckCapacity && bestRoute.freightMode === 'truck') {
    if (bestRoute.volume > constraints.maxTruckCapacity) {
      warnings.push({
        type: 'capacity',
        text: `WARNING: Volume exceeds weekly truck capacity (${formatVolume(constraints.maxTruckCapacity)})`,
        recommendation: 'Split shipment or extend delivery window'
      });
    }
  }

  if (constraints.qualityDiscount > 0) {
    warnings.push({
      type: 'quality',
      text: `Quality discount applied: ${formatCurrency(constraints.qualityDiscount)}/bu`,
      recommendation: 'Verify grade specs before commitment'
    });
  }

  // 8. Storage/carry note
  if (inputs.holdDays > 0 && inputs.storageCost) {
    const carryCost = inputs.holdDays * inputs.storageCost;
    bullets.push({
      type: 'carry',
      priority: 8,
      text: `Carry cost: ${formatCurrency(carryCost)}/bu for ${inputs.holdDays} day hold`,
      detail: 'Included in netback calculation'
    });
  }

  return {
    bullets: bullets.sort((a, b) => a.priority - b.priority),
    warnings,
    summary: generateExecutiveSummary(bullets, warnings, bestRoute),
    timestamp: new Date().toISOString(),
    bestRoute: getRouteName(bestRoute)
  };
}

/**
 * Generate a one-paragraph executive summary
 */
function generateExecutiveSummary(bullets, warnings, bestRoute) {
  const parts = [];

  parts.push(`Recommendation: ${getRouteName(bestRoute)} at ${formatNetback(bestRoute.netback)}/bu netback.`);

  const triggerBullet = bullets.find(b => b.type === 'trigger');
  if (triggerBullet) {
    parts.push(triggerBullet.detail || triggerBullet.text);
  }

  if (warnings.length > 0) {
    parts.push(`Note: ${warnings.length} constraint warning(s) require attention.`);
  }

  return parts.join(' ');
}

/**
 * Format netback for display
 */
function formatNetback(value) {
  if (!isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${value.toFixed(2)}`;
}

/**
 * Format cents for display
 */
function formatCents(value) {
  if (!isFinite(value)) return '-';
  const cents = value * 100;
  const sign = cents >= 0 ? '+' : '';
  return `${sign}${cents.toFixed(0)}¢`;
}

/**
 * Format volume for display
 */
function formatVolume(bushels) {
  if (bushels >= 1000000) {
    return `${(bushels / 1000000).toFixed(2)}M bu`;
  } else if (bushels >= 1000) {
    return `${(bushels / 1000).toFixed(0)}K bu`;
  }
  return `${bushels.toLocaleString()} bu`;
}

/**
 * Convert market wire to plain text for clipboard
 */
export function marketWireToText(wire) {
  const lines = [];

  lines.push('=== GRAIN FREIGHT ARBITRAGE - TODAY\'S PLAN ===');
  lines.push('');

  wire.bullets.forEach((bullet, i) => {
    lines.push(`${i + 1}. ${bullet.text}`);
    if (bullet.detail) {
      lines.push(`   ${bullet.detail}`);
    }
  });

  if (wire.warnings.length > 0) {
    lines.push('');
    lines.push('--- WARNINGS ---');
    wire.warnings.forEach(warning => {
      lines.push(`! ${warning.text}`);
      if (warning.recommendation) {
        lines.push(`  → ${warning.recommendation}`);
      }
    });
  }

  lines.push('');
  lines.push(`Generated: ${new Date(wire.timestamp).toLocaleString()}`);

  return lines.join('\n');
}
