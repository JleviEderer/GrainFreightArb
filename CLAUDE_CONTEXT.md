# Grain Freight Arbitrage Decision System - Context Summary

**Last Updated:** 2026-01-18
**Purpose:** Contextual memory for Claude Code sessions

---

## Project Overview

A React-based grain freight arbitrage calculator built for a JDH interview demonstration. Compares netbacks across multiple shipping routes, incorporating break-evens, sensitivity analysis, Monte Carlo risk simulation, and execution constraints.

**Tech Stack:**
- React 18 + Vite
- Tailwind CSS
- Recharts (for charts/heatmaps)
- Local JSON data (no backend)

**Location:** `C:\Users\justi\OneDrive\Job Apps\JDH\grain-arbitrage\`

---

## File Structure

```
grain-arbitrage/
├── src/
│   ├── components/
│   │   ├── InputPanel.jsx         # Origin, futures, volume, route inputs
│   │   ├── RouteCard.jsx          # Individual route display
│   │   ├── NetbackResults.jsx     # Ranked results + excluded routes
│   │   ├── BreakEvenPanel.jsx     # Break-even analysis + decision triggers
│   │   ├── SensitivityHeatmap.jsx # 2D freight/basis sensitivity grid
│   │   ├── MonteCarloPanel.jsx    # Risk simulation UI + histogram
│   │   ├── ConstraintsPanel.jsx   # Hard/soft constraints UI
│   │   ├── CarryPanel.jsx         # Storage + interest carry costs
│   │   ├── MarketWire.jsx         # Auto-generated action summary
│   │   └── DataSourceBox.jsx      # Data source citations
│   ├── data/
│   │   └── defaults.json          # USDA snapshot data
│   ├── utils/
│   │   ├── netbackCalc.js         # Core netback + constraint logic
│   │   ├── breakEvenCalc.js       # Break-even calculations
│   │   ├── sensitivityCalc.js     # Sensitivity matrix generation
│   │   ├── monteCarloSim.js       # Monte Carlo simulation engine
│   │   └── marketWireGen.js       # Market wire text generation
│   ├── App.jsx                    # Main app with state management
│   └── main.jsx                   # Entry point
├── public/
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Core Economics

### Netback Formula
```
Netback = (Destination Basis - Origin Basis) - Freight - Carry Cost
```

Alternatively:
```
Netback = Gross Margin - Freight - Other Costs
where Gross Margin = Dest Basis - Origin Basis
```

### Carry Cost Formula
```
Interest Cost = OriginCashPrice × (Rate/100) × (Days/365)
Storage Cost  = (¢/month / 100) × (Days/30)
Total Carry   = Interest + Storage
```

### A/R Interest (Payment Terms)
```
A/R Interest = SaleCashPrice × (Rate/100) × (PaymentDays/365)
where SaleCashPrice = Futures + Destination Basis
```
**Note:** Only applies when Carry toggle is ON.

---

## Constraint System

### Hard Constraints (Filter Routes)
| Constraint | Logic |
|------------|-------|
| Rail Unavailable | Exclude routes with `freightMode === 'rail'` |
| Max Truck Capacity | Exclude truck routes if `volume > capacity` |
| Delivery Window | Exclude if `transitDays > deliveryWindow` |

### Soft Constraints (Adjust Netback)
| Constraint | Calculation |
|------------|-------------|
| Quality Discount | `netback -= qualityDiscount` |
| Payment Terms (A/R) | `netback -= saleCashPrice × rate × days/365` (only if carry ON) |

**Implementation:** `applyConstraints()` in `src/utils/netbackCalc.js`

---

## Monte Carlo Simulation

### Uncertainty Parameters
```javascript
DEFAULT_UNCERTAINTY = {
  freightSigma: 0.05,       // $/bu std dev (Normal distribution)
  basisSigma: 0.03,         // $/bu std dev (Normal distribution)
  delayProbability: 0.10,   // 10% chance of delay
  delayDays: 5              // Days of delay if it occurs
}
```

### Per-Iteration Formula
```
1. Freight = max(0, base_freight + Normal(0, freight_sigma))
2. Dest Basis = base_dest_basis + Normal(0, basis_sigma)
3. Gross Margin = dest_basis - origin_basis (origin fixed)
4. Base Netback = gross - freight - carry_cost (if carry ON)
5. Delay Cost (if delay occurs):
   - Interest: origin_cash × rate × delay_days/365 (always)
   - Storage: (¢/month/100) × delay_days/30 (only if carry ON)
6. Final Netback = base_netback - delay_cost
```

### Sanity Check
When `freightSigma=0, basisSigma=0, delayProbability=0`:
- MC expected value = deterministic netback (exactly)

**Implementation:** `src/utils/monteCarloSim.js`

---

## Key Components

### App.jsx State
```javascript
// Core inputs
origin, futuresPrice, volume, routes

// Feature toggles
monteCarloEnabled, constraintsEnabled, carryEnabled

// Settings
constraints, carry

// Computed (useMemo)
rankedRoutes, excludedRoutes, carryCostPerBu, decisionTrigger, marketWire
```

### NetbackResults.jsx
- Shows ranked routes with netback details
- Displays constraint adjustment badges when active
- Shows excluded routes with reasons
- Handles "No Viable Routes" edge case

### ConstraintsPanel.jsx
- Toggle-able panel (collapsed when disabled)
- Impact summary showing exclusions + adjustments
- Live truck capacity vs volume status
- A/R interest only shown when carry is ON

### MonteCarloPanel.jsx
- Toggle-able simulation (10,000 iterations)
- Histogram visualization with Recharts
- Key statistics: Expected, Downside (5%), Upside (95%)
- Risk metrics: Probability of Loss, VaR (5%)
- Route win probabilities bar chart

---

## Default Routes

| Route | Name | Path | Destination Basis |
|-------|------|------|-------------------|
| 1 | Rail to Gulf | Iowa → NOLA (rail) | NOLA basis |
| 2 | Truck+Barge to Gulf | Iowa → STL (truck) → NOLA (barge) | NOLA basis |
| 3 | Local Feed Yard | Iowa → 30mi (truck) | Local basis |

---

## Recent Changes (Jan 2026)

1. **Execution Constraints Integration**
   - Hard constraints filter routes entirely
   - Soft constraints adjust netback and re-rank
   - Excluded routes shown with reasons

2. **Payment Terms / A/R Update**
   - Renamed to "Payment Terms (days to cash receipt / A/R)"
   - Only applies when Carry toggle is ON
   - Uses destination cash price (sale price)
   - Shows A/R interest cost breakdown in UI

3. **Truck Capacity UI Clarity**
   - Live status line: Capacity vs Volume
   - Shows "✓ OK" or "Exceeds by X bu"
   - Detailed exclusion messages

4. **Monte Carlo Verification**
   - Documented economics in code comments
   - Changed freight from triangular to Normal distribution
   - Delay: interest always, storage only if carry ON
   - Zero-variance sanity check (short-circuit)
   - Updated UI labels: "Freight σ", "Basis σ"
   - Added VaR tooltip with definition
   - Dynamic delay explanation based on carry status

---

## Data Sources

- **Basis:** USDA AgTransport "Latest Week of Grain Basis Data"
- **Freight (Barge):** USDA Grain Transportation Report
- **Freight (Rail/Truck):** Assumptions (editable)
- **Futures:** User input (CBOT settlement reference)

All inputs are editable. Data snapshot date shown in footer.

---

## Verification Checklist

1. ✅ Constraint filtering: Rail off → rail routes excluded
2. ✅ Soft constraints: Quality discount → netbacks reduced
3. ✅ A/R interest: Only applies when carry ON
4. ✅ Truck capacity: Volume > capacity → truck routes excluded
5. ✅ Monte Carlo: Zero uncertainty → expected = deterministic
6. ✅ Reset button: Returns all inputs to defaults

---

## Known Considerations

- Monte Carlo runs 10,000 iterations client-side (performant)
- All calculations in $/bu, displayed in ¢/bu where appropriate
- Desktop-first design (responsive but optimized for laptop)
- No backend - all computation client-side

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

---

*This file serves as contextual memory for Claude Code sessions. Update after significant changes.*
