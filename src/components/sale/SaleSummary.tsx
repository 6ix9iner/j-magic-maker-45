
import React from 'react';
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SaleSummaryProps {
  total: number;
  isProcessing: boolean;
  onCompleteSale: () => void;
  onCancelSale: () => void;
}

const SaleSummary = ({ 
  total, 
  isProcessing, 
  onCompleteSale, 
  onCancelSale 
}: SaleSummaryProps) => {
  return (
    <CardFooter className="flex flex-col space-y-4">
      <div className="w-full flex justify-between text-lg font-bold">
        <span>Total:</span>
        <span>${total.toFixed(2)}</span>
      </div>
      <div className="w-full flex space-x-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onCancelSale}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1"
          onClick={onCompleteSale}
          disabled={total === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Complete Sale"}
        </Button>
      </div>
    </CardFooter>
  );
};

export default SaleSummary;
