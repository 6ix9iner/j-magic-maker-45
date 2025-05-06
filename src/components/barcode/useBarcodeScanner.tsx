
import { useState, useRef, useCallback, useEffect } from 'react';
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { 
  createBarcodeReaderConfig, 
  getCameraConstraints, 
  applyCameraSettings,
  BEEP_SOUND_URL,
  DYNAMSOFT_LICENSE_KEY
} from './BarcodeConfigUtils';

interface UseBarcodeScannerProps {
  onDetected: (result: string) => void;
}

export const useBarcodeScanner = ({ onDetected }: UseBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beepSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<DynamsoftScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectionRef = useRef<string | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  
  // Initialize Dynamsoft and audio
  useEffect(() => {
    // Set license key for Dynamsoft
    BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
    
    // Initialize audio element for beep sound
    beepSoundRef.current = new Audio(BEEP_SOUND_URL);
    beepSoundRef.current.volume = 1.0; // Maximum volume for the beep
    
    // Initialize Dynamsoft BarcodeScanner
    const initScanner = async () => {
      try {
        // Check browser compatibility
        // Dynamsoft doesn't have an isSupported static method, so we'll try to create an instance
        try {
          await DynamsoftScanner.createInstance();
          // If we get here, it's supported
        } catch (err) {
          throw new Error("Your browser doesn't support the scanner.");
        }
        
        // Get configuration
        const config = createBarcodeReaderConfig();
        
        // Configure Dynamsoft BarcodeScanner
        DynamsoftScanner.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
        
        // Use the BarcodeReader engine
        await BarcodeReader.loadWasm();
      } catch (err: any) {
        console.error("Failed to initialize barcode scanner:", err);
        setError(err.message || "Failed to initialize scanner");
      }
    };
    
    initScanner();
    
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
      // Attempt multiple times to play the sound
      const playBeep = () => {
        beepSoundRef.current?.play()
          .catch(e => {
            console.error("Error playing sound:", e);
            // Try again which may have initial audio issues
            setTimeout(() => {
              beepSoundRef.current?.play().catch(() => console.log("Retry failed"));
            }, 100);
          });
      };
      
      playBeep();
      // Vibrate the device for better feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
    
    // Notify about the detection
    console.log("Barcode detected:", barcodeValue);
    onDetected(barcodeValue);
    stopScanning();
  }, [onDetected]);

  // Toggle scanner
  const startScanning = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      // First check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera access");
      }

      // Create and configure a scanner if we don't have one
      if (!scannerRef.current) {
        const scanner = await DynamsoftScanner.createInstance();
        
        // Configure scanner
        const config = createBarcodeReaderConfig();
        await scanner.updateRuntimeSettings("speed");
        
        // Set formats to decode
        if (config.barcodeFormats && config.barcodeFormats.length > 0) {
          const formatSettings = config.barcodeFormats.join(';');
          await scanner.updateRuntimeSettings({
            barcodeFormatIds: formatSettings,
            timeout: config.timeout
          });
        }
        
        // Set up detection callback
        scanner.onUniqueRead = (txt, result) => {
          handleDetection(txt);
        };
        
        scannerRef.current = scanner;
      }
      
      // Get video element and start scanning
      if (videoRef.current && scannerRef.current) {
        // Open camera with proper settings
        await scannerRef.current.setUIElement(videoRef.current);
        
        // Set camera constraints
        const constraints = getCameraConstraints();
        await scannerRef.current.updateVideoSettings({
          video: constraints
        });
        
        // Start scanning
        await scannerRef.current.open();
        
        // Get the stream for camera controls
        // Fix: Access video track from MediaStream instead of using getVideoTrack()
        // First get the video element that the scanner is using
        const videoElement = videoRef.current;
        if (videoElement && videoElement.srcObject) {
          // Get the MediaStream from the video element
          const mediaStream = videoElement.srcObject as MediaStream;
          // Get the video track from the MediaStream
          const videoTrack = mediaStream.getVideoTracks()[0];
          if (videoTrack) {
            streamRef.current = new MediaStream([videoTrack]);
            
            // Apply any zoom settings
            await applyCameraSettings(videoTrack, zoom);
          }
        }
        
        setHasPermission(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(err.message || "Failed to access camera");
      setHasPermission(false);
      setIsScanning(false);
    }
  }, [zoom, handleDetection]);

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
        await applyCameraSettings(track, newZoom);
      }
    }
  }, [zoom, isScanning]);

  const stopScanning = useCallback(async () => {
    console.log("Stopping scanner...");
    
    // Close the scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.close();
      } catch (e) {
        console.error("Error closing scanner:", e);
      }
    }
    
    // Clear the video source
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    }
    
    // Also stop any stream tracks we have
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
  }, []);

  // Toggle focus mode - removed as Dynamsoft handles focus automatically
  const toggleFocusMode = useCallback(() => {
    // This is a no-op with Dynamsoft, but kept for UI consistency
    console.log("Focus mode toggling not needed with Dynamsoft");
  }, []);

  return {
    videoRef,
    canvasRef,
    beepSoundRef,
    isScanning,
    error,
    hasPermission,
    zoom,
    focusMode: "auto", // Dynamsoft handles focus automatically
    startScanning,
    stopScanning,
    adjustZoom,
    toggleFocusMode,
    hasVideoFeed: Boolean(videoRef.current?.srcObject) || isScanning
  };
};
