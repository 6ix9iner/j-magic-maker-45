// This component now serves as a compatibility layer for existing imports
// It simply re-exports the scanner functionality from ScannerPage
import React, { useState, useEffect } from 'react';
import { ScanBarcode, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { getDynamsoftLicenseKey } from '@/components/barcode/BarcodeConfigUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Capacitor } from '@capacitor/core';
import MlKitScanner from '@/components/barcode/MlKitScanner';
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
        // Set license key from Supabase
        const licenseKey = await getDynamsoftLicenseKey();
        BarcodeReader.license = licenseKey;
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
    const [mlKitAvailable, setMlKitAvailable] = React.useState(false);
    const [selectedScanner, setSelectedScanner] = React.useState<'dynamsoft' | 'mlkit'>('dynamsoft');
    const videoContainerCreated = React.useRef<boolean>(false);
    const scannerInstanceRef = React.useRef<DynamsoftScanner | null>(null);
    const isDestroyingRef = React.useRef<boolean>(false);

    React.useEffect(() => {
      if (Capacitor.isNativePlatform()) {
        setMlKitAvailable(true);
      }
    }, []);

    React.useEffect(() => {
      if (!dialogOpenRef.current) return;
      let isMounted = true;
      let mlkitListener: any = null;
      isDestroyingRef.current = false;

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
          console.log("Setting up dialog scanner (Dynamsoft)");
          // Create the video container first
          createVideoContainer();

          // Create scanner instance
          const scannerInstance = await DynamsoftScanner.createInstance();
          console.log("Dialog scanner instance created");
          scannerInstanceRef.current = scannerInstance;

          // Update settings for better performance
          const settings = await scannerInstance.getRuntimeSettings();
          settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
          settings.deblurLevel = 2;
          await scannerInstance.updateRuntimeSettings(settings);
          if (isMounted && dialogOpenRef.current && !isDestroyingRef.current) {
            setScanner(scannerInstance);

            // Set up callback for barcode detection
            scannerInstance.onUnduplicatedRead = (txt, result) => {
              console.log("Dialog barcode detected (Dynamsoft):", txt, result);
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
          if (isMounted && !isDestroyingRef.current) {
            setError("Please allow camera access to scan");
          }
        }
      };

      const startMlKit = async () => {
        try {
          await MlKitScanner.startScan();

          // Capacitor style listener
          try {
            mlkitListener = await MlKitScanner.addListener('mlkitBarcodeDetected', (d: any) => {
              const code = (d && (d.code || d.value)) || null;
              if (code && isMounted) {
                handleScan(code, "ML Kit");
              }
            });
          } catch (e) {
            console.warn('Failed to attach mlkit listener', e);
          }
        } catch (e) {
          console.error('Error starting MlKit plugin', e);
          setError('Failed to start ML Kit scanner');
        }
      };

      if (selectedScanner === 'mlkit') {
        startMlKit();
      } else {
        setupScanner();
      }

      // Cleanup function
      return () => {
        console.log("SimpleBarcodeScanner component unmounting, selected:", selectedScanner);
        isMounted = false;
        isDestroyingRef.current = true;
        videoContainerCreated.current = false;

        // Remove the video container
        if (containerRef.current) {
          const videoContainer = document.getElementById('dce-video-container-dialog');
          if (videoContainer && videoContainer.parentNode === containerRef.current) {
            containerRef.current.removeChild(videoContainer);
            console.log("Dialog video container removed");
          }
        }
        
        const scannerInstance = scannerInstanceRef.current;
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
          scannerInstanceRef.current = null;
        }

        try {
          if (mlkitListener && mlkitListener.remove) {
            mlkitListener.remove();
          }
        } catch (e) {}

        try {
          MlKitScanner.stopScan();
        } catch (e) {}
      };
    }, [selectedScanner]);

    return (
      <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 w-full">
        {mlKitAvailable && (
          <div className="flex items-center gap-2 mb-4 w-full justify-center">
            <Button 
              variant={selectedScanner === 'dynamsoft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScanner('dynamsoft')}
              className="rounded-full px-4"
            >
              Dynamsoft
            </Button>
            <Button 
              variant={selectedScanner === 'mlkit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScanner('mlkit')}
              className="rounded-full px-4"
            >
              ML Kit (Native)
            </Button>
          </div>
        )}

        {showInitMessage && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white">
            <div className="text-center p-6 bg-slate-800/90 rounded-lg shadow-lg max-w-[250px] animate-pulse">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              <p className="font-medium text-lg mb-1">Initializing Scanner</p>
              <p className="text-sm text-slate-300">Please wait a moment...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="text-center py-8">
            <p className="text-rose-500 font-semibold">{error}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              This application requires camera access to scan barcodes
            </p>
            <Button onClick={onClose} variant="outline" className="mt-4 h-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100/50 font-semibold">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div 
              ref={containerRef} 
              className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800" 
              style={{ minHeight: '300px' }}
            >
              {selectedScanner === 'mlkit' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-indigo-600 animate-pulse mb-4 shadow-lg shadow-indigo-500/20">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-lg">Native Scanner Active</p>
                  <p className="text-sm text-slate-400 text-center mt-2 max-w-xs">
                    A native camera window has opened to scan your barcode.
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-1 bg-indigo-600 opacity-90 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-pulse"></div>
                </div>
              )}
            </div>
            <p className="text-xs text-center my-4 text-slate-500 dark:text-slate-400 font-medium">
              {selectedScanner === 'mlkit' 
                ? "Close the native camera when done scanning"
                : "Position barcode within the frame for automatic scanning"
              }
            </p>
            <Button variant="outline" onClick={onClose} className="mt-1 h-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100/50 font-semibold w-full">
              Cancel
            </Button>
          </>
        )}
      </div>
    );
  };
  return <>
      {/* Only render the button if we're not in controlled mode */}
      {open === undefined && (
        <Button onClick={handleDialogOpen} disabled={isInitializing} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all">
          <ScanBarcode className="w-5 h-5 mr-2" />
          {isInitializing ? "Initializing..." : "Scan Barcode"}
        </Button>
      )}

      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={open => {
          setIsOpen(open);
          if (onOpenChange) onOpenChange(open);
          dialogOpenRef.current = open;
        }}>
          <SheetContent side="bottom" className="rounded-t-3xl border-t border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 h-[80vh] flex flex-col">
            <div className="pb-4 border-b border-slate-50 dark:border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Scan Barcode</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>
            
            {isOpen && <SimpleBarcodeScanner onClose={handleDialogClose} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={open => {
          setIsOpen(open);
          if (onOpenChange) onOpenChange(open);
          dialogOpenRef.current = open;
        }}>
          <DialogContent className="sm:max-w-md rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 bg-white dark:bg-slate-900">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-slate-800 dark:text-slate-100 font-bold text-lg">Scan Barcode</DialogTitle>
            </DialogHeader>
            
            {isOpen && <SimpleBarcodeScanner onClose={handleDialogClose} />}
          </DialogContent>
        </Dialog>
      )}
    </>;
};
export default BarcodeScanner;