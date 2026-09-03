
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { pickFitClass, MONEY_FIT_STEPS_XL } from "@/utils/fitText";

interface SaleSummaryProps {
  total: number;
  itemCount: number;
  isProcessing: boolean;
  onCompleteSale: () => void;
  onCancelSale: () => void;
}

const SaleSummary = ({
  total,
  itemCount,
  isProcessing,
  onCompleteSale,
  onCancelSale
}: SaleSummaryProps) => {
  const totalText = `₦${total.toFixed(2)}`;
  return (
    <div className="-mx-5 -mb-5 mt-2 rounded-b-3xl border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex flex-col gap-2">
      <div className="w-full flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total {itemCount > 0 && `(${itemCount} item${itemCount !== 1 ? 's' : ''})`}
        </span>
        {/* Never truncate the total - if it's still too wide even at the
            smallest step, wrap rather than hide digits. */}
        <span className={`min-w-0 break-words text-right font-extrabold text-slate-800 dark:text-slate-100 tabular-nums ${pickFitClass(totalText, MONEY_FIT_STEPS_XL)}`}>
          {totalText}
        </span>
      </div>
      <div className="w-full flex gap-2">
        <Button
          variant="outline"
          className="h-10 rounded-xl border-slate-200 text-slate-600 font-semibold"
          onClick={onCancelSale}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-sm active:scale-[0.98] transition-all"
          onClick={onCompleteSale}
          disabled={total === 0 || isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </span>
          ) : (
            "Complete Sale"
          )}
        </Button>
      </div>
    </div>
  );
};

export default SaleSummary;
