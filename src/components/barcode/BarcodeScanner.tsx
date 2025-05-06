
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
  
  useEffect(() => {
    // Initialize audio element for beep sound
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.volume = 1.0;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  const handleScan = (code: string, symbology: string) => {
    // Play beep sound
    if (audioRef.current) {
      audioRef.current.play()
        .catch(e => console.error("Error playing sound:", e));
    }
    
    // Vibrate the device if supported
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    // Call the onDetected callback
    onDetected(code);
    toast.success(`Barcode detected: ${symbology}`);
    
    // Close the dialog
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
    requestCameraPermission
  } = useBarcodeScannerSDK({
    onScan: handleScan
  });
  
  // When opening the dialog, we need to ensure we have a small delay before starting the scanner
  const handleStartScanning = () => {
    setIsOpen(true);
    setHasOpenedBefore(true);
    // Slight delay to ensure dialog is open before starting camera
    setTimeout(() => {
      if (!isScanning) {
        toggleScanning();
      }
    }, 500);
  };

  const handleStopScanning = () => {
    if (isScanning) {
      toggleScanning();
    }
    setIsOpen(false);
  };

  // Reset the scanner if there's an error when reopening
  useEffect(() => {
    if (isOpen && hasOpenedBefore && isError) {
      // Attempt to reinitialize if there was an error and the user is reopening
      requestCameraPermission();
    }
  }, [isOpen, hasOpenedBefore, isError, requestCameraPermission]);

  return (
    <>
      <Button 
        onClick={handleStartScanning}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        <ScanBarcode className="w-5 h-5 mr-2" />
        Scan Barcode
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleStopScanning();
        setIsOpen(open);
      }}>
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
