import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  side?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'bottom',
  align = 'center',
}) => {
  const [visible, setVisible] = useState(false);

  const getPositionClasses = () => {
    // Vertical positioning
    const verticalClass =
      side === 'top'
        ? 'bottom-full mb-2'
        : 'top-full mt-2';

    // Horizontal positioning
    let horizontalClass = 'left-1/2 -translate-x-1/2';
    if (align === 'left') {
      horizontalClass = 'left-0';
    } else if (align === 'right') {
      horizontalClass = 'right-0';
    }

    return `${verticalClass} ${horizontalClass}`;
  };

  const getArrowClasses = () => {
    if (side === 'top') {
      return 'top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-900';
    }
    return 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-navy-900';
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className="text-slate-400 hover:text-slate-600 focus:outline-none ml-1 transition-colors rounded-full focus:ring-1 focus:ring-forecast"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="More information"
      >
        {children || <HelpCircle className="w-3.5 h-3.5" />}
      </button>

      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 ${getPositionClasses()} w-64 max-w-[calc(100vw-32px)] p-2.5 bg-navy-900 text-slate-100 text-xs leading-relaxed rounded-md shadow-xl border border-slate-700 pointer-events-none transition-all duration-150`}
        >
          {content}
          <div className={`absolute ${getArrowClasses()}`} />
        </div>
      )}
    </div>
  );
};
