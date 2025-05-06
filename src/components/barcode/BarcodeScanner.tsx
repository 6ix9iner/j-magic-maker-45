
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
  const [scanReady, setScanReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCountRef = useRef<number>(0);
  const torchStateRef = useRef<boolean>(false);
  
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
  
  // Preload the audio for faster playback with better browser compatibility
  useEffect(() => {
    try {
      // Create audio element but don't try to play it until user interaction
      audioRef.current = new Audio();
      audioRef.current.src = BEEP_SOUND_URL;
      audioRef.current.volume = 1.0;
      audioRef.current.preload = 'auto';
      
      // Don't call load() or play() here - wait for user interaction
    } catch (error) {
      console.log("Audio setup error:", error);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle successful scan with sound and vibration
  const handleScan = (code: string, symbology: string) => {
    // Play sound with better cross-browser support
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        
        // Only attempt to play if we have user interaction
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.log("Sound play error:", e);
            // Don't show error to user, just silently fail
          });
        }
      } catch (e) {
        console.log("Audio playback error:", e);
      }
    }
    
    // Vibrate device if supported
    try {
      if (window.navigator && navigator.vibrate) {
        navigator.vibrate(200);
      }
    } catch (e) {
      console.log("Vibration error:", e);
    }
    
    // Call callback with result
    onDetected(code);
    
    // Show toast
    toast.success(`Barcode scanned: ${symbology}`, {
      duration: 2000
    });
    
    // Close the dialog with slight delay
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // Initialize the barcode scanner SDK with improved error recovery
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
    cleanupScanner,
    resetScanner,
    setTorchState
  } = useBarcodeScannerSDK({
    onScan: handleScan
  });

  // Start scanning when dialog opens with automatic retry
  const handleOpenScanner = async () => {
    setIsOpen(true);
    setScanReady(true);
    retryCountRef.current = 0;
    torchStateRef.current = false;
    
    // Reset the scanner first to ensure a clean start
    await resetScanner();
    
    // Request permissions explicitly
    await requestCameraPermission();
    
    // Start scanning with slight delay to let UI render
    setTimeout(() => {
      toggleScanning();
    }, 800);
  };

  // Stop scanning when dialog closes
  const handleStopScanning = async () => {
    // First turn off the torch if it's on
    if (torchStateRef.current) {
      try {
        await setTorchState(false);
        torchStateRef.current = false;
      } catch (e) {
        console.log("Error turning off torch during cleanup:", e);
      }
    }
    
    await cleanupScanner();
    setIsOpen(false);
  };

  // Handle the torch toggle with better state tracking
  const handleTorchToggle = async () => {
    try {
      const newTorchState = !torchStateRef.current;
      const success = await setTorchState(newTorchState);
      
      if (success) {
        torchStateRef.current = newTorchState;
        toast.success(newTorchState ? "Torch turned on" : "Torch turned off", {
          duration: 1000
        });
      } else {
        toast.error("Torch not available on this device");
      }
    } catch (error) {
      console.error("Torch toggle error:", error);
      toast.error("Could not toggle torch");
    }
  };

  // Try to reset the scanner when it fails, with retry limit
  const handleRetry = async () => {
    if (retryCountRef.current >= 3) {
      toast.error("Too many attempts. Please close and try again.");
      return;
    }
    
    retryCountRef.current++;
    toast.info("Restarting scanner...");
    
    // First clean up
    await cleanupScanner();
    
    // Then reset and try again
    const success = await resetScanner();
    
    if (success) {
      // Request permissions explicitly to ensure we have camera access
      const hasPermission = await requestCameraPermission();
      
      if (hasPermission) {
        // Reset torch state
        torchStateRef.current = false;
        
        // Start scanning again
        setTimeout(() => {
          toggleScanning();
        }, 800);
      } else {
        toast.error("Camera permission denied. Please allow access in your browser settings.");
      }
    } else {
      toast.error("Failed to restart scanner. Please try again.");
    }
  };

  // Handle dialog/sheet state changes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      handleOpenScanner();
    } else {
      handleStopScanning();
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

  return (
    <>
      <Button 
        onClick={handleOpenScanner}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        <ScanBarcode className="w-5 h-5 mr-2" />
        Scan Barcode
      </Button>

      {useSheet ? (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="h-[85vh] sm:max-w-md flex flex-col p-0">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Scan Barcode</h2>
              <p className="text-sm text-gray-500 mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              {scanReady && (
                <BarcodeScannerUI 
                  isScanning={isScanning}
                  isTorchOn={torchStateRef.current}
                  isInitialized={isInitialized}
                  isError={isError}
                  cameraPermissions={cameraPermissions}
                  viewRef={viewRef}
                  onToggleTorch={handleTorchToggle}
                  onCancel={handleStopScanning}
                  onRequestPermission={requestCameraPermission}
                  onRetry={handleRetry}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Position barcode within view for automatic scanning
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center justify-center">
              {scanReady && (
                <BarcodeScannerUI 
                  isScanning={isScanning}
                  isTorchOn={torchStateRef.current}
                  isInitialized={isInitialized}
                  isError={isError}
                  cameraPermissions={cameraPermissions}
                  viewRef={viewRef}
                  onToggleTorch={handleTorchToggle}
                  onCancel={handleStopScanning}
                  onRequestPermission={requestCameraPermission}
                  onRetry={handleRetry}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BarcodeScanner;
