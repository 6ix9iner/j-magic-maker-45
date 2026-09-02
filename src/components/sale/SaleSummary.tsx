
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  return (
    <div className="-mx-5 -mb-5 mt-2 rounded-b-3xl border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex flex-col gap-2">
      <div className="w-full flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total {itemCount > 0 && `(${itemCount} item${itemCount !== 1 ? 's' : ''})`}
        </span>
        <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">₦{total.toFixed(2)}</span>
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
