
import React, { useState, useRef, useEffect } from 'react';
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
    requestCameraPermission
  } = useBarcodeScannerSDK({
    onScan: (code, format) => {
      playBeep();
      vibrate();
      onDetected(code);
      toast.success(`Scanned: ${format}`, { duration: 1500 });
      
      // Close the dialog with slight delay
      setTimeout(() => {
        setIsOpen(false);
      }, 300);
    }
  });

  useEffect(() => {
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.preload = "auto";
  }, []);

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
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        toast.error("Camera permission is required.");
        return;
      }

      await startScanner();
    } catch (error) {
      toast.error("Failed to start scanner.");
      console.error(error);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setIsOpen(false);
  };

  const handleTorch = async () => {
    try {
      const newState = await toggleTorch();
      toast.success(newState ? "Torch ON" : "Torch OFF");
    } catch {
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
