
// This component now serves as a compatibility layer for existing imports
// It simply re-exports the scanner functionality from ScannerPage
import React, { useState } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { DYNAMSOFT_LICENSE_KEY } from '@/components/barcode/BarcodeConfigUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import BarcodeReaderComponent from '@/components/barcode/BarcodeScanner';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onScan?: (code: string, symbology: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onScan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const isMobile = useIsMobile();

  // Initialize barcode reader
  React.useEffect(() => {
    (async () => {
      try {
        // Set license key
        BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
        // Set engine resource path
        BarcodeReader.engineResourcePath = 'https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/';
        setIsScannerReady(true);
      } catch (e) {
        console.error("Failed to initialize barcode scanner:", e);
      }
    })();
  }, []);

  const handleScan = (code: string, symbology: string = "Unknown") => {
    // Call both callback types for backward compatibility
    onDetected(code);
    if (onScan) {
      onScan(code, symbology);
    }
    setIsOpen(false);
  };

  const SimpleBarcodeScanner = ({ onClose }: { onClose: () => void }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scanner, setScanner] = React.useState<DynamsoftScanner | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const videoContainerCreated = React.useRef<boolean>(false);
    
    React.useEffect(() => {
      let isMounted = true;
      let scannerInstance: DynamsoftScanner | null = null;
      
      // Create the video container element required by Dynamsoft
      const createVideoContainer = () => {
        if (!containerRef.current || videoContainerCreated.current) return;
        
        const videoContainer = document.createElement('div');
        videoContainer.className = 'dce-video-container';
        videoContainer.id = 'dce-video-container';
        videoContainer.style.position = 'absolute';
        videoContainer.style.left = '0';
        videoContainer.style.top = '0';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        containerRef.current.appendChild(videoContainer);
        videoContainerCreated.current = true;
      };
      
      const setupScanner = async () => {
        try {
          // Create the video container first
          createVideoContainer();
          
          // Create scanner instance
          scannerInstance = await DynamsoftScanner.createInstance();
          
          // Update settings for better performance
          const settings = await scannerInstance.getRuntimeSettings();
          settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
          settings.deblurLevel = 2;
          await scannerInstance.updateRuntimeSettings(settings);
          
          if (isMounted) {
            setScanner(scannerInstance);
            
            // Set up callback for barcode detection
            scannerInstance.onUnduplicatedRead = (txt, result) => {
              console.log("Barcode detected:", txt, result);
              handleScan(txt, result.barcodeFormatString);
            };
            
            // Start scanning if container is ready
            if (containerRef.current) {
              try {
                await scannerInstance.setUIElement(containerRef.current);
                await scannerInstance.show();
              } catch (err) {
                console.error("Failed to start scanner:", err);
                setError("Camera access required");
              }
            }
          }
        } catch (err) {
          console.error("Scanner setup error:", err);
          if (isMounted) {
            setError("Please allow camera access to scan");
          }
        }
      };
      
      setupScanner();
      
      // Cleanup function
      return () => {
        isMounted = false;
        videoContainerCreated.current = false;
        
        // Remove the video container
        if (containerRef.current) {
          const videoContainer = document.getElementById('dce-video-container');
          if (videoContainer && videoContainer.parentNode === containerRef.current) {
            containerRef.current.removeChild(videoContainer);
          }
        }
        
        if (scannerInstance) {
          (async () => {
            try {
              await scannerInstance.hide();
              await scannerInstance.destroyContext();
              console.log("Scanner destroyed");
            } catch (e) {
              console.error("Error in cleanup:", e);
            }
          })();
        }
      };
    }, []);
    
    return (
      <div className="flex flex-col items-center p-4">
        {error ? (
          <div className="text-center py-8">
            <p className="text-amber-500 font-medium">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              This application requires camera access to scan barcodes
            </p>
            <Button onClick={onClose} variant="outline" className="mt-4">
              Close
            </Button>
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

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        disabled={!isScannerReady}
      >
        <ScanBarcode className="w-5 h-5 mr-2" />
        {isScannerReady ? "Scan Barcode" : "Initializing Scanner..."}
      </Button>

      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Scan Barcode</h2>
              <p className="text-sm text-gray-500 mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>
            
            {isOpen && <SimpleBarcodeScanner onClose={() => setIsOpen(false)} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
            </DialogHeader>
            
            {isOpen && <SimpleBarcodeScanner onClose={() => setIsOpen(false)} />}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BarcodeScanner;
