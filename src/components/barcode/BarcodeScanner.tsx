
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
    cleanupScanner
  } = useBarcodeScannerSDK({
    onScan: handleScanSuccess
  });

  useEffect(() => {
    // Pre-initialize audio
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.preload = "auto";
    
    return () => {
      cleanupScanner().catch(console.error);
    };
  }, [cleanupScanner]);

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

  const handleOpen = async () => {
    setIsOpen(true);
    
    try {
      console.log("Scanner: Requesting camera permission first...");
      const hasPermission = await requestCameraPermission();
      
      if (!hasPermission) {
        console.error("Scanner: Camera permission denied");
        toast.error("Camera permission is required.");
        setIsOpen(false);
        return;
      }
      
      console.log("Scanner: Starting scanner after permission granted");
      const started = await startScanner();
      
      if (!started) {
        console.error("Scanner: Failed to start scanner");
        toast.error("Failed to start scanner. Please try again.");
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
      const permission = await requestCameraPermission();
      if (permission) {
        await startScanner();
      } else {
        toast.error("Camera permission is required.");
      }
    }, 500);
  };

  const handleTorch = async () => {
    try {
      const newState = await toggleTorch();
      toast.success(newState ? "Torch ON" : "Torch OFF");
    } catch (error) {
      console.error("Torch error:", error);
      toast.error("Torch not supported on this device.");
    }
  };

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
