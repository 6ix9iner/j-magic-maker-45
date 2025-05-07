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
      preInitialize().catch(console.error);
    }
    
    // Pre-initialize audio
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.preload = "auto";
    
    return () => {
      cleanupScanner().catch(console.error);
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
        const container = document.querySelector('.scanner-container') as HTMLDivElement;
        
        if (container) {
          clearInterval(checkInterval);
          scannerContainerRef.current = container;
          resolve(container);
        }
        
        if (attempts >= 10) { // 10 * 100ms = 1 second max
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
    });
  };

  const handleOpen = async () => {
    // First, set open state to show the dialog/sheet
    setIsOpen(true);
    
    // Give time for the dialog to render before starting the scanner
    setTimeout(async () => {
      try {
        console.log("Scanner: Starting scanner...");
        
        // Connect viewRef to scannerContainer for faster startup
        const scannerContainer = await waitForScannerContainer();
        if (!scannerContainer && !viewRef.current) {
          console.error("Scanner: Scanner container not found after 1 second");
          toast.error("Failed to initialize scanner. Please try again.");
          setIsOpen(false);
          return;
        }
        
        if (scannerContainer && !viewRef.current) {
          // Force connect viewRef to the scanner-container
          viewRef.current = scannerContainer;
        }
        
        const started = await Promise.race([
          startScanner(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000)) // 1 second timeout
        ]);
        
        if (started === false) {
          console.error("Scanner: Failed to start scanner within 1 second");
          toast.error("Scanner initialization timed out. Please try again.");
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
    }, 100);
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
    }, 100);
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
      <div className={useSheet ? "flex-1 flex items-center justify-center p-4" : "p-4"}>
        <BarcodeScannerUI
          isScanning={isScanning}
          isInitialized={isInitialized}
          isError={isError}
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
