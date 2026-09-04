// The mobile-layout barcode scanner used on the main scan screen (Index).
// Native platforms (iOS/Android) always use ML Kit; the web build always
// uses Dynamsoft - see `useMlKit` below, there's no runtime switching.
import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { getDynamsoftLicenseKey } from '@/components/barcode/BarcodeConfigUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import MlKitScanner from '@/components/barcode/MlKitScanner';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onScan?: (code: string, symbology: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// On native platforms (iOS/Android) this ALWAYS uses ML Kit. On web it
// ALWAYS uses Dynamsoft. There is no runtime switching between the two -
// each platform has exactly one scanner engine.
const useMlKit = Capacitor.isNativePlatform();

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onScan,
  open,
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showInitMessage, setShowInitMessage] = useState(false);
  const isMobile = useIsMobile();
  // Track dialog open state for proper scanner initialization
  const dialogOpenRef = useRef(false);

  // Handle controlled mode when open/onOpenChange are provided
  useEffect(() => {
    if (open !== undefined && onOpenChange) {
      setIsOpen(open);
    }
  }, [open, onOpenChange]);

  // Initialize the Dynamsoft barcode reader - web only. On native platforms
  // scanning is handled entirely by the native ML Kit activity, so there's
  // nothing to initialize here and no Dynamsoft license/engine is loaded.
  useEffect(() => {
    if (useMlKit) {
      setIsScannerReady(true);
      return;
    }
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

  const handleScan = (code: string, symbology: string = "Unknown") => {
    // Call both callback types for backward compatibility
    onDetected(code);
    if (onScan) {
      onScan(code, symbology);
    }
    handleDialogClose();
  };

  // Native: the ML Kit camera Activity IS the UI - it's a real full-screen
  // Android Activity, not something we render inside our own WebView. So we
  // never open a Dialog/Sheet of our own here (that just produced a
  // confusing dialog-behind-camera double layer); we only start the native
  // scan and listen for its result.
  const startNativeScan = async () => {
    setIsScanning(true);
    let mlkitListener: any = null;
    let resumeListener: any = null;
    const cleanup = () => {
      mlkitListener?.remove?.();
      resumeListener?.remove?.();
      mlkitListener = null;
      resumeListener = null;
      setIsScanning(false);
    };
    try {
      mlkitListener = await MlKitScanner.addListener('mlkitBarcodeDetected', (d: any) => {
        const code = (d && (d.code || d.value)) || null;
        if (code) {
          handleScan(code, (d && d.symbology) || "ML Kit");
        }
        cleanup();
      });
      // Safety net: the native camera Activity finishes silently (no
      // event of any kind) if the user taps its own Cancel button, or if
      // it errors out - only a successful detection was ever cleaning up
      // isScanning, so cancelling left the "Scan Barcode" button stuck
      // showing "Opening camera..." until something else (like leaving
      // the page) happened to remount this component. Returning to the
      // app from the camera Activity always fires a resume event
      // regardless of how the scan ended, so use that to guarantee
      // isScanning gets cleared either way.
      resumeListener = await CapacitorApp.addListener('resume', () => {
        cleanup();
      });
      await MlKitScanner.startScan();
    } catch (e) {
      console.error('Error starting ML Kit scanner', e);
      cleanup();
    }
  };

  const handleDialogOpen = () => {
    if (useMlKit) {
      startNativeScan();
      return;
    }
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
    setIsScanning(false);
    dialogOpenRef.current = false;
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  // Web-only Dynamsoft dialog scanner. Native never reaches this - the
  // camera Activity is native UI, handled by startNativeScan() above.
  const SimpleBarcodeScanner = ({
    onClose
  }: {
    onClose: () => void;
  }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [error, setError] = React.useState<string | null>(null);
    const videoContainerCreated = React.useRef<boolean>(false);
    const scannerInstanceRef = React.useRef<DynamsoftScanner | null>(null);
    const isDestroyingRef = React.useRef<boolean>(false);

    React.useEffect(() => {
      if (!dialogOpenRef.current) return;
      let isMounted = true;
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

      setupScanner();

      // Cleanup function
      return () => {
        console.log("SimpleBarcodeScanner component unmounting");
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
      };
    }, []);

    return (
      <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 w-full">
        {showInitMessage && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg max-w-[250px] animate-pulse">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-t-transparent border-indigo-600 animate-spin"></div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">Initializing Scanner</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Connecting to camera...</p>
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
              className="relative w-full aspect-[4/3] bg-slate-950/90 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800 shadow-inner"
              style={{ minHeight: '300px' }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-1 bg-indigo-600 opacity-90 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-pulse"></div>
              </div>
            </div>

            <div className="w-full my-4 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
              <p className="text-xs text-center text-slate-850 dark:text-slate-150 font-semibold leading-relaxed">
                Position barcode within the frame for automatic scanning
              </p>
            </div>

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
        <Button onClick={handleDialogOpen} disabled={isInitializing || isScanning} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all">
          <ScanBarcode className="w-5 h-5 mr-2" />
          {isScanning ? "Opening camera..." : isInitializing ? "Initializing..." : "Scan Barcode"}
        </Button>
      )}

      {/* Native has no dialog/sheet of its own - the ML Kit camera Activity
          is the entire UI while scanning (see startNativeScan above). */}
      {!useMlKit && (
        isMobile ? (
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
        )
      )}
    </>;
};
export default BarcodeScanner;
