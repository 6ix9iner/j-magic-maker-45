
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
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const [initTimeoutOccurred, setInitTimeoutOccurred] = useState(false);

  // Check if we're on a mobile device to use Sheet instead of Dialog
  useEffect(() => {
    const checkMobile = () => {
      setUseSheet(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Pre-initialize audio for faster response
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.preload = "auto";
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleScanSuccess = useCallback((code: string, format: string) => {
    playBeep();
    vibrate();
    onDetected(code);
    toast.success(`Scanned: ${format}`, { duration: 1500 });
    
    // Close the dialog immediately
    setIsOpen(false);
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
    cameraPermissions,
    requestCameraPermission,
    cleanupScanner,
    preInitialize
  } = useBarcodeScannerSDK({
    onScan: handleScanSuccess
  });

  // Pre-initialize scanner when component mounts
  useEffect(() => {
    // Start pre-initialization immediately when component loads
    preInitialize().catch(console.error);
    
    return () => {
      cleanupScanner().catch(console.error);
    };
  }, [cleanupScanner, preInitialize]);

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

  // Find scanner container with multiple fallbacks
  const findScannerContainer = (): HTMLElement | null => {
    // Try multiple selectors for maximum reliability
    return (
      document.getElementById('dynamsoft-scanner-container') || 
      document.querySelector('[data-scanner-container]') as HTMLElement || 
      document.querySelector('.scanner-container') as HTMLElement ||
      document.querySelector('[data-scanner-view]') as HTMLElement ||
      null
    );
  };

  const handleOpen = async () => {
    // Reset error states
    setInitTimeoutOccurred(false);
    
    // First, set open state to show the dialog/sheet
    setIsOpen(true);
    
    // Minimal timeout for the dialog to render
    setTimeout(async () => {
      try {
        // Find the scanner container element using multiple fallbacks
        const scannerContainer = findScannerContainer();
        if (scannerContainer && !viewRef.current) {
          // Connect viewRef to the scanner container
          viewRef.current = scannerContainer as HTMLDivElement;
        }
        
        // Start scanner with a strict 800ms timeout (reduced from 900ms)
        const startPromise = startScanner();
        const timeoutPromise = new Promise<boolean>(resolve => {
          setTimeout(() => {
            setInitTimeoutOccurred(true);
            resolve(false);
          }, 800);
        });
        
        // Race between starting and timeout
        const started = await Promise.race([startPromise, timeoutPromise]);
        
        if (!started) {
          console.error("Scanner: Failed to start scanner within timeout");
          toast.error("Scanner initialization timed out. Please try again.");
          setIsOpen(false);
        }
      } catch (error) {
        console.error("Failed to start scanner:", error);
        toast.error("Failed to start scanner. Please try again.");
        setIsOpen(false);
      }
    }, 30); // Reduced from 50ms to 30ms
  };

  const handleClose = async () => {
    await stopScanner();
    setIsOpen(false);
  };

  const handleRetry = async () => {
    console.log("Scanner: Retrying scanner initialization");
    toast.info("Reinitializing camera...");
    
    // Full cleanup first
    await cleanupScanner();
    
    // Minimal delay before retry
    setTimeout(async () => {
      // Find scanner container again before starting
      const scannerContainer = findScannerContainer();
      if (scannerContainer && !viewRef.current) {
        viewRef.current = scannerContainer as HTMLDivElement;
      }
      
      await startScanner();
    }, 30); // Reduced from 50ms to 30ms
  };

  // Torch handling
  const handleTorch = async () => {
    try {
      await toggleTorch();
    } catch (error) {
      console.error("Torch error:", error);
      toast.error("Torch not available on this device");
    }
  };

  // Dialog content
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
        data-scanner-container
        id="dynamsoft-scanner-container"
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
