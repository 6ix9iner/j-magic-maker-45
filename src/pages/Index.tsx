import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import BarcodeScannerCompat from '@/components/BarcodeScanner';
import BarcodeScannerInline from '@/components/barcode/BarcodeScanner';
import BarcodeResult from '@/components/BarcodeResult';
import ProductLookup from '@/components/ProductLookup';
import SaleManager from '@/components/SaleManager';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const Index = () => {
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const [saleManagerRef, setSaleManagerRef] = useState<React.RefObject<any> | null>(null);
  const isMobile = useIsMobile();

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
    <div className="w-full h-full flex flex-col overflow-hidden min-h-0 pt-2 pb-4 px-1 max-w-7xl mx-auto">
      {/* 2-column layout on Desktop, stacked on Mobile */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
        
        {/* Left Column - Scanner and Product Info */}
        <div className="lg:col-span-5 flex flex-col overflow-hidden min-h-0 h-full">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 mt-2 flex items-center gap-2 flex-shrink-0">
            <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
            Scan & Lookup
          </h2>
          
          <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
            {barcodeValue ? (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
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
              <div className="flex-grow flex flex-col min-h-0 relative rounded-3xl overflow-hidden bg-slate-950/90 dark:bg-slate-950 border border-slate-250/30 dark:border-slate-800 flex-1">
                {isMobile ? (
                  <div className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <p className="text-sm text-slate-400 font-medium">Scan barcodes with your camera</p>
                    <div className="w-full max-w-xs">
                      <BarcodeScannerCompat onDetected={handleBarcodeDetected} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex-grow min-h-0 flex flex-col relative">
                    <BarcodeScannerInline onDetected={handleBarcodeDetected} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Current Sale */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden min-h-0 h-full">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 mt-2 flex items-center gap-2 flex-shrink-0">
            <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
            Current Sale
          </h2>
          
          <div className="flex-grow overflow-y-auto min-h-0 pb-24 pr-1">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="premium-card p-5 rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 shadow-sm"
            >
              <SaleManager ref={saleManagerRef} />
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Index;
