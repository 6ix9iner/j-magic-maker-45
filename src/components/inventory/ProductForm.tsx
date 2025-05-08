import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Barcode } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
// Import the barcode dialog component that uses the functional scanner implementation
import BarcodeDialog from "@/components/inventory/BarcodeDialog";

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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleBarcodeDetected = (result: string) => {
    // Create a synthetic change event to update the barcode field
    const syntheticEvent = {
      target: {
        name: "barcode",
        value: result
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onInputChange(syntheticEvent);
    
    // Keep the scanner open for additional scans
    // User can manually close when done
    // setIsScannerOpen(false);
  };

  const handleOpenScanner = () => {
    setIsScannerOpen(true);
  };
  
  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  return (
    <>
      <DialogHeader className="mb-2">
        <DialogTitle className="text-xl">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-5 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="name" className="text-right font-medium text-sm">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={product.name || ''}
            onChange={onInputChange}
            className="col-span-3 rounded-xl border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="Product name"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="barcode" className="text-right font-medium text-sm">
            Barcode
          </label>
          <div className="col-span-3 flex gap-2">
            <Input
              id="barcode"
              name="barcode"
              value={product.barcode || ''}
              onChange={onInputChange}
              className="flex-1 rounded-xl border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              placeholder="Scan or enter barcode"
            />
            <Button 
              variant="outline" 
              size="icon" 
              type="button"
              className="rounded-xl border-slate-300 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              onClick={handleOpenScanner}
            >
              <Barcode className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="price" className="text-right font-medium text-sm">
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
            className="col-span-3 rounded-xl border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="0.00"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="purchase_price" className="text-right font-medium text-sm">
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
            className="col-span-3 rounded-xl border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="0.00"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="stock_count" className="text-right font-medium text-sm">
            Stock
          </label>
          <Input
            id="stock_count"
            name="stock_count"
            type="number"
            min="0"
            value={product.stock_count || 0}
            onChange={onInputChange}
            className="col-span-3 rounded-xl border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="0"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="category" className="text-right font-medium text-sm">
            Category
          </label>
          <Input
            id="category"
            name="category"
            value={product.category || ''}
            onChange={onInputChange}
            className="col-span-3 rounded-xl border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="Product category"
          />
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="rounded-xl border-slate-300 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        >
          Cancel
        </Button>
        <Button 
          onClick={onSave}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>

      {/* Modified BarcodeDialog implementation */}
      <BarcodeDialog
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onDetected={handleBarcodeDetected}
      />
    </>
  );
};

export default ProductForm;
