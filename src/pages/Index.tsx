
import React, { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import BarcodeResult from '@/components/BarcodeResult';
import ProductLookup from '@/components/ProductLookup';
import SaleManager from '@/components/SaleManager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const Index = () => {
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const [saleManagerRef, setSaleManagerRef] = useState<React.RefObject<any> | null>(null);

  // Create ref for SaleManager
  React.useEffect(() => {
    setSaleManagerRef(React.createRef());
  }, []);

  const handleBarcodeDetected = (result: string) => {
    setBarcodeValue(result);
    toast.success("Barcode detected: " + result);
  };

  const clearResult = () => {
    setBarcodeValue(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 sm:mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory & Sales System</h1>
          <p className="mt-2 text-gray-600">
            Scan products to look up information and add to sales
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Scanner and Product Info */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Barcode Scanner</h2>
              {barcodeValue ? (
                <div className="space-y-4">
                  <BarcodeResult barcodeValue={barcodeValue} onClear={clearResult} />
                  <ProductLookup 
                    barcodeValue={barcodeValue} 
                    onAddToSale={(product, quantity) => {
                      if (saleManagerRef?.current?.addItem) {
                        saleManagerRef.current.addItem(product, quantity);
                      }
                    }} 
                  />
                </div>
              ) : (
                <div>
                  <div className="mb-6 text-center">
                    <p className="text-gray-600">
                      Position the barcode within the camera view for automatic scanning
                    </p>
                  </div>
                  <BarcodeScanner onDetected={handleBarcodeDetected} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sale Manager */}
          <div className="space-y-6">
            <SaleManager ref={saleManagerRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
