
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Barcode } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import MobilePopover from '@/components/ui/mobile-popover';

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
            className="col-span-3 rounded-xl border-white/20 bg-white/5 text-white"
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
              className="flex-1 rounded-xl border-white/20 bg-white/5 text-white"
            />
            <Button 
              variant="outline" 
              size="icon" 
              type="button"
              className="rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white"
              onClick={() => setIsScannerOpen(true)}
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
            className="col-span-3 rounded-xl border-white/20 bg-white/5 text-white"
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
            className="col-span-3 rounded-xl border-white/20 bg-white/5 text-white"
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
            className="col-span-3 rounded-xl border-white/20 bg-white/5 text-white"
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
            className="col-span-3 rounded-xl border-white/20 bg-white/5 text-white"
          />
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="rounded-xl border-white/20 bg-white/5 hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button 
          onClick={onSave}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>

      {/* Integrated Barcode Scanner using MobilePopover for mobile */}
      {isMobile ? (
        <MobilePopover
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          title="Scan Product Barcode"
        >
          <div className="p-2">
            {isScannerOpen && (
              <div className="relative rounded-xl overflow-hidden">
                <BarcodeScanner onDetected={handleBarcodeDetected} />
                <div className="scan-line"></div>
                <div className="scan-corner scan-corner-tl"></div>
                <div className="scan-corner scan-corner-tr"></div>
                <div className="scan-corner scan-corner-bl"></div>
                <div className="scan-corner scan-corner-br"></div>
              </div>
            )}
            <p className="text-sm text-center mt-3 text-white/70">
              Position barcode within view for automatic scanning
            </p>
          </div>
        </MobilePopover>
      ) : (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 ${isScannerOpen ? 'block' : 'hidden'}`}>
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl w-[90%] max-w-md overflow-hidden shadow-2xl border border-white/10">
            <div className="p-4 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Scan Product Barcode
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsScannerOpen(false)}
                  className="text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
            <div className="p-4">
              {isScannerOpen && (
                <div className="relative rounded-xl overflow-hidden">
                  <BarcodeScanner onDetected={handleBarcodeDetected} />
                  <div className="scan-line"></div>
                  <div className="scan-corner scan-corner-tl"></div>
                  <div className="scan-corner scan-corner-tr"></div>
                  <div className="scan-corner scan-corner-bl"></div>
                  <div className="scan-corner scan-corner-br"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductForm;
