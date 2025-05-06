
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBarcodeScannerSDK } from '@/hooks/useBarcodeScannerSDK';
import BarcodeScannerUI from './BarcodeScannerUI';
import { BEEP_SOUND_URL, initializeDynamsoft } from '@/utils/dynamsoftConfig';
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
  const sdkPreloadedRef = useRef<boolean>(false);
  
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
  
  // Pre-load Dynamsoft SDK when the component is first mounted
  useEffect(() => {
    // Only do this once
    if (!sdkPreloadedRef.current) {
      sdkPreloadedRef.current = true;
      
      // Pre-initialize SDK silently in the background
      const timer = setTimeout(() => {
        initializeDynamsoft().catch(err => {
          // Just log errors, don't show to user
          console.log('Background SDK initialization failed:', err);
        });
      }, 1000); // Short delay after page load
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Initialize audio
  useEffect(() => {
    try {
      audioRef.current = new Audio();
      audioRef.current.src = BEEP_SOUND_URL;
      audioRef.current.volume = 1.0;
      audioRef.current.preload = 'auto';
      
      // Try to load audio after user interaction
      const loadAudio = () => {
        if (audioRef.current) {
          audioRef.current.load();
        }
      };
      
      document.addEventListener('click', loadAudio, { once: true });
      
      return () => {
        document.removeEventListener('click', loadAudio);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    } catch (error) {
      console.log("Audio setup error:", error);
    }
  }, []);

  // Handle scan result
  const handleScan = (code: string, symbology: string) => {
    // Play sound
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.log("Sound play error:", e);
          });
        }
      } catch (e) {
        console.log("Audio playback error:", e);
      }
    }
    
    // Vibrate device if supported
    try {
      if (navigator.vibrate) {
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

  // Initialize the barcode scanner SDK
  const {
    viewRef,
    isScanning,
    isTorchOn,
    isInitialized,
    isError,
    cameraPermissions,
    toggleScanning,
    setTorchState,
    requestCameraPermission,
    cleanupScanner,
    preInitialize
  } = useBarcodeScannerSDK({
    onScan: handleScan
  });

  // Open scanner and start scanning
  const handleOpenScanner = async () => {
    setIsOpen(true);
    setScanReady(true);
    retryCountRef.current = 0;
    torchStateRef.current = false;
    
    // Request permissions first
    await requestCameraPermission();
    
    // Start scanning with a small delay to let UI render
    setTimeout(() => {
      toggleScanning();
    }, 300);
  };

  // Stop scanning when dialog closes
  const handleStopScanning = async () => {
    // Turn off torch if it's on
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

  // Handle torch toggle
  const handleTorchToggle = async () => {
    try {
      const newTorchState = !torchStateRef.current;
      const success = await setTorchState(newTorchState);
      
      if (success) {
        torchStateRef.current = newTorchState;
        toast.success(newTorchState ? "Torch turned on" : "Torch turned off", {
          duration: 1000
        });
      }
    } catch (error) {
      console.error("Torch toggle error:", error);
    }
  };

  // Try to restart the scanner when it fails
  const handleRetry = async () => {
    if (retryCountRef.current >= 3) {
      toast.error("Too many attempts. Please close and try again.");
      return;
    }
    
    retryCountRef.current++;
    toast.info("Restarting scanner...");
    
    // Clean up current scanner
    await cleanupScanner();
    
    // Reset torch state
    torchStateRef.current = false;
    
    // Start scanning again with a delay
    setTimeout(() => {
      toggleScanning();
    }, 300);
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

  // Start preloading when button is hovered for faster launch
  const handleScanButtonHover = () => {
    preInitialize().catch(() => {}); // Silently preload on hover
  };

  return (
    <>
      <Button 
        onClick={handleOpenScanner}
        onMouseOver={handleScanButtonHover}
        onTouchStart={handleScanButtonHover}
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
                Position barcode within view for scanning
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
                Position barcode within view for scanning
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
