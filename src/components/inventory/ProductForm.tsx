
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Barcode } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet"; 
import { useIsMobile } from '@/hooks/use-mobile';
import BarcodeScanner from "@/components/barcode/BarcodeScanner";

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
            <Button 
              variant="outline" 
              size="icon" 
              type="button"
              onClick={() => setIsScannerOpen(true)}
            >
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

      {/* Integrated Barcode Scanner - uses main scanner component directly */}
      {isMobile ? (
        <Sheet open={isScannerOpen} onOpenChange={setIsScannerOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Scan Product Barcode
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>
            <div className="p-2">
              {isScannerOpen && (
                <BarcodeScanner onDetected={handleBarcodeDetected} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isScannerOpen ? 'block' : 'hidden'}`}>
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl w-[90%] max-w-md overflow-hidden">
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
                <BarcodeScanner onDetected={handleBarcodeDetected} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductForm;
