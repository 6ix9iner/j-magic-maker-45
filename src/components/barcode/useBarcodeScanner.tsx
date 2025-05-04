import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, HTMLCanvasElementLuminanceSource } from '@zxing/library';
import { 
  createBarcodeReaderHints, 
  getCameraConstraints, 
  applyCameraSettings,
  BEEP_SOUND_URL 
} from './BarcodeConfigUtils';
import { 
  enhanceCanvasForBlurryBarcodes,
  tryMultipleBinarizers,
  processImageSections 
} from './BarcodeProcessingUtils';

interface UseBarcodeScannerProps {
  onDetected: (result: string) => void;
}

export const useBarcodeScanner = ({ onDetected }: UseBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beepSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectionRef = useRef<string | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState<string>("continuous");
  
  // Initialize barcode reader and audio
  useEffect(() => {
    // Initialize audio element for beep sound - louder volume for Samsung devices
    beepSoundRef.current = new Audio(BEEP_SOUND_URL);
    beepSoundRef.current.volume = 1.0; // Maximum volume for the beep
    
    // Initialize barcode reader with hints
    const hints = createBarcodeReaderHints();
    const codeReader = new BrowserMultiFormatReader(hints, 3000); 
    codeReaderRef.current = codeReader;

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
  }, [onDetected]);

  // Process a video frame to detect barcodes
  const processVideoFrame = useCallback(() => {
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
      let barcodeValue = tryMultipleBinarizers(luminanceSource, codeReaderRef.current);
      
      if (barcodeValue && barcodeValue.trim() !== '') {
        handleDetection(barcodeValue);
        return;
      }
      
      // Second attempt: Enhanced processing for blurry codes
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      enhanceCanvasForBlurryBarcodes(context, canvas);
      const enhancedLuminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      barcodeValue = tryMultipleBinarizers(enhancedLuminanceSource, codeReaderRef.current);
      
      if (barcodeValue && barcodeValue.trim() !== '') {
        handleDetection(barcodeValue);
        return;
      }
      
      // Third attempt: Try with different sections of the image
      barcodeValue = processImageSections(video, canvas, context, codeReaderRef.current);
      if (barcodeValue) {
        handleDetection(barcodeValue);
      }
    } catch (err) {
      // Silent failure for this method as we're trying repeatedly
      // Most frames won't contain a valid barcode
    }
  }, [handleDetection]);

  // Toggle between focus modes
  const toggleFocusMode = useCallback(async () => {
    const nextMode = focusMode === 'continuous' ? 'manual' : 'continuous';
    setFocusMode(nextMode);
    
    // Apply new focus mode immediately if scanning
    if (isScanning && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        await applyCameraSettings(track, zoom, nextMode);
      }
    }
  }, [focusMode, zoom, isScanning]);

  // Adjust zoom level
  const adjustZoom = useCallback(async (increment: boolean) => {
    const newZoom = increment 
      ? Math.min(zoom + 0.5, 5) // Max zoom 5x
      : Math.max(zoom - 0.5, 1); // Min zoom 1x
      
    setZoom(newZoom);
    
    // Apply new zoom immediately if scanning
    if (isScanning && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        await applyCameraSettings(track, newZoom, focusMode);
      }
    }
  }, [zoom, focusMode, isScanning]);

  const startScanning = useCallback(async () => {
    if (!codeReaderRef.current) return;
    
    setIsScanning(true);
    setError(null);
    
    try {
      // First check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera access");
      }

      // Properly structure the MediaStreamConstraints
      const constraints: MediaStreamConstraints = {
        video: getCameraConstraints(zoom, focusMode),
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
        await applyCameraSettings(stream.getVideoTracks()[0], zoom, focusMode);
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = async () => {
          if (!videoRef.current) return;
          
          console.log("Video ready with dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          
          // Keep the video playing
          videoRef.current.play().catch(e => console.error("Video play retry error:", e));
          
          // Apply focus settings again after video is loaded
          await applyCameraSettings(stream.getVideoTracks()[0], zoom, focusMode);
          
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
  }, [zoom, focusMode, handleDetection, processVideoFrame]);

  const stopScanning = useCallback(() => {
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
  }, []);

  return {
    videoRef,
    canvasRef,
    beepSoundRef,
    isScanning,
    error,
    hasPermission,
    zoom,
    focusMode,
    startScanning,
    stopScanning,
    adjustZoom,
    toggleFocusMode,
    hasVideoFeed: Boolean(videoRef.current?.srcObject)
  };
};
