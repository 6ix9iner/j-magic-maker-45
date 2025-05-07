
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import ScannedItemsList, { ScannedItem } from '@/components/ScannedItemsList';
import { useIsMobile } from '@/hooks/use-mobile';

const ScannerPage = () => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isScannerActive, setScannerActive] = useState(true);
  const isMobile = useIsMobile();

  const handleScan = (code: string, symbology: string) => {
    const newItem: ScannedItem = {
      id: uuidv4(),
      code,
      symbology,
      timestamp: new Date(),
    };
    
    setScannedItems((prevItems) => [newItem, ...prevItems]);
    
    toast.success(`Barcode Scanned: ${code} (${symbology})`);
  };

  const clearScannedItems = () => {
    setScannedItems([]);
    toast.info("Scan history cleared");
  };

  const deleteScannedItem = (id: string) => {
    setScannedItems((prevItems) => prevItems.filter(item => item.id !== id));
  };

  const toggleScanner = () => {
    setScannerActive(!isScannerActive);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 border-b bg-card">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Barcode Scanner</h1>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dynamsoft Barcode Scanner</CardTitle>
            <CardDescription>
              Scan barcodes in harsh conditions with high accuracy and speed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isScannerActive ? (
              <BarcodeScanner onScan={handleScan} />
            ) : (
              <div className="flex justify-center p-12">
                <Button onClick={toggleScanner}>
                  Activate Scanner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <ScannedItemsList 
          items={scannedItems}
          onClear={clearScannedItems}
          onDelete={deleteScannedItem}
        />
      </main>
    </div>
  );
};

export default ScannerPage;
