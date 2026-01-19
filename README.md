# Grain Freight Arbitrage Calculator

A decision support tool for grain merchandisers to compare netbacks across multiple shipping routes, incorporating break-even analysis, sensitivity heatmaps, and Monte Carlo risk simulation.

**Live Demo:** [grain-freight-arb.vercel.app](https://grain-freight-arb.vercel.app/)

![Grain Freight Arbitrage Calculator](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan)

## Features

### Core Analysis
- **Multi-Route Netback Comparison** - Compare up to 3 shipping routes simultaneously (rail, truck, barge combinations)
- **Break-Even Analysis** - Calculate freight and basis break-even points where routes become equivalent
- **Decision Triggers** - Automatic alerts when market movements would change the optimal route

### Advanced Analytics
- **Sensitivity Heatmap** - 2D grid showing how netbacks change across freight and basis scenarios
- **Monte Carlo Simulation** - 10,000-iteration risk analysis with configurable uncertainty parameters
- **Carry Cost Modeling** - Storage and interest cost calculations for inventory holding periods

### Execution Constraints
- **Hard Constraints** - Filter routes by rail availability, truck capacity, delivery windows
- **Soft Constraints** - Adjust netbacks for quality discounts and payment terms (A/R interest)

### Output
- **Market Wire** - Auto-generated trade recommendation summary
- **Risk Metrics** - Value at Risk (VaR), probability of loss, downside/upside scenarios

## Tech Stack

- **React 18** - Component architecture with hooks
- **Vite** - Fast development and optimized builds
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization (histograms, heatmaps)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Data Sources

- **Basis Data:** USDA AgTransport "Latest Week of Grain Basis Data"
- **Barge Freight:** USDA Grain Transportation Report
- **Rail/Truck Freight:** Configurable assumptions
- **Futures:** User input (references CBOT settlement)

All inputs are fully editable for scenario analysis.

## License

MIT
