
import React, { useEffect, useRef, useState } from 'react';
import { 
  BrowserMultiFormatReader, 
  DecodeHintType, 
  BarcodeFormat,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer
} from '@zxing/library';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onDetected: (result: string) => void;
}

const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

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
      BarcodeFormat.CODE_93,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX
    ]);
    // Additional hints for better performance
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);
    
    const codeReader = new BrowserMultiFormatReader(hints, 500); // Increased timeout
    codeReaderRef.current = codeReader;

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Manual processing using canvas
  const processVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !codeReaderRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Convert canvas to a format ZXing can process
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      const binarizer = new HybridBinarizer(luminanceSource);
      const bitmap = new BinaryBitmap(binarizer);
      
      // Use the correct decoding method for BinaryBitmap
      const result = codeReaderRef.current.decodeBitmap(bitmap);
      
      if (result) {
        const barcodeValue = result.getText();
        console.log("Barcode detected from canvas:", barcodeValue);
        
        if (barcodeValue && barcodeValue.trim() !== '') {
          onDetected(barcodeValue);
          stopScanning();
          toast.success("Barcode detected!");
        }
      }
    } catch (err) {
      // Silent failure for this method as we're trying repeatedly
      // Most frames won't contain a valid barcode
    }
  };

  const startScanning = async () => {
    if (!codeReaderRef.current) return;
    
    setIsScanning(true);
    setIsOpen(true);
    setError(null);
    
    try {
      // Request camera permission with specific constraints for better results
      const constraints = {
        video: { 
          facingMode: 'environment', // Use the back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
          focusMode: 'continuous'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setHasPermission(true);
      
      if (videoRef.current) {
        // Connect the stream to our video element
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          // Start continuous scanning with ZXing
          codeReaderRef.current?.decodeFromVideoDevice(
            undefined, 
            videoRef.current!,
            (result, error) => {
              if (result) {
                const barcodeValue = result.getText();
                console.log("Barcode detected from stream:", barcodeValue);
                
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
          
          // Backup method - process frames manually on an interval
          scanIntervalRef.current = window.setInterval(() => {
            processVideoFrame();
          }, 200);
        };
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
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
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
                <canvas 
                  ref={canvasRef} 
                  className="hidden" 
                />
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
