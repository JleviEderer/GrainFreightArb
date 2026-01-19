/**
 * DataSourceBox - Displays data source attribution and assumptions
 */
export default function DataSourceBox({ metadata }) {
  return (
    <div className="card p-5 bg-slate-50/50">
      <h4 className="font-display text-base text-slate-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Data Sources & Assumptions
      </h4>

      <div className="space-y-2.5 text-xs text-slate-600">
        <div className="flex items-start gap-2">
          <span className="font-medium text-slate-700 min-w-[80px]">Basis & Futures:</span>
          <span>
            {metadata.dataSource} (snapshot file), pulled {metadata.snapshotDate}.
            {' '}Data week: <span className="font-mono">{metadata.dataWeek}</span>.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="font-medium text-slate-700 min-w-[80px]">Freight:</span>
          <span>{metadata.freightNote}</span>
        </div>

        <div className="flex items-start gap-2">
          <span className="font-medium text-slate-700 min-w-[80px]">Carry:</span>
          <span>Storage + interest inputs are assumptions; editable. Interest calculated on origin cash price.</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 text-slate-500 italic">
          {metadata.disclaimer}
        </div>
      </div>
    </div>
  );
}
