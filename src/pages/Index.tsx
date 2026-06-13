
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import BarcodeScanner from '@/components/BarcodeScanner';
import BarcodeResult from '@/components/BarcodeResult';
import ProductLookup from '@/components/ProductLookup';
import SaleManager from '@/components/SaleManager';
import { toast } from 'sonner';

const Index = () => {
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const [saleManagerRef, setSaleManagerRef] = useState<React.RefObject<any> | null>(null);

  // Create ref for SaleManager
  React.useEffect(() => {
    setSaleManagerRef(React.createRef());
  }, []);

  // Use useCallback for stable reference to avoid recreation on re-renders
  const handleBarcodeDetected = useCallback((code: string) => {
    // Ensure we have a valid barcode result
    if (!code || code.trim() === '') {
      toast.error("Invalid barcode detected");
      return;
    }

    // Set the barcode value and show success toast
    setBarcodeValue(code);
    toast.success("Barcode detected: " + code);
  }, []);

  const clearResult = useCallback(() => {
    setBarcodeValue(null);
  }, []);

  return (
    <div className="flex flex-col min-h-full pb-16 px-2 sm:px-4 max-w-5xl mx-auto">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 mt-4 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
        Scan & Lookup
      </h2>
      <div className="space-y-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {barcodeValue ? (
            <div className="space-y-4">
              <BarcodeResult barcodeValue={barcodeValue} onClear={clearResult} />
              <ProductLookup 
                barcodeValue={barcodeValue} 
                onAddToSale={(product, quantity) => {
                  if (saleManagerRef?.current?.addItem) {
                    saleManagerRef.current.addItem(product, quantity);
                    toast.success(`Added ${quantity} ${product.name} to sale`);
                  }
                }} 
              />
            </div>
          ) : (
            <motion.div 
              className="premium-card overflow-hidden relative border border-slate-100/80 rounded-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
                <h2 className="font-semibold text-base sm:text-lg">Scan Barcode</h2>
                <p className="text-xs text-slate-300 mt-1">Position a barcode within the frame</p>
              </div>
              <div className="relative p-4">
                <BarcodeScanner onDetected={handleBarcodeDetected} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
        Current Sale
      </h2>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="premium-card p-5 mb-8 rounded-3xl border border-slate-100"
      >
        <SaleManager ref={saleManagerRef} />
      </motion.div>
    </div>
  );
};

export default Index;
