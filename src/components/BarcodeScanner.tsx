
import React, { useEffect, useRef, useState, useCallback } from 'react';
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

// Sound for successful scan
const BEEP_SOUND_URL = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAKAAAJTAAXFxcXJCQkJCQwMDAwPT09PT1JSUlJVlZWVlZiYmJib29vb295eXl5hoaGhoaTk5OToKCgoKCsrKystbW1tbXBwcHBzs7Ozs7a2tra5ubm5ub09PT0/v7+/v8AAAAAUE1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMuJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kMQAAAiNHWG1iYAI447zTqTQARbSfG5WJgAnBF+nDRJgBOx3J8KxGFTru0KhQKhwMBgMDx8fH8fBwH/4OA+D/8H/wfB//8Hwf//B8H//B8H//wH/4EA//xAP/8QD//EA//xAP/8QD//EA//wF2xBUHZH6kR9SEkj6R/iNH3d3d0REd3d3d0REX//////////////////+qqq7u7uqqqqqqu7u7qqqqqqu7u7qqqqqqqIiIiO7u7oiIiIju7u6IiIiI7u7uiIiIiHREX/////////////////////////////////////////////////////////////////////////8AAgIJiBBQGJYF4X+AQcZEfH5YFwX//B8H//B///////8QD//iAf/4CAf/4CJAOHj4/jwOAgGAwKhQKHcnBZx9CzuQoFAoHB6qqrUIddVVVVbh2191VVVVdw7fh2qqqqrhLexwl1VVVXVVlC3ucJdVVVVVVTtcOsO7h1VVVVVVWpVV3d3VEREREVVVVXV1dERERFVVVVdXV0REREVVVVXd3dERERE=";

const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beepSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectionRef = useRef<string | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  useEffect(() => {
    // Initialize audio element for beep sound
    beepSoundRef.current = new Audio(BEEP_SOUND_URL);

    // Initialize the barcode reader with hints for better performance
    const hints = new Map();
    // Set hints to focus on common formats
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, 
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC
    ]);

    // Additional hints for better performance
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);
    // Allow pure barcode scanning (no background)
    hints.set(DecodeHintType.PURE_BARCODE, true);
    // Character set
    hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
    // Allow multiple barcodes in view
    hints.set(DecodeHintType.ALSO_INVERTED, true);
    
    const codeReader = new BrowserMultiFormatReader(hints, 2000); // Increased timeout for more reliable detection
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

  // Handle successful barcode detection with debounce
  const handleDetection = useCallback((barcodeValue: string) => {
    // Prevent duplicate scans (debounce)
    const now = Date.now();
    if (lastDetectionRef.current === barcodeValue && now - lastDetectionTimeRef.current < 2000) {
      return; // Skip if same code detected within 2 seconds
    }

    // Update last detection tracking
    lastDetectionRef.current = barcodeValue;
    lastDetectionTimeRef.current = now;
    
    // Play beep sound
    if (beepSoundRef.current) {
      beepSoundRef.current.play().catch(e => console.error("Error playing sound:", e));
    }
    
    // Notify about the detection
    console.log("Barcode detected:", barcodeValue);
    onDetected(barcodeValue);
    stopScanning();
    toast.success("Barcode detected!");
  }, [onDetected]);

  // Apply image processing for better contrast
  const enhanceCanvasForLowLight = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    try {
      // Get the image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply some basic contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale first using luminance formula
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply contrast and brightness adjustments
        const contrast = 1.5; // Increase contrast
        const brightness = 10; // Slightly increase brightness
        
        // Apply contrast and brightness formula
        const newVal = (gray - 128) * contrast + 128 + brightness;
        
        // Set the new grayscale value to all channels
        data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newVal));
      }
      
      // Put the modified pixels back
      context.putImageData(imageData, 0, 0);
    } catch (e) {
      console.error("Error enhancing image:", e);
      // Continue without enhancement if it fails
    }
  };

  // Manual processing using canvas with enhanced image processing
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
      
      // Apply image enhancement for low light conditions
      enhanceCanvasForLowLight(context, canvas);
      
      // Convert canvas to a format ZXing can process
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      const binarizer = new HybridBinarizer(luminanceSource);
      const bitmap = new BinaryBitmap(binarizer);
      
      // Try different rotations if needed for difficult angles
      try {
        // Standard orientation first
        const result = codeReaderRef.current.decodeBitmap(bitmap);
        if (result) {
          const barcodeValue = result.getText();
          if (barcodeValue && barcodeValue.trim() !== '') {
            handleDetection(barcodeValue);
          }
          return;
        }
      } catch (err) {
        // Silent failure - try other orientations
      }
      
      // If standard orientation fails, we would ideally try different image processing
      // But additional processing attempts would be here
      
    } catch (err) {
      // Silent failure for this method as we're trying repeatedly
      // Most frames won't contain a valid barcode
    }
  };

  // Get camera constraints for highest available resolution
  const getCameraConstraints = () => {
    return {
      facingMode: { ideal: 'environment' }, // Use the back camera if available
      width: { ideal: 3840 }, // Request highest resolution possible (4K)
      height: { ideal: 2160 }, // The device will automatically adjust down if not supported
      frameRate: { ideal: 60 } // Request highest framerate for smooth scanning
    };
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

      // Request camera permission with highest possible resolution
      const constraints = {
        video: getCameraConstraints(),
        audio: false
      };
      
      console.log("Using camera constraints for highest available resolution:", constraints.video);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      setHasPermission(true);
      
      if (videoRef.current) {
        // Connect the stream to our video element
        videoRef.current.srcObject = stream;
        
        // Important: Set playsInline again programmatically
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        
        // Play the video and handle any errors
        videoRef.current.play().catch(e => {
          console.error("Video play error:", e);
          setError("Failed to start video stream: " + e.message);
        });
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;
          
          console.log("Video ready with dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          
          // Keep the video playing
          videoRef.current.play().catch(e => console.error("Video play retry error:", e));
          
          // Reset any previous scanning attempts
          if (codeReaderRef.current) {
            codeReaderRef.current.reset();
          }
          
          // Start continuous scanning with ZXing directly on video element
          try {
            codeReaderRef.current?.decodeFromVideoElement(videoRef.current)
              .then(result => {
                if (result) {
                  const barcodeValue = result.getText();
                  if (barcodeValue && barcodeValue.trim() !== '') {
                    handleDetection(barcodeValue);
                  }
                }
              })
              .catch(error => {
                // Silent failure - normal for frames without barcodes
                if (error.name !== 'NotFoundException') {
                  console.error("ZXing error:", error);
                }
                
                // Continue scanning if still active
                if (isScanning && videoRef.current && codeReaderRef.current) {
                  setTimeout(() => {
                    if (isScanning && videoRef.current && codeReaderRef.current) {
                      codeReaderRef.current.decodeFromVideoElement(videoRef.current)
                        .then(result => {
                          if (result) {
                            const barcodeValue = result.getText();
                            if (barcodeValue && barcodeValue.trim() !== '') {
                              handleDetection(barcodeValue);
                            }
                          }
                        })
                        .catch(() => {
                          // Continue scanning silently
                        });
                    }
                  }, 200);
                }
              });
          } catch (err) {
            console.error("Failed to start ZXing scanner:", err);
            // Fallback to canvas method only
          }
          
          // Backup method - process frames manually on an interval
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          
          scanIntervalRef.current = window.setInterval(() => {
            processVideoFrame();
            
            // Check if video is still playing and restart if needed
            if (videoRef.current && (videoRef.current.paused || videoRef.current.ended)) {
              videoRef.current.play().catch(e => console.error("Video auto-restart error:", e));
            }
          }, 100); // Faster scanning interval for quicker detection
        };
        
        // Add event listeners to handle video issues
        videoRef.current.onpause = () => {
          console.log("Video paused - attempting to resume");
          if (isScanning && videoRef.current) {
            videoRef.current.play().catch(e => console.error("Resume error:", e));
          }
        };
        
        videoRef.current.onended = () => {
          console.log("Video ended - attempting to restart");
          if (isScanning && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => console.error("Restart error:", e));
          }
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
    
    // Stop all tracks on the media stream but keep a reference temporarily
    const tempStream = streamRef.current;
    
    // Clear the video source
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    }
    
    // Now stop the tracks after clearing the video element
    if (tempStream) {
      const tracks = tempStream.getTracks();
      tracks.forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
    }
    
    // Finally clear the stream reference
    streamRef.current = null;
    
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
                  {/* Scanning animation elements */}
                  <div className="w-full h-1 bg-blue-500 opacity-70 animate-bounce"></div>
                  
                  {/* Target area border with enhanced visibility */}
                  <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-80">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
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
      
      {/* Hidden audio element for beep sound */}
      <audio ref={beepSoundRef} src={BEEP_SOUND_URL} style={{ display: 'none' }} />
    </>
  );
};

export default BarcodeScanner;
