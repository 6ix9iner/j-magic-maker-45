
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onDetected: (result: string) => void;
}

const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // Initialize the barcode reader with hints for better performance
    const hints = new Map();
    // Set hints to focus on common formats like EAN, UPC, CODE_128, etc.
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, 
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = codeReader;

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!codeReaderRef.current) return;
    
    setIsScanning(true);
    setIsOpen(true);
    setError(null);
    
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use the back camera if available
      });
      
      setHasPermission(true);
      
      if (videoRef.current) {
        // Connect the stream to our video element
        videoRef.current.srcObject = stream;
        
        // Start continuous scanning
        codeReaderRef.current.decodeFromVideoDevice(
          undefined, 
          videoRef.current,
          (result, error) => {
            if (result) {
              // Barcode detected!
              const barcodeValue = result.getText();
              console.log("Barcode detected:", barcodeValue);
              
              // Only callback and close if we have a valid barcode
              if (barcodeValue && barcodeValue.trim() !== '') {
                onDetected(barcodeValue);
                stopScanning();
                toast.success("Barcode detected!");
              }
            }
            
            if (error && !(error.name === 'NotFoundException')) {
              console.error("Scanning error:", error);
            }
          }
        );
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(err.message || "Failed to access camera");
      setHasPermission(false);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setIsOpen(false);
  };

  return (
    <>
      <Button 
        onClick={startScanning}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        Scan Barcode
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) stopScanning();
        setIsOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center space-y-4">
            {error ? (
              <div className="text-destructive text-center">
                <p>{error}</p>
                <p className="text-sm mt-2">Please ensure you've granted camera permissions.</p>
              </div>
            ) : (
              <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                ></video>
                <div className="absolute inset-0 border-2 border-blue-500 opacity-70 pointer-events-none">
                  <div className="absolute top-1/2 left-0 right-0 border-t-2 border-blue-500"></div>
                </div>
              </div>
            )}
            
            <Button variant="outline" onClick={stopScanning} className="mt-4">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeScanner;
