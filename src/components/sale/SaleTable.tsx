
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import SaleItem from './SaleItem';

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
  user_id?: string;
}

interface SaleItem {
  product: Product;
  quantity: number;
}

interface SaleTableProps {
  items: SaleItem[];
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onRemoveItem: (index: number) => void;
}

const SaleTable = ({ items, onUpdateQuantity, onRemoveItem }: SaleTableProps) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 h-full text-center text-slate-400 dark:text-slate-500">
        <ShoppingCart className="h-9 w-9 opacity-40" />
        <p className="text-sm font-medium">No items in current sale</p>
        <p className="text-xs">Scan a product to add it here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item, index) => (
        <SaleItem
          key={item.product.id}
          product={item.product}
          quantity={item.quantity}
          index={index}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
        />
      ))}
    </div>
  );
};

export default SaleTable;
