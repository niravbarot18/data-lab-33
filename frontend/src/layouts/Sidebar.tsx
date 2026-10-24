import React from 'react';
import {
  Wind,
  BarChart3,
  ShieldCheck,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggle,
}) => {
  return (
    <aside
      className={`bg-navy-900 text-white flex flex-col min-h-screen border-r border-navy-800 flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Brand Header */}
      <div
        className={`p-4 border-b border-navy-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'
          }`}
      >
        <div
          className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'justify-center' : ''
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-forecast to-teal-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Wind className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                WindIQ{' '}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                Wind Forecast Analytics
              </p>
            </div>
          )}
        </div>

        {onToggle && !isCollapsed && (
          <button
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-navy-800 transition-colors focus:outline-none focus:ring-1 focus:ring-forecast"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {!isCollapsed ? (
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider px-3 mb-2">
            Analytics
          </div>
        ) : (
          <div className="h-4" />
        )}

        <a
          href="#analysis"
          title="Wind Forecast Analysis"
          className={`flex items-center rounded-md text-sm font-medium bg-navy-800 text-white border-l-2 border-forecast transition-colors ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2'
            }`}
        >
          <BarChart3 className="w-4 h-4 text-forecast-light flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Wind Forecast Analysis</span>}
        </a>
      </nav>

      {/* Scope and Disclaimer Box */}
      {!isCollapsed ? (
        <div className="p-4 m-3 bg-navy-800/80 rounded-lg border border-navy-700 text-xs text-slate-300 transition-opacity duration-200">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            <span>Elexon BMRS Stream</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Actuals from FUELHH (WIND) and forecasts from WINDFOR. Strict as-of decision cutoff vintage selection.
          </p>
          <div className="mt-3 pt-2 border-t border-navy-700 flex items-center justify-between text-[10px] text-slate-400">
            <span>January 2026 Audit</span>
            <a
              href="https://bmrs.elexon.co.uk/api-documentation"
              target="_blank"
              rel="noreferrer"
              className="text-teal-400 hover:underline flex items-center gap-0.5"
            >
              BMRS Docs <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="p-2 mb-2 flex justify-center">
          <div
            className="w-10 h-10 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center text-teal-400 cursor-help"
            title="Elexon BMRS Stream: Actuals (FUELHH) & Forecasts (WINDFOR)"
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Footer / Toggle Button in Collapsed Mode */}
      <div
        className={`p-4 border-t border-navy-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'
          } text-slate-400`}
      >
        {!isCollapsed ? (
          <div>
            <p className="text-[11px] text-slate-400">WindIQ Decision Support</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Not an automated trading engine.
            </p>
          </div>
        ) : (
          onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-md hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )
        )}
      </div>
    </aside>
  );
};
