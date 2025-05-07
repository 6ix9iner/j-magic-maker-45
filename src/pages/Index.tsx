
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="flex flex-col min-h-full pb-16 px-4 max-w-5xl mx-auto">
      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid grid-cols-2 w-full rounded-xl glassmorphism sticky top-4 z-10 my-4 overflow-hidden shadow-md">
          <TabsTrigger value="scan" className="py-3 text-sm font-medium">Scan & Lookup</TabsTrigger>
          <TabsTrigger value="sale" className="py-3 text-sm font-medium">Current Sale</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scan" className="p-1 mb-16">
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
                className="premium-card overflow-hidden relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <h2 className="font-medium text-lg">Scan Barcode</h2>
                  <p className="text-sm opacity-90">Position a barcode within the frame</p>
                </div>
                <div className="relative p-4">
                  <BarcodeScanner onDetected={handleBarcodeDetected} />
                </div>
              </motion.div>
            )}
          </motion.div>
        </TabsContent>
        
        <TabsContent value="sale" className="p-1 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="premium-card p-4"
          >
            <SaleManager ref={saleManagerRef} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
