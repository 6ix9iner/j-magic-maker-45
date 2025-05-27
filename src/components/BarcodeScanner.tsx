// This component now serves as a compatibility layer for existing imports
// It simply re-exports the scanner functionality from ScannerPage
import React, { useState, useEffect } from 'react';
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onScan,
  open,
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showInitMessage, setShowInitMessage] = useState(false);
  const isMobile = useIsMobile();
  // Track dialog open state for proper scanner initialization
  const dialogOpenRef = React.useRef(false);

  // Handle controlled mode when open/onOpenChange are provided
  useEffect(() => {
    if (open !== undefined && onOpenChange) {
      setIsOpen(open);
    }
  }, [open, onOpenChange]);

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
        console.log("Barcode reader initialized");
        setIsScannerReady(true);
      } catch (e) {
        console.error("Failed to initialize barcode scanner:", e);
      } finally {
        setIsInitializing(false);
      }
    };
    initBarcodeReader();
    return () => {
      isInitStarted = false;
    };
  }, []);
  const handleDialogOpen = () => {
    setShowInitMessage(true);
    setIsOpen(true);
    dialogOpenRef.current = true;
    if (onOpenChange) {
      onOpenChange(true);
    }

    // Hide the initialization message after a short delay
    setTimeout(() => {
      setShowInitMessage(false);
    }, 2000);
  };
  const handleDialogClose = () => {
    setIsOpen(false);
    dialogOpenRef.current = false;
    if (onOpenChange) {
      onOpenChange(false);
    }
  };
  const handleScan = (code: string, symbology: string = "Unknown") => {
    // Call both callback types for backward compatibility
    onDetected(code);
    if (onScan) {
      onScan(code, symbology);
    }
    handleDialogClose();
  };
  const SimpleBarcodeScanner = ({
    onClose
  }: {
    onClose: () => void;
  }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scanner, setScanner] = React.useState<DynamsoftScanner | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const videoContainerCreated = React.useRef<boolean>(false);
    React.useEffect(() => {
      if (!dialogOpenRef.current) return;
      let isMounted = true;
      let scannerInstance: DynamsoftScanner | null = null;
      console.log("SimpleBarcodeScanner component mounted, dialog open:", dialogOpenRef.current);

      // Create the video container element required by Dynamsoft
      const createVideoContainer = () => {
        if (!containerRef.current || videoContainerCreated.current) return;
        const videoContainer = document.createElement('div');
        videoContainer.className = 'dce-video-container';
        videoContainer.id = 'dce-video-container-dialog';
        videoContainer.style.position = 'absolute';
        videoContainer.style.left = '0';
        videoContainer.style.top = '0';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        containerRef.current.appendChild(videoContainer);
        videoContainerCreated.current = true;
        console.log("Dialog video container created");
      };
      const setupScanner = async () => {
        try {
          console.log("Setting up dialog scanner");
          // Create the video container first
          createVideoContainer();

          // Create scanner instance
          scannerInstance = await DynamsoftScanner.createInstance();
          console.log("Dialog scanner instance created");

          // Update settings for better performance
          const settings = await scannerInstance.getRuntimeSettings();
          settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
          settings.deblurLevel = 2;
          await scannerInstance.updateRuntimeSettings(settings);
          if (isMounted && dialogOpenRef.current) {
            setScanner(scannerInstance);

            // Set up callback for barcode detection
            scannerInstance.onUnduplicatedRead = (txt, result) => {
              console.log("Dialog barcode detected:", txt, result);
              handleScan(txt, result.barcodeFormatString);
            };

            // Start scanning if container is ready
            if (containerRef.current) {
              try {
                await scannerInstance.setUIElement(containerRef.current);
                await scannerInstance.show();
                console.log("Dialog scanner started");
              } catch (err) {
                console.error("Failed to start dialog scanner:", err);
                setError("Camera access required");
              }
            }
          } else {
            console.log("Component unmounted during scanner setup, cleaning up");
            if (scannerInstance) {
              try {
                await scannerInstance.destroyContext();
              } catch (e) {
                console.error("Error destroying scanner during setup cleanup:", e);
              }
            }
          }
        } catch (err) {
          console.error("Dialog scanner setup error:", err);
          if (isMounted) {
            setError("Please allow camera access to scan");
          }
        }
      };
      setupScanner();

      // Cleanup function
      return () => {
        console.log("SimpleBarcodeScanner component unmounting");
        isMounted = false;
        videoContainerCreated.current = false;

        // Remove the video container
        if (containerRef.current) {
          const videoContainer = document.getElementById('dce-video-container-dialog');
          if (videoContainer && videoContainer.parentNode === containerRef.current) {
            containerRef.current.removeChild(videoContainer);
            console.log("Dialog video container removed");
          }
        }
        if (scannerInstance) {
          (async () => {
            try {
              console.log("Cleaning up dialog scanner");
              try {
                await scannerInstance.hide();
                console.log("Dialog scanner hidden");
              } catch (e) {
                console.error("Error hiding dialog scanner:", e);
              }
              try {
                await scannerInstance.destroyContext();
                console.log("Dialog scanner destroyed");
              } catch (e) {
                console.error("Error destroying dialog scanner:", e);
              }
            } catch (e) {
              console.error("Error in dialog scanner cleanup:", e);
            }
          })();
        }
      };
    }, []);
    return <div className="flex flex-col items-center p-4">
        {showInitMessage && <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white">
            <div className="text-center p-6 bg-slate-800/90 rounded-lg shadow-lg max-w-[250px] animate-pulse">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              <p className="font-medium text-lg mb-1">Initializing Scanner</p>
              <p className="text-sm text-slate-300">Please wait a moment...</p>
            </div>
          </div>}
        {error ? <div className="text-center py-8">
            <p className="text-amber-500 font-medium">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              This application requires camera access to scan barcodes
            </p>
            <Button onClick={onClose} variant="outline" className="mt-4">
              Close
            </Button>
          </div> : <>
            <div ref={containerRef} className="relative w-full aspect-[4/3] bg-black rounded-md overflow-hidden" style={{
          minHeight: '300px'
        }}>
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
          </>}
      </div>;
  };
  return <>
      {/* Only render the button if we're not in controlled mode */}
      {open === undefined && <Button onClick={handleDialogOpen} disabled={isInitializing} className="w-full text-white font-medium bg-slate-950 hover:bg-slate-800">
          <ScanBarcode className="w-5 h-5 mr-2" />
          {isInitializing ? "Initializing Scanner..." : "Scan Barcode"}
        </Button>}

      {isMobile ? <Sheet open={isOpen} onOpenChange={open => {
      setIsOpen(open);
      if (onOpenChange) onOpenChange(open);
      dialogOpenRef.current = open;
    }}>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Scan Barcode</h2>
              <p className="text-sm text-gray-500 mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>
            
            {isOpen && <SimpleBarcodeScanner onClose={handleDialogClose} />}
          </SheetContent>
        </Sheet> : <Dialog open={isOpen} onOpenChange={open => {
      setIsOpen(open);
      if (onOpenChange) onOpenChange(open);
      dialogOpenRef.current = open;
    }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
            </DialogHeader>
            
            {isOpen && <SimpleBarcodeScanner onClose={handleDialogClose} />}
          </DialogContent>
        </Dialog>}
    </>;
};
export default BarcodeScanner;