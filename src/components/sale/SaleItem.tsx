
import React from 'react';
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
  user_id?: string;
}

interface SaleItemProps {
  product: Product;
  quantity: number;
  index: number;
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onRemoveItem: (index: number) => void;
}

const SaleItem = ({
  product,
  quantity,
  index,
  onUpdateQuantity,
  onRemoveItem
}: SaleItemProps) => {
  return (
    <div className="py-3">
      {/* Row 1: name + price on the left, remove button on the right - its
          own row so it never has to compete for width with the qty
          controls below. */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{product.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            ₦{product.price.toFixed(2)} each
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveItem(index)}
          className="h-8 w-8 shrink-0 -mt-1 -mr-1 text-slate-400 hover:text-destructive hover:bg-destructive/10"
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 2: qty stepper on the left, line subtotal on the right - its
          own row, plenty of room for both. */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => onUpdateQuantity(index, quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-6 text-center font-semibold text-sm tabular-nums">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => onUpdateQuantity(index, quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
          ₦{(product.price * quantity).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default SaleItem;
