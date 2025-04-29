
import React, { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import BarcodeResult from '@/components/BarcodeResult';

const Index = () => {
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);

  const handleBarcodeDetected = (result: string) => {
    setBarcodeValue(result);
  };

  const clearResult = () => {
    setBarcodeValue(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Barcode Scanner</h1>
          <p className="mt-2 text-gray-600">
            Quickly scan product barcodes using your camera
          </p>
        </header>

        <div className="space-y-6">
          {barcodeValue ? (
            <BarcodeResult barcodeValue={barcodeValue} onClear={clearResult} />
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6 text-center">
                <p className="text-gray-600">
                  Position the barcode within the camera view for automatic scanning
                </p>
              </div>
              <BarcodeScanner onDetected={handleBarcodeDetected} />
            </div>
          )}
          
          <div className="text-center text-sm text-gray-500">
            <p>Supports EAN, UPC, CODE-128 and other common barcode formats</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
