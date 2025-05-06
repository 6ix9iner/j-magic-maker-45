
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
  
  // Pre-initialize Dynamsoft when component mounts
  useEffect(() => {
    console.log('SDK: Attempting pre-initialization...');
    const initSDK = async () => {
      try {
        await initializeDynamsoft();
        console.log('SDK: Pre-initialization successful');
      } catch (error) {
        console.warn('SDK: Pre-initialization failed, will retry later:', error);
      }
    };
    
    // Start initialization earlier
    setTimeout(initSDK, 100);
    
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
          width: { ideal: 640 },
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
    if (!viewRef.current) {
      console.log('SDK: View reference not available');
      return false;
    }
    
    if (requestInProgressRef.current) {
      console.log('SDK: Scanner request already in progress');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      console.log('SDK: Initializing scanner...');
      
      // Always initialize the SDK first - with faster timeouts
      try {
        console.log('SDK: Ensuring Dynamsoft is initialized...');
        // Use a shorter timeout for initialization
        const initPromise = initializeDynamsoft();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("SDK init timeout")), 5000);
        });
        
        await Promise.race([initPromise, timeoutPromise])
          .catch(async () => {
            console.log('SDK: Initialization timed out, using existing instance');
            // Continue anyway as the pre-init might have succeeded
          });
          
        initAttempts.current = 0;
        console.log('SDK: Dynamsoft initialized successfully');
      } catch (error) {
        console.error('SDK: Failed to initialize Dynamsoft:', error);
        initAttempts.current += 1;
        
        if (initAttempts.current >= 3) {
          setIsError(true);
          return false;
        }
        
        // Try reinitializing with a delay
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
        try {
          console.log('SDK: Retrying Dynamsoft initialization...');
          await initializeDynamsoft();
        } catch (retryError) {
          console.error('SDK: Retry failed to initialize Dynamsoft:', retryError);
          setIsError(true);
          return false;
        }
      }
      
      // Create scanner if needed
      if (!scannerRef.current) {
        try {
          console.log('SDK: Creating scanner instance...');
          
          // Release any existing instances first
          try {
            // Safely check and use extended properties
            const extendedBarcodeScanner = BarcodeScanner as unknown as BarcodeScannerExtended;
            
            if (extendedBarcodeScanner.isWorkerLoaded) {
              console.log('SDK: Cleaning up existing scanner instances...');
              if (extendedBarcodeScanner.cleanFrameBuffer) {
                await extendedBarcodeScanner.cleanFrameBuffer();
              }
              if (extendedBarcodeScanner.getInstanceCount) {
                const allInstances = await extendedBarcodeScanner.getInstanceCount();
                console.log(`SDK: Found ${allInstances} existing scanner instances`);
              }
            }
          } catch (e) {
            console.warn('SDK: Error during cleanup:', e);
          }
          
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
            console.warn('SDK: Error updating runtime settings:', settingErr);
          }
          
          // Configure basic scanner options
          scanner.singleFrameMode = false;
          scanner.ifShowScanRegionMask = false;
          
          // Set video settings - optimized for faster startup
          try {
            await scanner.updateVideoSettings({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: { ideal: 'environment' }
              }
            });
          } catch (e) {
            console.warn('SDK: Error setting video settings:', e);
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
        
        // Set UI element
        await scannerRef.current.setUIElement(container);
        
        // Try to set scan settings
        try {
          await scannerRef.current.updateScanSettings({
            intervalTime: 100,
            duplicateForgetTime: 3000
          });
        } catch (e) {
          console.warn('SDK: Error setting scan settings:', e);
        }
        
        // Open camera with faster timeout
        console.log('SDK: Opening camera...');
        try {
          // Set a timeout for camera opening
          const openPromise = scannerRef.current.open();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Camera opening timeout")), 7000);
          });
          
          await Promise.race([openPromise, timeoutPromise])
            .catch((err) => {
              console.warn('SDK: Camera opening timed out:', err);
              // We'll still try to proceed, as the camera might still open
            });
        } catch (e) {
          console.warn('SDK: Error opening camera, will continue:', e);
        }
        
        // Style video with high CSS specificity
        setTimeout(() => {
          try {
            const videoElements = document.querySelectorAll('.dce-video-container video');
            videoElements.forEach((video) => {
              const videoElement = video as HTMLVideoElement;
              videoElement.style.cssText = 'object-fit: cover !important; width: 100% !important; height: 100% !important; display: block !important;';
            });
          } catch (e) {
            console.warn('SDK: Video styling error:', e);
          }
        }, 100);
        
        // Show scanner
        console.log('SDK: Showing scanner UI...');
        await scannerRef.current.show();
        console.log('SDK: Scanner started successfully');
        
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsScanning(true);
          setIsError(false);
        }
        
        return true;
      } catch (error) {
        console.error('SDK: Failed to start scanner:', error);
        setIsError(true);
        return false;
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [onScan]);

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
  const toggleTorch = useCallback(async (): Promise<boolean> => {
    if (!scannerRef.current || !isScanning) {
      console.log('SDK: Cannot toggle torch when scanner is not active');
      return false;
    }
    
    try {
      console.log(`SDK: Toggling torch to ${!isTorchOn ? 'ON' : 'OFF'}`);
      
      // Check if torch is supported - with error handling
      let torchSupported = false;
      try {
        const capabilities = await scannerRef.current.getCapabilities();
        const extendedCapabilities = capabilities as ExtendedMediaTrackCapabilities;
        torchSupported = !!extendedCapabilities?.torch;
        
        if (!torchSupported) {
          console.log('SDK: Torch not supported on this device/browser');
          throw new Error('Torch not supported');
        }
      } catch (capError) {
        console.warn('SDK: Error checking torch capabilities:', capError);
        // Don't throw here - fallback to try/catch during actual torch operation
      }
      
      // Toggle torch - with better error handling
      let torchSuccess = false;
      if (!isTorchOn) {
        // Wrap in try/catch and don't throw
        try {
          await scannerRef.current.turnOnTorch();
          torchSuccess = true;
        } catch (err) {
          console.warn('SDK: Failed to turn torch on:', err);
          throw new Error('Failed to turn on torch');
        }
      } else {
        try {
          await scannerRef.current.turnOffTorch();
          torchSuccess = true;
        } catch (err) {
          console.warn('SDK: Failed to turn torch off:', err);
          // Still update UI state even if operation fails
        }
      }
      
      // Only update state if successful or turning off
      const newState = torchSuccess ? !isTorchOn : false;
      setIsTorchOn(newState);
      return newState;
    } catch (error) {
      // Log error but don't stop scanner
      console.error('SDK: Failed to toggle torch but not stopping scanner:', error);
      toast.error("Torch not available on this device");
      return false;
    }
  }, [isScanning, isTorchOn]);

  // Set torch state directly - with improved error handling
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
    cleanupScanner
  };
};
