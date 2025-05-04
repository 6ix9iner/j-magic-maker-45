import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  BrowserMultiFormatReader, 
  DecodeHintType, 
  BarcodeFormat,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer
} from '@zxing/library';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScanBarcode, Loader, ZoomIn, ZoomOut, Focus } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState<string>("continuous");
  const focusModes = ["continuous", "manual"];

  useEffect(() => {
    // Initialize audio element for beep sound - louder volume for Samsung devices
    beepSoundRef.current = new Audio(BEEP_SOUND_URL);
    beepSoundRef.current.volume = 1.0; // Maximum volume for the beep
    
    // Initialize the barcode reader with hints optimized for blurry images
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
      BarcodeFormat.AZTEC,
      BarcodeFormat.ITF,  // Added for industrial barcodes
      BarcodeFormat.CODABAR, // Added for legacy systems
      BarcodeFormat.MAXICODE // Added for shipping labels
    ]);

    // Additional hints for better performance
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);
    // Allow pure barcode scanning (no background)
    hints.set(DecodeHintType.PURE_BARCODE, true);
    // Character set
    hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
    
    // Increase timeout for more reliable detection, especially on Samsung devices
    const codeReader = new BrowserMultiFormatReader(hints, 3000); 
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
      // Attempt multiple times to play the sound (common issue on Samsung)
      const playBeep = () => {
        beepSoundRef.current?.play()
          .catch(e => {
            console.error("Error playing sound:", e);
            // Try again for Samsung devices which may have initial audio issues
            setTimeout(() => {
              beepSoundRef.current?.play().catch(() => console.log("Retry failed"));
            }, 100);
          });
      };
      
      playBeep();
      // Vibrate the device - better feedback for Samsung phones
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
    
    // Notify about the detection
    console.log("Barcode detected:", barcodeValue);
    onDetected(barcodeValue);
    stopScanning();
    toast.success("Barcode detected!");
  }, [onDetected]);

  // Apply advanced image processing for blurry barcodes
  const enhanceCanvasForBlurryBarcodes = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    try {
      // Get the image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Samsung S10 optimizations - more aggressive contrast enhancement
      const contrast = 1.8; // Higher contrast for Samsung screens
      const brightness = 15; // Higher brightness for better visibility
      const threshold = 128; // Mid-point for thresholding
      
      // Apply multi-stage image processing
      for (let i = 0; i < data.length; i += 4) {
        // Step 1: Convert to grayscale with optimal weights for Samsung displays
        const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        
        // Step 2: Apply contrast and brightness adjustments
        let newVal = (gray - threshold) * contrast + threshold + brightness;
        
        // Step 3: Apply adaptive thresholding based on local area
        if (i % (canvas.width * 16) === 0) { // Sample every few rows for performance
          // Check for areas that might contain barcodes (high contrast regions)
          let localContrast = 0;
          for (let j = -8; j <= 8; j += 2) {
            if (i + j * 4 >= 0 && i + j * 4 < data.length) {
              localContrast += Math.abs(data[i + j * 4] - data[i]);
            }
          }
          
          // In high contrast areas (likely barcode regions), increase sharpness
          if (localContrast > 200) {
            newVal = newVal > threshold ? 255 : 0; // Binary threshold for barcode-like areas
          }
        }
        
        // Apply the enhanced values
        data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newVal));
      }
      
      // Put the modified pixels back
      context.putImageData(imageData, 0, 0);
      
      // For debugging - capture processed frames occasionally
      if (Math.random() < 0.01) { // 1% of frames
        console.log("Enhanced frame for blur reduction applied");
      }
    } catch (e) {
      console.error("Error enhancing image:", e);
      // Continue without enhancement if it fails
    }
  };
  
  // Try different binarizer methods for better barcode detection
  const tryMultipleBinarizers = (luminanceSource: HTMLCanvasElementLuminanceSource) => {
    try {
      // Try HybridBinarizer first (good for most cases)
      const hybridBinarizer = new HybridBinarizer(luminanceSource);
      const hybridBitmap = new BinaryBitmap(hybridBinarizer);
      
      try {
        if (codeReaderRef.current) {
          const result = codeReaderRef.current.decodeBitmap(hybridBitmap);
          if (result) {
            return result.getText();
          }
        }
      } catch (err) {
        // Silent failure - try other method
      }
      
      // Fall back to GlobalHistogramBinarizer (sometimes better for blurry codes)
      const histogramBinarizer = new GlobalHistogramBinarizer(luminanceSource);
      const histogramBitmap = new BinaryBitmap(histogramBinarizer);
      
      if (codeReaderRef.current) {
        try {
          const result = codeReaderRef.current.decodeBitmap(histogramBitmap);
          if (result) {
            return result.getText();
          }
        } catch (err) {
          // Silent failure
        }
      }
      
      return null; // No barcode found with either method
    } catch (err) {
      return null;
    }
  };

  // Process multiple video frames with different enhancement techniques
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
      
      // Try multiple processing techniques for better results
      
      // First attempt: Standard processing
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      let barcodeValue = tryMultipleBinarizers(luminanceSource);
      
      if (barcodeValue && barcodeValue.trim() !== '') {
        handleDetection(barcodeValue);
        return;
      }
      
      // Second attempt: Enhanced processing for blurry codes
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      enhanceCanvasForBlurryBarcodes(context, canvas);
      const enhancedLuminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      barcodeValue = tryMultipleBinarizers(enhancedLuminanceSource);
      
      if (barcodeValue && barcodeValue.trim() !== '') {
        handleDetection(barcodeValue);
        return;
      }
      
      // Third attempt: Try with different sections of the image
      // This helps with partially visible or angled barcodes
      const sections = [
        { x: 0, y: 0, w: canvas.width, h: canvas.height/2 },
        { x: 0, y: canvas.height/2, w: canvas.width, h: canvas.height/2 },
        { x: 0, y: 0, w: canvas.width/2, h: canvas.height },
        { x: canvas.width/2, y: 0, w: canvas.width/2, h: canvas.height },
        { x: canvas.width/4, y: canvas.height/4, w: canvas.width/2, h: canvas.height/2 }
      ];
      
      for (const section of sections) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          video, 
          section.x, section.y, section.w, section.h,
          0, 0, canvas.width, canvas.height
        );
        enhanceCanvasForBlurryBarcodes(context, canvas);
        const sectionLuminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
        barcodeValue = tryMultipleBinarizers(sectionLuminanceSource);
        
        if (barcodeValue && barcodeValue.trim() !== '') {
          handleDetection(barcodeValue);
          return;
        }
      }
      
    } catch (err) {
      // Silent failure for this method as we're trying repeatedly
      // Most frames won't contain a valid barcode
    }
  };

  // Get camera constraints optimized for Samsung S10
  const getCameraConstraints = () => {
    // Fixed: Corrected the structure for MediaTrackConstraints
    return {
      facingMode: { exact: 'environment' }, // Force back camera only for better results
      width: { ideal: 3840 }, // Request 4K resolution
      height: { ideal: 2160 },
      frameRate: { ideal: 30, min: 15 }, // Balanced framerate for processing
      // Set individual properties directly - not using advanced array
      zoom: zoom,
      focusMode: focusMode === 'continuous' ? 'continuous' : 'manual',
      autoFocus: focusMode === 'continuous' ? true : false,
      whiteBalance: 'continuous',
      exposureMode: 'continuous'
    };
  };

  // Set camera focus - especially useful for Samsung devices
  const setFocusOnCamera = async () => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      
      const capabilities = track.getCapabilities();
      console.log("Camera capabilities:", capabilities);
      
      // Fixed: Using proper constraints structure for specific capabilities
      if ('focusMode' in capabilities) {
        // Apply focus mode directly as constraint
        await track.applyConstraints({ 
          focusMode: focusMode === 'continuous' ? 'continuous' : 'manual'
        });
        console.log(`Focus set to ${focusMode} mode`);
      }
      
      if ('zoom' in capabilities) {
        // Apply zoom directly as constraint
        await track.applyConstraints({ zoom });
        console.log(`Zoom set to ${zoom}x`);
      }
    } catch (err) {
      console.error("Error setting camera parameters:", err);
    }
  };

  // Toggle between focus modes
  const toggleFocusMode = async () => {
    const nextMode = focusMode === 'continuous' ? 'manual' : 'continuous';
    setFocusMode(nextMode);
    
    // Apply new focus mode immediately if scanning
    if (isScanning) {
      await setFocusOnCamera();
    }
  };

  // Adjust zoom level
  const adjustZoom = async (increment: boolean) => {
    const newZoom = increment 
      ? Math.min(zoom + 0.5, 5) // Max zoom 5x
      : Math.max(zoom - 0.5, 1); // Min zoom 1x
      
    setZoom(newZoom);
    
    // Apply new zoom immediately if scanning
    if (isScanning) {
      await setFocusOnCamera();
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

      // Fixed: Properly structure the MediaStreamConstraints
      const constraints: MediaStreamConstraints = {
        video: getCameraConstraints(),
        audio: false
      };
      
      console.log("Using camera constraints for Samsung S10:", constraints.video);
      
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
        
        // Apply focus settings immediately
        await setFocusOnCamera();
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = async () => {
          if (!videoRef.current) return;
          
          console.log("Video ready with dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          
          // Keep the video playing
          videoRef.current.play().catch(e => console.error("Video play retry error:", e));
          
          // Apply focus settings again after video is loaded
          await setFocusOnCamera();
          
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
          
          // Use faster scanning interval (60ms ≈ 16fps) for Samsung phones
          scanIntervalRef.current = window.setInterval(() => {
            processVideoFrame();
            
            // Check if video is still playing and restart if needed
            if (videoRef.current && (videoRef.current.paused || videoRef.current.ended)) {
              videoRef.current.play().catch(e => console.error("Video auto-restart error:", e));
            }
          }, 60);
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
                  {/* Scanning animation with prominent Samsung-friendly colors */}
                  <div className="w-full h-1.5 bg-blue-600 opacity-80 animate-bounce"></div>
                  
                  {/* Target area border with enhanced visibility for Samsung screens */}
                  <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-90">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 px-4 py-1 rounded-full text-white text-xs">
                    {focusMode === 'continuous' ? 'Auto Focus' : 'Manual Focus'} | Zoom: {zoom}x
                  </div>
                </div>
                
                {/* Camera controls - optimized for Samsung */}
                <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-4 z-10">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon"
                          onClick={() => adjustZoom(false)}
                          className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                        >
                          <ZoomOut className="w-5 h-5 text-white" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Zoom Out</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon"
                          onClick={toggleFocusMode}
                          className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                        >
                          <Focus className="w-5 h-5 text-white" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle Focus Mode</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon"
                          onClick={() => adjustZoom(true)}
                          className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                        >
                          <ZoomIn className="w-5 h-5 text-white" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Zoom In</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            
            <p className="text-sm text-center text-gray-600">
              Position barcode within the frame. Adjust zoom for blurry codes.
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
