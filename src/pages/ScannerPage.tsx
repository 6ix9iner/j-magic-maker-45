
import React, { useState, useEffect, useRef } from 'react';
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
  const [isInitializing, setIsInitializing] = useState(false);
  const isMobile = useIsMobile();
  const dialogOpenRef = useRef(false);

  // Initialize barcode reader
  useEffect(() => {
    let isInitStarted = false;
    
    const initBarcodeReader = async () => {
      if (isInitStarted) return;
      isInitStarted = true;
      
      setIsInitializing(true);
      try {
        // Set license key
        BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
        // Set engine resource path
        BarcodeReader.engineResourcePath = 'https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/';
        console.log("Barcode scanner initialized in ScannerPage");
        setIsScannerReady(true);
      } catch (e) {
        console.error("Failed to initialize barcode scanner:", e);
        toast.error("Failed to initialize scanner. Please try again.");
      } finally {
        setIsInitializing(false);
      }
    };
    
    initBarcodeReader();
    
    return () => {
      isInitStarted = false;
    };
  }, []);

  // Track dialog open state
  useEffect(() => {
    dialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen]);

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
              disabled={isInitializing}
            >
              <ScanBarcode className="w-5 h-5 mr-2" />
              {isInitializing ? "Initializing Scanner..." : "Scan Barcode"}
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
  const videoContainerCreated = React.useRef<boolean>(false);
  const scannerInstanceRef = React.useRef<BarcodeScanner | null>(null);
  const isDestroyingRef = React.useRef<boolean>(false);
  
  React.useEffect(() => {
    let isMounted = true;
    
    // Reset the destroying flag when mounting
    isDestroyingRef.current = false;
    
    const setupScanner = async () => {
      try {
        console.log("Setting up SimpleBarcodeScanner");
        
        // Create video container element required by Dynamsoft scanner
        if (containerRef.current && !videoContainerCreated.current) {
          const videoContainer = document.createElement('div');
          videoContainer.className = 'dce-video-container';
          videoContainer.id = 'dce-video-container-simple';
          videoContainer.style.position = 'absolute';
          videoContainer.style.left = '0';
          videoContainer.style.top = '0';
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          containerRef.current.appendChild(videoContainer);
          videoContainerCreated.current = true;
          console.log("Simple scanner video container created");
        }
        
        // Create scanner instance
        const scannerInstance = await BarcodeScanner.createInstance();
        console.log("Simple scanner instance created");
        scannerInstanceRef.current = scannerInstance;
        
        // Update settings for better performance
        const settings = await scannerInstance.getRuntimeSettings();
        settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
        settings.deblurLevel = 2;
        await scannerInstance.updateRuntimeSettings(settings);
        
        if (isMounted && !isDestroyingRef.current) {
          setScanner(scannerInstance);
          
          // Set up callback for barcode detection
          scannerInstance.onUnduplicatedRead = (txt, result) => {
            console.log("Simple scanner barcode detected:", txt, result);
            onDetected(txt, result.barcodeFormatString);
          };
          
          // Start scanning if container is ready
          if (containerRef.current) {
            try {
              await scannerInstance.setUIElement(containerRef.current);
              await scannerInstance.show();
              console.log("Simple scanner started");
            } catch (err) {
              console.error("Failed to start simple scanner:", err);
              if (isMounted && !isDestroyingRef.current) {
                setError("Camera access required");
              }
            }
          }
        } else {
          console.log("Component unmounted during setup, cleaning up scanner");
          try {
            await scannerInstance.destroyContext();
          } catch (e) {
            console.error("Error destroying scanner during setup cleanup:", e);
          }
        }
      } catch (err) {
        console.error("Simple scanner setup error:", err);
        if (isMounted && !isDestroyingRef.current) {
          setError("Please allow camera access");
        }
      }
    };
    
    setupScanner();
    
    // Cleanup function with proper Promise handling
    return () => {
      console.log("SimpleBarcodeScanner unmounting");
      isMounted = false;
      isDestroyingRef.current = true;
      videoContainerCreated.current = false;
      
      // Clean up the video container
      if (containerRef.current) {
        const videoContainer = document.getElementById('dce-video-container-simple');
        if (videoContainer && videoContainer.parentNode === containerRef.current) {
          containerRef.current.removeChild(videoContainer);
          console.log("Simple scanner video container removed");
        }
      }
      
      const scannerInstance = scannerInstanceRef.current;
      if (scannerInstance) {
        // Use an IIFE async function for cleanup
        (async () => {
          try {
            console.log("Cleaning up simple scanner");
            try {
              await scannerInstance.hide();
              console.log("Simple scanner hidden");
            } catch (e) {
              console.error("Error hiding simple scanner:", e);
            }
            
            try {
              await scannerInstance.destroyContext();
              console.log("Simple scanner destroyed");
            } catch (e) {
              console.error("Error destroying simple scanner:", e);
            }
          } catch (e) {
            console.error("Error in simple scanner cleanup:", e);
          }
        })();
      }
    };
  }, [onDetected]);
  
  return (
    <div className="flex flex-col items-center p-4">
      {error ? (
        <div className="text-center py-8">
          <div className="bg-amber-100 p-3 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Camera className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-amber-500 font-medium">Camera access required</p>
          <p className="text-sm text-gray-500 mt-2">
            Please allow camera access to scan barcodes
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
