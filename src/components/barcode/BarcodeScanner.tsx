
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBarcodeScannerSDK } from '@/hooks/useBarcodeScannerSDK';
import BarcodeScannerUI from './BarcodeScannerUI';
import { BEEP_SOUND_URL } from '@/utils/dynamsoftConfig';

interface BarcodeScannerProps {
  onDetected: (result: string) => void;
}

const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
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
    
    // Call the onDetected callback
    onDetected(code);
    toast.success(`Barcode detected: ${symbology}`);
    
    // Close the dialog and cleanup scanner properly
    setIsOpen(false);
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
    // Use a longer delay to ensure dialog is fully rendered
    setTimeout(() => {
      if (!isScanning) {
        toggleScanning();
      }
    }, 1000); // Increased from 700 to 1000ms for better reliability
  };

  // Properly clean up resources when stopping
  const handleStopScanning = async () => {
    try {
      // More thorough cleanup
      await cleanupScanner();
      // Small delay before changing dialog state to ensure cleanup completes
      setTimeout(() => {
        setIsOpen(false);
      }, 100);
    } catch (error) {
      console.error("Error during scanner cleanup:", error);
      setIsOpen(false); // Still close even if there's an error
    }
  };

  // Reset the scanner if there's an error when reopening
  useEffect(() => {
    // Only try to reinitialize if the dialog is open
    if (isOpen && hasOpenedBefore && isError) {
      const reinitialize = async () => {
        // Ensure previous scanner instance is fully cleaned up
        await cleanupScanner();
        // Short delay before requesting camera permission again
        setTimeout(async () => {
          await requestCameraPermission();
          // If still open after permission, try to start scanning again
          if (isOpen && !isScanning) {
            setTimeout(() => {
              toggleScanning();
            }, 800);
          }
        }, 500);
      };
      
      reinitialize();
    }
  }, [isOpen, hasOpenedBefore, isError, cleanupScanner, requestCameraPermission, isScanning, toggleScanning]);

  // Clean up scanner resources when dialog closes or component unmounts
  useEffect(() => {
    if (!isOpen && hasOpenedBefore) {
      // Clean up resources when dialog closes with small delay to ensure dialog transitions complete
      const cleanup = async () => {
        // Short delay before cleanup to avoid race conditions with dialog animations
        setTimeout(async () => {
          await cleanupScanner();
        }, 300);
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
      handleStopScanning();
    } else if (open && !isOpen) {
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

      <Dialog open={isOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Position the barcode within the camera view for automatic scanning
            </DialogDescription>
          </DialogHeader>
          
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeScanner;
