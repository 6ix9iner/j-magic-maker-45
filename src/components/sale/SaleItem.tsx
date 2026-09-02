
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
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{product.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{product.barcode}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          ₦{product.price.toFixed(2)} each
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => onUpdateQuantity(index, quantity - 1)}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-7 text-center font-semibold text-sm tabular-nums">{quantity}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => onUpdateQuantity(index, quantity + 1)}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-20 shrink-0 text-right">
        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
          ₦{(product.price * quantity).toFixed(2)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemoveItem(index)}
        className="h-9 w-9 shrink-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SaleItem;
