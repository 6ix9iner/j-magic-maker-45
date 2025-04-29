
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
import { ScanBarcode, Loader } from "lucide-react";

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
  const streamRef = useRef<MediaStream | null>(null);

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
    
    const codeReader = new BrowserMultiFormatReader(hints, 1000); // Increased timeout for more reliable detection
    codeReaderRef.current = codeReader;

    return () => {
      stopScanning();
    };
  }, []);

  // Clean up everything when component unmounts
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // Manual processing using canvas
  const processVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !codeReaderRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    try {
      // Make sure video is actually playing and has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
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
      // First check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera access");
      }

      // Request camera permission with specific constraints for better results
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' }, // Use the back camera if available
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 10 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      setHasPermission(true);
      
      if (videoRef.current) {
        // Connect the stream to our video element
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play error:", e));
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;
          
          console.log("Video ready with dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          
          // Reset any previous scanning attempts
          if (codeReaderRef.current) {
            codeReaderRef.current.reset();
          }
          
          // Start continuous scanning with ZXing
          codeReaderRef.current?.decodeFromVideoDevice(
            undefined, 
            videoRef.current,
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
          // Using a shorter interval for more reliable detection
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          
          scanIntervalRef.current = window.setInterval(() => {
            processVideoFrame();
          }, 150); // Faster scanning interval
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
    console.log("Stopping scanner...");
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Stop all tracks on the media stream
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear the video source
    if (videoRef.current && videoRef.current.srcObject) {
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
        <ScanBarcode className="w-5 h-5 mr-2" />
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
                {isScanning && !videoRef.current?.srcObject && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {/* Horizontal scanning line with animation */}
                  <div className="w-full h-1 bg-blue-500 opacity-70 animate-bounce"></div>
                  
                  {/* Target area border */}
                  <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-80">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-sm text-center text-gray-600">
              Position the barcode within the highlighted area
            </p>
            
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
