
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Barcode } from "lucide-react";

interface Product {
  id?: string;
  name: string;
  barcode: string;
  price: number;
  purchase_price: number;
  stock_count: number;
  category?: string | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface ProductFormProps {
  product: Partial<Product>;
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const ProductForm = ({
  product,
  isEditing,
  onInputChange,
  onSave,
  onCancel,
}: ProductFormProps) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="name" className="text-right font-medium">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={product.name || ''}
            onChange={onInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="barcode" className="text-right font-medium">
            Barcode
          </label>
          <div className="col-span-3 flex gap-2">
            <Input
              id="barcode"
              name="barcode"
              value={product.barcode || ''}
              onChange={onInputChange}
              className="flex-1"
            />
            <Button variant="outline" size="icon">
              <Barcode className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="price" className="text-right font-medium">
            Price
          </label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={product.price || 0}
            onChange={onInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="purchase_price" className="text-right font-medium">
            Cost
          </label>
          <Input
            id="purchase_price"
            name="purchase_price"
            type="number"
            step="0.01"
            min="0"
            value={product.purchase_price || 0}
            onChange={onInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="stock_count" className="text-right font-medium">
            Stock
          </label>
          <Input
            id="stock_count"
            name="stock_count"
            type="number"
            min="0"
            value={product.stock_count || 0}
            onChange={onInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="category" className="text-right font-medium">
            Category
          </label>
          <Input
            id="category"
            name="category"
            value={product.category || ''}
            onChange={onInputChange}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </>
  );
};

export default ProductForm;
