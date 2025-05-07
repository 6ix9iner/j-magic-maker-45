
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { toast } from 'sonner';
import { 
  DYNAMSOFT_LICENSE_KEY, 
  BARCODE_READER_CONFIG, 
  initializeDynamsoft, 
  getReaderInstance, 
  cleanupDynamsoft 
} from '@/utils/dynamsoftConfig';

export interface ScanResult {
  code: string;
  symbology: string;
}

interface UseBarcodeScannerSDKProps {
  onScan: (code: string, symbology: string) => void;
}

// Extend MediaTrackCapabilities to include torch property
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

// Define types for missing methods in BarcodeScanner
interface BarcodeScannerExtended {
  isWorkerLoaded?: boolean;
  cleanFrameBuffer?: () => Promise<void>;
  getInstanceCount?: () => Promise<number>;
  preloadModule?: () => Promise<void>;
  isDesktopBrowser?: () => boolean;
}

// Track SDK initialization state globally
const globalState = {
  isInitializing: false,
  isInitialized: false,
  initPromise: null as Promise<boolean> | null,
  wasPreInitialized: false,
};

export const useBarcodeScannerSDK = ({ onScan }: UseBarcodeScannerSDKProps) => {
  const viewRef = useRef<HTMLDivElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isError, setIsError] = useState(false);
  const [cameraPermissions, setCameraPermissions] = useState<boolean | null>(null);
  
  // References to track SDK state
  const scannerRef = useRef<BarcodeScanner | null>(null);
  const isMountedRef = useRef(true);
  const requestInProgressRef = useRef(false);
  const initAttempts = useRef(0);

  // Pre-initialize the SDK but don't wait for completion
  const preInitialize = useCallback(async (): Promise<boolean> => {
    console.log('SDK: Pre-initializing...');
    
    // If already initialized or initializing, just return 
    if (globalState.isInitialized) {
      console.log('SDK: Already pre-initialized');
      return true;
    }
    
    if (globalState.isInitializing && globalState.initPromise) {
      console.log('SDK: Pre-initialization already in progress');
      return globalState.initPromise;
    }
    
    globalState.isInitializing = true;
    
    // Store promise so other components can await it
    globalState.initPromise = (async () => {
      try {
        // Set a shorter timeout for speed
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.log('SDK: Pre-init timeout - continuing anyway');
            globalState.isInitialized = true;
            return resolve(true); // Continue anyway
          }, 1000); // Reduced to 1 second
        });
        
        // Race between initialization and timeout
        const result = await Promise.race([
          initializeDynamsoft(),
          timeoutPromise
        ]);
        
        console.log('SDK: Pre-initialization complete');
        globalState.isInitialized = true;
        globalState.wasPreInitialized = true;
        return result;
      } catch (e) {
        console.warn('SDK: Pre-initialization failed but continuing:', e);
        globalState.isInitialized = true; // Consider it initialized to avoid retries
        return true; // Continue anyway
      } finally {
        globalState.isInitializing = false;
      }
    })();
    
    return globalState.initPromise;
  }, []);
  
  // Component lifecycle
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupScanner().catch(err => console.error("Cleanup error:", err));
    };
  }, []);

  // Explicitly request camera permission
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Camera permission request already in progress');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      console.log('SDK: Requesting camera permission explicitly...');
      
      // Force permission prompt with simpler constraints
      const constraints = {
        video: { 
          width: { ideal: 640 }, // Reduced size
          height: { ideal: 480 }
        },
        audio: false
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (stream) {
          // Release the stream immediately
          stream.getTracks().forEach(track => track.stop());
          console.log('SDK: Camera permission granted');
          setCameraPermissions(true);
          setIsError(false);
          return true;
        } else {
          console.error('SDK: Stream is null after permission grant');
          setCameraPermissions(false);
          return false;
        }
      } catch (err: any) {
        console.error('SDK: Failed to get camera permission:', err.name, err.message);
        // Log more specific error information
        if (err.name === 'NotAllowedError') {
          toast.error('Camera permission denied by user or system');
        } else if (err.name === 'NotFoundError') {
          toast.error('No camera found on this device');
        } else if (err.name === 'NotReadableError') {
          toast.error('Camera is already in use by another application');
        } else {
          toast.error(`Camera error: ${err.name}`);
        }
        
        setCameraPermissions(false);
        return false;
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, []);

  // Start the scanner with improved initialization
  const startScanner = useCallback(async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('SDK: Scanner request already in progress');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      console.log('SDK: Initializing scanner...');
      
      // First, check if viewRef.current exists
      if (!viewRef.current) {
        console.log('SDK: View reference not available');
        return false;
      }
      
      // First, make sure we have camera permissions
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        console.error("SDK: Camera permission denied");
        setIsError(true);
        return false;
      }
      
      // If SDK was already pre-initialized, use it - otherwise initialize now
      if (!globalState.wasPreInitialized) {
        try {
          // Use a shorter timeout for initialization (1s)
          const initPromise = initializeDynamsoft();
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              console.log("SDK: Init timed out, continuing anyway");
              resolve(true);
            }, 1000); // Reduced to 1 second 
          });
          
          await Promise.race([initPromise, timeoutPromise]);            
        } catch (error) {
          console.warn('SDK: Init error, will continue anyway:', error);
        }
      }
      
      // Create scanner if needed
      if (!scannerRef.current) {
        try {
          console.log('SDK: Creating scanner instance...');
          
          // Create fresh instance
          const scanner = await BarcodeScanner.createInstance();
          scannerRef.current = scanner;
          console.log('SDK: Scanner instance created successfully');
          
          // Configure scanner with optimized settings
          console.log('SDK: Configuring scanner settings...');
          const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
            (acc, cur) => acc | cur, 0
          );
          
          try {
            let settings = await scanner.getRuntimeSettings();
            settings.barcodeFormatIds = barcodeFormatIds;
            settings.deblurLevel = BARCODE_READER_CONFIG.deblurLevel;
            settings.timeout = BARCODE_READER_CONFIG.timeout; 
            await scanner.updateRuntimeSettings(settings);
          } catch (settingErr) {
            console.warn('SDK: Error updating runtime settings, continuing:', settingErr);
          }
          
          // Configure basic scanner options
          scanner.singleFrameMode = false;
          scanner.ifShowScanRegionMask = false;
          
          // Set video settings - optimized for faster startup with lower resolution
          try {
            await scanner.updateVideoSettings({
              video: {
                width: { ideal: 640 }, // Reduced from 1280
                height: { ideal: 480 }, // Reduced from 720
                facingMode: { ideal: 'environment' }
              }
            });
          } catch (e) {
            console.warn('SDK: Error setting video settings, continuing:', e);
          }
          
        } catch (error) {
          console.error('SDK: Failed to create scanner instance:', error);
          setIsError(true);
          return false;
        }
      }
      
      // Start the scanner
      try {
        console.log('SDK: Starting scanner...');
        
        // Get container
        if (!viewRef.current) {
          throw new Error('SDK: View container not available');
        }
        
        // Clear the view container first
        while (viewRef.current.firstChild) {
          viewRef.current.removeChild(viewRef.current.firstChild);
        }
        
        // Create video container with explicit dimensions
        const container = document.createElement('div');
        container.className = 'dce-video-container';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        viewRef.current.appendChild(container);
        
        // Set up scan callback - use a wrapper to prevent duplicates
        const scanResults = new Set();
        scannerRef.current.onFrameRead = (results) => {
          if (results.length > 0) {
            const firstResult = results[0];
            const resultText = firstResult.barcodeText;
            
            // Only call once per unique code
            if (!scanResults.has(resultText) && resultText) {
              scanResults.add(resultText);
              console.log('SDK: Barcode detected:', resultText);
              if (onScan) {
                onScan(resultText, firstResult.barcodeFormatString);
                
                // Clear cache after successful scan
                setTimeout(() => scanResults.clear(), 3000);
              }
            }
          }
        };
        
        // Set UI element with faster timeout
        await Promise.race([
          scannerRef.current.setUIElement(container),
          new Promise(r => setTimeout(r, 500)) // Continue after 500ms regardless
        ]);
        
        // Try to set scan settings
        try {
          await scannerRef.current.updateScanSettings({
            intervalTime: 50, // Reduced for faster scanning
            duplicateForgetTime: 1500 // Reduced for faster scanning
          });
        } catch (e) {
          console.warn('SDK: Error setting scan settings, continuing:', e);
        }
        
        // Open camera with parallel processing for speed
        console.log('SDK: Opening camera...');
        let cameraPromise = scannerRef.current.open();
        
        // While camera is opening, continue with other setup
        // Style video with high CSS specificity
        setTimeout(() => {
          try {
            const videoElements = document.querySelectorAll('.dce-video-container video');
            videoElements.forEach((video) => {
              const videoElement = video as HTMLVideoElement;
              videoElement.style.cssText = 'object-fit: cover !important; width: 100% !important; height: 100% !important; display: block !important;';
            });
          } catch (e) {
            console.warn('SDK: Video styling error, continuing:', e);
          }
        }, 100);
        
        // Use a timeout for camera opening - reduced to 1 second
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.log('SDK: Camera opening timed out, continuing...');
            resolve(true);
          }, 1000); // 1 second timeout as requested
        });
        
        await Promise.race([cameraPromise, timeoutPromise]);
        
        // Show scanner (continues even if camera is still opening)
        console.log('SDK: Showing scanner UI...');
        await scannerRef.current.show();
        
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsScanning(true);
          setIsError(false);
        }
        
        console.log('SDK: Scanner started successfully');
        return true;
      } catch (error) {
        console.error('SDK: Failed to start scanner:', error);
        setIsError(true);
        return false;
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [onScan, requestCameraPermission]);

  // Stop the scanner
  const stopScanner = useCallback(async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('SDK: Stop request already in progress');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      if (scannerRef.current) {
        console.log('SDK: Stopping scanner...');
        
        // Turn off torch if it's on
        if (isTorchOn) {
          try {
            await scannerRef.current.turnOffTorch();
            setIsTorchOn(false);
          } catch (e) {
            console.warn('SDK: Failed to turn off torch:', e);
          }
        }
        
        // Stop scanner if it's open
        try {
          if (scannerRef.current.isOpen) {
            console.log('SDK: Closing scanner...');
            // Remove callback first
            scannerRef.current.onFrameRead = undefined;
            scannerRef.current.onUnduplicatedRead = undefined;
            
            await scannerRef.current.stop();
            await scannerRef.current.hide();
            await scannerRef.current.close();
            console.log('SDK: Scanner closed successfully');
          }
        } catch (e) {
          console.warn('SDK: Error stopping scanner:', e);
        }
      }
      
      setIsScanning(false);
      return true;
    } catch (error) {
      console.error('SDK: Failed to stop scanner:', error);
      return false;
    } finally {
      requestInProgressRef.current = false;
    }
  }, [isTorchOn]);

  // Clean up scanner resources
  const cleanupScanner = useCallback(async () => {
    try {
      await stopScanner();
      
      if (scannerRef.current) {
        console.log('SDK: Cleaning up scanner resources...');
        try {
          await scannerRef.current.destroyContext();
          scannerRef.current = null;
        } catch (e) {
          console.warn('SDK: Failed to destroy scanner context:', e);
        }
      }
      
      // Also attempt global cleanup
      try {
        // Safely access extended property
        const extendedBarcodeScanner = BarcodeScanner as unknown as BarcodeScannerExtended;
        if (extendedBarcodeScanner.cleanFrameBuffer) {
          await extendedBarcodeScanner.cleanFrameBuffer();
        }
      } catch (e) {
        console.warn('SDK: Error cleaning frame buffer:', e);
      }
      
      setIsScanning(false);
      setIsTorchOn(false);
      setIsInitialized(false);
    } catch (error) {
      console.error('SDK: Failed to clean up scanner:', error);
    }
  }, [stopScanner]);

  // Toggle torch - IMPROVED to prevent scanner closing
  const toggleTorch = useCallback(async (): Promise<boolean | undefined> => {
    if (!scannerRef.current || !isScanning) {
      console.log('SDK: Cannot toggle torch when scanner is not active');
      return false;
    }
    
    try {
      console.log(`SDK: Toggling torch to ${!isTorchOn ? 'ON' : 'OFF'}`);
      
      // Toggle torch state
      if (!isTorchOn) {
        try {
          await scannerRef.current.turnOnTorch();
          setIsTorchOn(true);
          return true;
        } catch (err) {
          console.warn('SDK: Torch not supported or error:', err);
          // Don't throw - just return undefined
          return undefined;
        }
      } else {
        try {
          await scannerRef.current.turnOffTorch();
          setIsTorchOn(false);
          return false;
        } catch (err) {
          console.warn('SDK: Error turning torch off:', err);
          // Still update UI state
          setIsTorchOn(false);
          return false;
        }
      }
    } catch (error) {
      // Don't throw, just log and return undefined
      console.error('SDK: Failed to toggle torch:', error);
      return undefined;
    }
  }, [isScanning, isTorchOn]);

  // Set torch state directly
  const setTorchState = useCallback(async (state: boolean): Promise<boolean> => {
    if (!scannerRef.current || !isScanning) {
      console.log('SDK: Cannot set torch state when scanner is not active');
      return false;
    }
    
    try {
      console.log(`SDK: Setting torch state to ${state ? 'ON' : 'OFF'}`);
      
      // Set torch state - with better error handling
      try {
        if (state) {
          await scannerRef.current.turnOnTorch();
        } else {
          await scannerRef.current.turnOffTorch();
        }
        
        setIsTorchOn(state);
        return true;
      } catch (error) {
        console.error(`SDK: Failed to set torch state to ${state}:`, error);
        
        // Even if torch operation fails, don't close scanner
        // Just update the UI accordingly
        if (!state) {
          setIsTorchOn(false);
        }
        return false;
      }
    } catch (error) {
      console.error(`SDK: Failed to set torch state but not stopping scanner:`, error);
      return false;
    }
  }, [isScanning]);

  return {
    viewRef,
    isScanning,
    isTorchOn,
    isInitialized,
    isError,
    cameraPermissions,
    startScanner,
    stopScanner,
    toggleTorch,
    setTorchState,
    requestCameraPermission,
    cleanupScanner,
    preInitialize
  };
};
