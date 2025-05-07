
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBarcodeScannerSDK } from '@/hooks/useBarcodeScannerSDK';
import BarcodeScannerUI from './BarcodeScannerUI';
import { BEEP_SOUND_URL } from '@/utils/dynamsoftConfig';
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface BarcodeScannerProps {
  onDetected: (result: string) => void;
}

const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [useSheet, setUseSheet] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasBeenInitializedRef = useRef(false);
  const [preInitStarted, setPreInitStarted] = useState(false);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [initTimeoutOccurred, setInitTimeoutOccurred] = useState(false);

  // Check if we're on a mobile device to use Sheet instead of Dialog
  useEffect(() => {
    const checkMobile = () => {
      setUseSheet(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleScanSuccess = useCallback((code: string, format: string) => {
    playBeep();
    vibrate();
    onDetected(code);
    toast.success(`Scanned: ${format}`, { duration: 1500 });
    
    // Close the dialog with slight delay
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  }, [onDetected]);

  const {
    viewRef,
    isInitialized,
    isError,
    isScanning,
    isTorchOn,
    startScanner,
    stopScanner,
    toggleTorch,
    setTorchState,
    cameraPermissions,
    requestCameraPermission,
    cleanupScanner,
    preInitialize
  } = useBarcodeScannerSDK({
    onScan: handleScanSuccess
  });

  // Pre-initialize scanner when component mounts
  useEffect(() => {
    if (!preInitStarted) {
      setPreInitStarted(true);
      // Start pre-initialization immediately
      preInitialize().catch(() => {
        // Silently catch errors - we'll handle them during the actual scan
        console.log("Pre-initialization failed, will retry during scan");
      });
    }
    
    // Pre-initialize audio
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.preload = "auto";
    
    return () => {
      cleanupScanner().catch(() => {
        // Silent cleanup errors
        console.log("Cleanup failed, but continuing");
      });
    };
  }, [cleanupScanner, preInitialize, preInitStarted]);

  const playBeep = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const vibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  // Wait for DOM to be ready with shorter timeout
  const waitForScannerContainer = (): Promise<HTMLDivElement | null> => {
    return new Promise((resolve) => {
      if (scannerContainerRef.current) {
        return resolve(scannerContainerRef.current);
      }

      // Simple polling with very short timeout
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        // Try finding the container by multiple selectors to be more reliable
        const container = 
          document.querySelector('.scanner-container') as HTMLDivElement || 
          document.querySelector('[data-scanner-container]') as HTMLDivElement;
        
        if (container) {
          clearInterval(checkInterval);
          scannerContainerRef.current = container;
          resolve(container);
        }
        
        if (attempts >= 5) { // 5 * 50ms = 250ms max (reduced from 1 second)
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 50); // Check more frequently
    });
  };

  const handleOpen = async () => {
    // Reset error states
    setInitTimeoutOccurred(false);
    
    // First, set open state to show the dialog/sheet
    setIsOpen(true);
    
    // Give minimal time for the dialog to render
    setTimeout(async () => {
      try {
        console.log("Scanner: Starting scanner...");
        
        // Connect viewRef to scannerContainer for faster startup
        const scannerContainer = await waitForScannerContainer();
        if (!scannerContainer && !viewRef.current) {
          console.error("Scanner: Scanner container not found in DOM");
          toast.error("Scanner initialization failed. Please try again.");
          setIsOpen(false);
          return;
        }
        
        if (scannerContainer && !viewRef.current) {
          // Force connect viewRef to the scanner-container
          viewRef.current = scannerContainer;
        }
        
        // Start scanner with strict 900ms timeout to ensure we stay within 1 second
        const startPromise = startScanner();
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            setInitTimeoutOccurred(true);
            resolve(false);
          }, 900); // 900ms timeout to ensure we stay within 1 second
        });
        
        const started = await Promise.race([startPromise, timeoutPromise]);
        
        if (started === false) {
          console.error("Scanner: Failed to start scanner within 1 second");
          
          if (initTimeoutOccurred) {
            toast.error("Scanner initialization timed out.");
          } else {
            toast.error("Failed to start scanner. Please try again.");
          }
          
          setIsOpen(false);
          return;
        }
        
        console.log("Scanner: Scanner started successfully");
        hasBeenInitializedRef.current = true;
      } catch (error) {
        console.error("Failed to start scanner:", error);
        toast.error("Failed to start scanner. Please try again.");
        setIsOpen(false);
      }
    }, 50); // Reduced from 100ms to 50ms
  };

  const handleClose = async () => {
    await stopScanner();
    setIsOpen(false);
  };

  const handleRetry = async () => {
    console.log("Scanner: Retrying scanner initialization");
    toast.info("Reinitializing camera...");
    await cleanupScanner();
    
    setTimeout(async () => {
      await startScanner();
    }, 50); // Reduced from 100ms to 50ms
  };

  // Improved torch handling that won't close the scanner
  const handleTorch = async () => {
    try {
      await toggleTorch();
    } catch (error) {
      console.error("Torch error:", error);
      // Just show message but keep scanner open
      toast.error("Torch not available on this device");
    }
  };

  // Same dialog content as before
  const dialogContent = (
    <>
      <div className={useSheet ? "p-4 border-b" : ""}>
        <h2 className={useSheet ? "text-xl font-semibold" : "hidden"}>Scan Barcode</h2>
        <p className={useSheet ? "text-sm text-gray-500 mt-1" : "hidden"}>
          Point your camera at a barcode to scan.
        </p>
      </div>
      <div 
        className={useSheet ? "flex-1 flex items-center justify-center p-4" : "p-4"}
        data-scanner-container // Add this data attribute as backup selector
      >
        <BarcodeScannerUI
          isScanning={isScanning}
          isInitialized={isInitialized}
          isError={isError || initTimeoutOccurred}
          isTorchOn={isTorchOn}
          viewRef={viewRef}
          cameraPermissions={cameraPermissions}
          onToggleTorch={handleTorch}
          onCancel={handleClose}
          onRequestPermission={requestCameraPermission}
          onRetry={handleRetry}
        />
      </div>
    </>
  );

  return (
    <>
      <Button
        onClick={handleOpen}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        <ScanBarcode className="w-5 h-5 mr-2" />
        Scan Barcode
      </Button>

      {useSheet ? (
        <Sheet open={isOpen} onOpenChange={handleClose}>
          <SheetContent side="bottom" className="h-[85vh] sm:max-w-md flex flex-col p-0">
            {dialogContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Point your camera at a barcode to scan.
              </DialogDescription>
            </DialogHeader>
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BarcodeScanner;
