/**
 * CarryPanel - Storage and interest cost inputs
 * Calculates carry cost based on days held, storage rate, and interest on origin cash price
 */
export default function CarryPanel({
  carry,
  setCarry,
  enabled,
  onToggle,
  originCashPrice
}) {
  const handleChange = (field, value) => {
    setCarry(prev => ({ ...prev, [field]: value }));
  };

  // Calculate carry cost preview
  const calculateCarryPreview = () => {
    if (!enabled || carry.daysHeld === 0) return null;

    const interestCost = originCashPrice * (carry.interestRatePercent / 100) * (carry.daysHeld / 365);
    const storageCost = (carry.storageCentsPerMonth / 100) * (carry.daysHeld / 30);
    const totalCarry = interestCost + storageCost;

    return {
      interestCost,
      storageCost,
      totalCarry,
      totalCarryCents: totalCarry * 100
    };
  };

  const preview = calculateCarryPreview();

  return (
    <div className="card">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            enabled ? 'bg-navy-600 border-navy-600' : 'border-slate-300'
          }`}>
            {enabled && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="font-medium text-slate-700">Include Carry Costs</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${enabled ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      {enabled && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <p className="text-xs text-slate-500 mt-4 mb-4">
            Storage + interest on origin cash price. Deducted from netback.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {/* Days Held */}
            <div>
              <label className="block text-xs text-slate-600 mb-1.5 font-medium">Days Held</label>
              <input
                type="number"
                min="0"
                step="1"
                value={carry.daysHeld}
                onChange={(e) => handleChange('daysHeld', parseInt(e.target.value) || 0)}
                className="input py-2"
              />
            </div>

            {/* Storage Cost */}
            <div>
              <label className="block text-xs text-slate-600 mb-1.5 font-medium">Storage (c/bu/mo)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={carry.storageCentsPerMonth}
                onChange={(e) => handleChange('storageCentsPerMonth', parseFloat(e.target.value) || 0)}
                className="input py-2"
              />
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-xs text-slate-600 mb-1.5 font-medium">Interest (% ann.)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={carry.interestRatePercent}
                onChange={(e) => handleChange('interestRatePercent', parseFloat(e.target.value) || 0)}
                className="input py-2"
              />
            </div>
          </div>

          {/* Carry Cost Preview */}
          {preview && carry.daysHeld > 0 && (
            <div className="mt-4 bg-wheat-50 border border-wheat-200 rounded-xl p-4">
              <div className="text-xs font-medium text-wheat-800 mb-2">
                Carry Cost Preview ({carry.daysHeld} days)
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-wheat-600 block">Interest</span>
                  <span className="font-mono font-medium text-wheat-900">
                    {(preview.interestCost * 100).toFixed(1)}c/bu
                  </span>
                </div>
                <div>
                  <span className="text-wheat-600 block">Storage</span>
                  <span className="font-mono font-medium text-wheat-900">
                    {(preview.storageCost * 100).toFixed(1)}c/bu
                  </span>
                </div>
                <div>
                  <span className="text-wheat-600 block">Total Carry</span>
                  <span className="font-mono font-bold text-wheat-900">
                    {preview.totalCarryCents.toFixed(1)}c/bu
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-wheat-700">
                Based on origin cash: <span className="font-mono">${originCashPrice.toFixed(2)}/bu</span>
              </div>
            </div>
          )}

          {/* Formula Reference */}
          <div className="mt-3 text-xs text-slate-400 font-mono">
            <div>Interest = CashPrice x (Rate/100) x (Days/365)</div>
            <div>Storage = (c/mo/100) x (Days/30)</div>
          </div>
        </div>
      )}
    </div>
  );
}
