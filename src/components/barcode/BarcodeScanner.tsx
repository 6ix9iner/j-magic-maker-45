
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
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);
  const [useSheet, setUseSheet] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0); // Track number of scan attempts
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
  
  // Make sure to preload the audio for faster playback
  useEffect(() => {
    // Initialize audio element for beep sound with higher volume and preload
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.volume = 1.0;
    audioRef.current.preload = 'auto';
    
    // Preload the sound
    audioRef.current.load();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Handle successful scan with sound and vibration
  const handleScan = (code: string, symbology: string) => {
    // Play beep sound with more reliable method
    if (audioRef.current) {
      // Reset to beginning in case it was already played
      audioRef.current.currentTime = 0;
      
      const playPromise = audioRef.current.play();
      
      // Handle the promise to avoid uncaught promise errors
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.error("Error playing sound:", e);
        });
      }
    }
    
    // Vibrate the device if supported
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    // Reset scan attempts
    setScanAttempts(0);
    
    // Call the onDetected callback
    onDetected(code);
    toast.success(`Barcode detected: ${symbology}`);
    
    // Close the dialog and cleanup scanner properly with delay to ensure it's processed
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const {
    viewRef,
    isScanning,
    isTorchOn,
    isInitialized,
    isError,
    cameraPermissions,
    toggleScanning,
    toggleTorch,
    requestCameraPermission,
    cleanupScanner
  } = useBarcodeScannerSDK({
    onScan: handleScan
  });
  
  // When opening the dialog, start scanning after a delay to ensure dialog is fully rendered
  const handleStartScanning = () => {
    setIsOpen(true);
    setHasOpenedBefore(true);
    setScanAttempts(prev => prev + 1); // Increment scan attempts
    
    // Show troubleshooting tip if user has tried multiple times
    if (scanAttempts >= 2) {
      toast.info("Camera not showing? Try closing and reopening the scanner.", {
        duration: 5000
      });
    }
    
    // Use a longer delay to ensure dialog is fully rendered and everything is ready
    setTimeout(() => {
      if (!isScanning) {
        toggleScanning();
      }
    }, 1200);
  };

  // Properly clean up resources when stopping
  const handleStopScanning = async () => {
    try {
      // Stop scanner first
      await cleanupScanner();
      
      // Close dialog after cleanup with a small delay
      setTimeout(() => {
        setIsOpen(false);
      }, 300);
    } catch (error) {
      console.error("Error during scanner cleanup:", error);
      setIsOpen(false); // Still close even if there's an error
    }
  };

  // Clean up scanner resources when dialog closes or component unmounts
  useEffect(() => {
    if (!isOpen && hasOpenedBefore) {
      // Clean up resources when dialog closes with delay to ensure dialog transitions complete
      const cleanup = async () => {
        // Wait a moment before cleanup to avoid race conditions
        setTimeout(async () => {
          await cleanupScanner();
        }, 500);
      };
      cleanup();
    }
    
    // Clean up on unmount
    return () => {
      if (cleanupScanner) {
        cleanupScanner();
      }
    };
  }, [isOpen, hasOpenedBefore, cleanupScanner]);

  // Prevent multiple open/close cycles that can cause scanner instability
  const handleDialogChange = (open: boolean) => {
    if (!open && isOpen) {
      // When closing dialog, ensure we do proper cleanup
      handleStopScanning();
    } else if (open && !isOpen) {
      // When opening dialog, ensure we start scanning
      handleStartScanning();
    }
  };

  return (
    <>
      <Button 
        onClick={handleStartScanning}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        <ScanBarcode className="w-5 h-5 mr-2" />
        Scan Barcode
      </Button>

      {useSheet ? (
        <Sheet open={isOpen} onOpenChange={handleDialogChange}>
          <SheetContent side="bottom" className="h-[85vh] sm:max-w-md flex flex-col p-0">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Scan Barcode</h2>
              <p className="text-sm text-gray-500 mt-1">
                Position the barcode within the camera view for automatic scanning
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <BarcodeScannerUI 
                isScanning={isScanning}
                isTorchOn={isTorchOn}
                isInitialized={isInitialized}
                isError={isError}
                cameraPermissions={cameraPermissions}
                viewRef={viewRef}
                onToggleTorch={toggleTorch}
                onCancel={handleStopScanning}
                onRequestPermission={requestCameraPermission}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="sm:max-w-md p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Position the barcode within the camera view for automatic scanning
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center justify-center">
              <BarcodeScannerUI 
                isScanning={isScanning}
                isTorchOn={isTorchOn}
                isInitialized={isInitialized}
                isError={isError}
                cameraPermissions={cameraPermissions}
                viewRef={viewRef}
                onToggleTorch={toggleTorch}
                onCancel={handleStopScanning}
                onRequestPermission={requestCameraPermission}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BarcodeScanner;
