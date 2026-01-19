import { useMemo } from 'react';
import { generateSensitivityGrid, getRouteColor, formatCellLabel } from '../utils/sensitivityCalc';

/**
 * SensitivityHeatmap - 2D grid showing which route wins under different scenarios
 */
export default function SensitivityHeatmap({ routes, originBasis }) {
  const sensitivityData = useMemo(() => {
    if (!routes || routes.length === 0) return null;

    return generateSensitivityGrid({
      routes,
      originBasis,
      freightMultipliers: [0.8, 0.9, 1.0, 1.1, 1.2, 1.4],
      basisShifts: [-0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15]
    });
  }, [routes, originBasis]);

  if (!sensitivityData) {
    return (
      <div className="card p-5 text-center text-slate-500 text-sm">
        Configure routes to see sensitivity analysis
      </div>
    );
  }

  const { grid, freightMultipliers, routeStats } = sensitivityData;

  // Color map for routes with explicit intensity levels for Tailwind JIT
  const routeColorMap = {
    'route-1': {
      high: 'bg-blue-500',
      med: 'bg-blue-400',
      low: 'bg-blue-300',
      light: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Rail Gulf'
    },
    'route-2': {
      high: 'bg-emerald-500',
      med: 'bg-emerald-400',
      low: 'bg-emerald-300',
      light: 'bg-emerald-100',
      text: 'text-emerald-800',
      label: 'River'
    },
    'route-3': {
      high: 'bg-amber-500',
      med: 'bg-amber-400',
      low: 'bg-amber-300',
      light: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'Local'
    },
    'route-4': {
      high: 'bg-purple-500',
      med: 'bg-purple-400',
      low: 'bg-purple-300',
      light: 'bg-purple-100',
      text: 'text-purple-800',
      label: 'Route 4'
    },
    'route-5': {
      high: 'bg-rose-500',
      med: 'bg-rose-400',
      low: 'bg-rose-300',
      light: 'bg-rose-100',
      text: 'text-rose-800',
      label: 'Route 5'
    }
  };

  const getRouteStyle = (routeId, netback) => {
    const colors = routeColorMap[routeId] || {
      high: 'bg-slate-500',
      med: 'bg-slate-400',
      low: 'bg-slate-300',
      light: 'bg-slate-200',
      text: 'text-slate-700',
      label: 'Unknown'
    };

    // Intensity based on netback - all cells get visible background + border
    if (netback >= 0.10) return { bgClass: colors.high, textClass: 'text-white' };
    if (netback >= 0.05) return { bgClass: colors.med, textClass: 'text-white' };
    if (netback >= 0) return { bgClass: colors.low, textClass: 'text-slate-900' };
    if (netback >= -0.05) return { bgClass: colors.light, textClass: colors.text };
    // Neutral/negative state - explicitly visible with light gray background and dark text
    return { bgClass: 'bg-slate-200', textClass: 'text-slate-700' };
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-slate-800">
          Sensitivity Analysis
        </h3>
        <span className="text-xs text-slate-500">
          Best route under each scenario
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b border-slate-100">
        {routeStats.filter(r => r.wins > 0).map(stat => {
          const colors = routeColorMap[stat.id] || { high: 'bg-slate-500', label: stat.name };
          return (
            <div key={stat.id} className="flex items-center gap-1.5 text-xs">
              <span className={`w-3 h-3 rounded ${colors.high}`}></span>
              <span className="text-slate-600">{stat.name}</span>
              <span className="text-slate-400 font-mono">({stat.winPct.toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-500 font-normal">
                <div className="flex flex-col">
                  <span>Basis Shift</span>
                  <span className="text-slate-400">v</span>
                </div>
              </th>
              {freightMultipliers.map(mult => (
                <th key={mult} className="p-2 text-center text-slate-500 font-normal whitespace-nowrap">
                  {mult === 1.0 ? (
                    <span className="font-medium text-slate-700">Current</span>
                  ) : (
                    <span className="font-mono">{mult < 1 ? '' : '+'}{((mult - 1) * 100).toFixed(0)}%</span>
                  )}
                </th>
              ))}
            </tr>
            <tr>
              <th className="px-2 pb-2 text-left text-slate-400 font-normal text-[10px]">
                Freight ->
              </th>
              {freightMultipliers.map(mult => (
                <th key={mult} className="px-2 pb-2 text-center text-slate-400 font-normal text-[10px] font-mono">
                  {mult.toFixed(1)}x
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIdx) => (
              <tr key={row.basisShift}>
                <td className="p-2 text-slate-600 font-medium whitespace-nowrap">
                  {row.basisShift === 0 ? (
                    <span className="text-slate-800">Current</span>
                  ) : (
                    <span className="font-mono">
                      {row.basisShift > 0 ? '+' : ''}{row.basisShiftCents.toFixed(0)}c
                    </span>
                  )}
                </td>
                {row.cells.map((cell, colIdx) => {
                  const style = getRouteStyle(cell.routeId, cell.netback);
                  const isCurrentScenario = row.basisShift === 0 && cell.freightMultiplier === 1.0;

                  return (
                    <td key={cell.freightMultiplier} className="p-1">
                      <div
                        className={`
                          p-2 rounded-lg text-center transition-all cursor-default
                          border border-slate-300
                          ${style.bgClass} ${style.textClass}
                          ${isCurrentScenario ? 'ring-2 ring-slate-800 ring-offset-1' : ''}
                        `}
                        title={`${cell.routeName}: ${(cell.netback * 100).toFixed(1)}c/bu netback\nFreight: ${cell.freightMultiplier}x | Basis: ${row.basisShift >= 0 ? '+' : ''}${row.basisShiftCents}c`}
                      >
                        <div className="font-mono font-medium">
                          {(cell.netback * 100).toFixed(0)}c
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Axis Labels */}
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span>&larr;</span>
          <span>Freight cheaper</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Freight higher</span>
          <span>&rarr;</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-3 text-xs">
          {routeStats.slice(0, 3).map(stat => (
            <div key={stat.id} className="text-center">
              <div className="font-medium text-slate-700">{stat.name}</div>
              <div className="text-slate-500">
                Wins <span className="font-mono">{stat.wins}/{sensitivityData.totalScenarios}</span> scenarios (<span className="font-mono">{stat.winPct.toFixed(0)}%</span>)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
