
import React, { useState } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBarcodeScanner } from './useBarcodeScanner';
import BarcodeScannerUI from './BarcodeScannerUI';

interface BarcodeScannerProps {
  onDetected: (result: string) => void;
}

const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    videoRef,
    canvasRef,
    beepSoundRef,
    isScanning,
    error,
    zoom,
    focusMode,
    startScanning,
    stopScanning,
    adjustZoom,
    toggleFocusMode,
    hasVideoFeed
  } = useBarcodeScanner({
    onDetected: (barcodeValue: string) => {
      onDetected(barcodeValue);
      toast.success("Barcode detected!");
    }
  });

  const handleStartScanning = () => {
    setIsOpen(true);
    startScanning();
  };

  const handleStopScanning = () => {
    stopScanning();
    setIsOpen(false);
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

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleStopScanning();
        setIsOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          
          <BarcodeScannerUI 
            isScanning={isScanning}
            hasVideoFeed={hasVideoFeed}
            zoom={zoom}
            focusMode={focusMode}
            error={error}
            onZoomIn={() => adjustZoom(true)}
            onZoomOut={() => adjustZoom(false)}
            onToggleFocus={toggleFocusMode}
            onCancel={handleStopScanning}
            videoRef={videoRef}
            canvasRef={canvasRef}
          />
        </DialogContent>
      </Dialog>
      
      {/* Hidden audio element for beep sound */}
      <audio ref={beepSoundRef} style={{ display: 'none' }} />
    </>
  );
};

export default BarcodeScanner;
