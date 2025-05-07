
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ScanBarcode, Camera } from 'lucide-react';
import ScannedItemsList, { ScannedItem } from '@/components/ScannedItemsList';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { DYNAMSOFT_LICENSE_KEY } from '@/components/barcode/BarcodeConfigUtils';

const ScannerPage = () => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const isMobile = useIsMobile();

  // Initialize barcode reader
  React.useEffect(() => {
    (async () => {
      try {
        // Set license key
        BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
        // Set engine resource path
        BarcodeReader.engineResourcePath = 'https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/';
        console.log("Barcode scanner initialized");
        setIsScannerReady(true);
      } catch (e) {
        console.error("Failed to initialize barcode scanner:", e);
        toast.error("Failed to initialize scanner. Please try again.");
      }
    })();
  }, []);

  const openScanner = () => {
    setIsDialogOpen(true);
  };

  const closeScanner = () => {
    setIsDialogOpen(false);
  };

  const handleScan = (code: string, symbology: string = "Unknown") => {
    const newItem: ScannedItem = {
      id: uuidv4(),
      code,
      symbology,
      timestamp: new Date(),
    };
    
    setScannedItems((prevItems) => [newItem, ...prevItems]);
    toast.success(`Barcode Scanned: ${code} (${symbology})`);
    closeScanner();
  };

  const clearScannedItems = () => {
    setScannedItems([]);
    toast.info("Scan history cleared");
  };

  const deleteScannedItem = (id: string) => {
    setScannedItems((prevItems) => prevItems.filter(item => item.id !== id));
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
          <CardContent className="flex justify-center">
            <Button 
              onClick={openScanner}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={!isScannerReady}
            >
              <ScanBarcode className="w-5 h-5 mr-2" />
              {isScannerReady ? "Scan Barcode" : "Initializing Scanner..."}
            </Button>
          </CardContent>
        </Card>
        
        <ScannedItemsList 
          items={scannedItems}
          onClear={clearScannedItems}
          onDelete={deleteScannedItem}
        />

        {isMobile ? (
          <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <SheetContent side="bottom" className="h-[85vh] p-0">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Scan Barcode</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Position barcode within view for automatic scanning
                </p>
              </div>

              {isDialogOpen && (
                <SimpleBarcodeScanner onDetected={handleScan} onClose={closeScanner} />
              )}
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Scan Barcode</DialogTitle>
              </DialogHeader>
              
              {isDialogOpen && (
                <SimpleBarcodeScanner onDetected={handleScan} onClose={closeScanner} />
              )}
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

interface SimpleBarcodeScannerProps {
  onDetected: (code: string, symbology: string) => void;
  onClose: () => void;
}

const SimpleBarcodeScanner: React.FC<SimpleBarcodeScannerProps> = ({ onDetected, onClose }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scanner, setScanner] = React.useState<BarcodeScanner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    let isMounted = true;
    
    const setupScanner = async () => {
      try {
        // Create scanner instance
        const newScanner = await BarcodeScanner.createInstance();
        
        // Update settings for better performance
        const settings = await newScanner.getRuntimeSettings();
        settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
        settings.deblurLevel = 2;
        await newScanner.updateRuntimeSettings(settings);
        
        if (isMounted) {
          setScanner(newScanner);
          
          // Set up callback for barcode detection
          newScanner.onUnduplicatedRead = (txt, result) => {
            console.log("Barcode detected:", txt, result);
            onDetected(txt, result.barcodeFormatString);
          };
          
          // Start scanning if container is ready
          if (containerRef.current) {
            try {
              await newScanner.setUIElement(containerRef.current);
              await newScanner.show();
            } catch (err) {
              console.error("Failed to start scanner:", err);
              setError("Failed to start camera. Please check camera permissions.");
            }
          }
        }
      } catch (err) {
        console.error("Scanner setup error:", err);
        if (isMounted) {
          setError("Failed to initialize scanner. Please try again.");
        }
      }
    };
    
    setupScanner();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (scanner) {
        scanner.hide().catch(console.error);
        scanner.destroyContext().catch(console.error);
      }
    };
  }, [onDetected]);
  
  return (
    <div className="flex flex-col items-center p-4">
      {error ? (
        <div className="text-center py-8">
          <div className="bg-red-100 p-3 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Camera className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-500 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Please check that your camera is working and permissions are granted.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div 
            ref={containerRef} 
            className="relative w-full aspect-[4/3] bg-black rounded-md overflow-hidden"
            style={{ minHeight: '300px' }}
          >
            <div className="absolute inset-0 w-full h-full" id="dce-video-container"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-1.5 bg-blue-600 opacity-80 animate-bounce"></div>
              <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-90">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>
          </div>
          <p className="text-sm text-center my-4 text-gray-600">
            Position barcode within the frame for automatic scanning
          </p>
          <Button variant="outline" onClick={onClose} className="mt-2">
            Cancel
          </Button>
        </>
      )}
    </div>
  );
};

export default ScannerPage;
