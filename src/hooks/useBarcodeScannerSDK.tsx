
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { toast } from 'sonner';
import { 
  DYNAMSOFT_LICENSE_KEY, 
  BARCODE_READER_CONFIG, 
  initializeDynamsoft, 
  getReaderInstance, 
  cleanupDynamsoft,
  ensureLicenseIsSet
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
  permissionInProgress: false
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-initialize the SDK but don't wait for completion
  const preInitialize = useCallback(async (): Promise<boolean> => {
    console.log('SDK: Pre-initializing...');
    
    // First, ensure license is set properly
    ensureLicenseIsSet();
    
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
        // Set an extremely short timeout for speed
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.log('SDK: Pre-init timeout - continuing anyway');
            globalState.isInitialized = true;
            return resolve(true); // Continue anyway
          }, 500); // 500ms (reduced from 1000ms)
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
    // Make sure license is set first thing
    ensureLicenseIsSet();
    
    // Start pre-initialization immediately
    preInitialize().catch(e => console.warn("Pre-init warning:", e));
    
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cleanupScanner().catch(err => console.warn("Cleanup warning:", err));
    };
  }, [preInitialize]);

  // Explicitly request camera permission
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (globalState.permissionInProgress) {
      console.log('Camera permission request already in progress');
      return false;
    }
    
    globalState.permissionInProgress = true;
    
    try {
      console.log('SDK: Requesting camera permission explicitly...');
      
      // Force permission prompt with simpler constraints for speed
      const constraints = {
        video: { 
          width: { ideal: 480 }, // Reduced size even further
          height: { ideal: 360 }
        },
        audio: false
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (stream) {
          // Release the stream immediately
          stream.getTracks().forEach(track => track.stop());
          console.log('SDK: Camera permission granted');
          
          if (isMountedRef.current) {
            setCameraPermissions(true);
            setIsError(false);
          }
          return true;
        } else {
          console.error('SDK: Stream is null after permission grant');
          if (isMountedRef.current) {
            setCameraPermissions(false);
          }
          return false;
        }
      } catch (err: any) {
        console.error('SDK: Failed to get camera permission:', err.name, err.message);
        // Log more specific error information but don't show toast during pre-init
        if (isMountedRef.current) {
          setCameraPermissions(false);
        }
        return false;
      }
    } finally {
      globalState.permissionInProgress = false;
    }
  }, []);

  // Start the scanner with improved initialization (enforcing 1 sec total timeout)
  const startScanner = useCallback(async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('SDK: Scanner request already in progress');
      return false;
    }
    
    // Set master timeout for the entire operation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const masterTimeout = setTimeout(() => {
      console.log('SDK: Global scanner timeout reached');
      requestInProgressRef.current = false;
      if (isMountedRef.current) {
        setIsError(true);
      }
    }, 1000); // Strict 1 second total timeout
    
    timeoutRef.current = masterTimeout as unknown as NodeJS.Timeout;
    requestInProgressRef.current = true;
    
    try {
      console.log('SDK: Initializing scanner...');
      
      // Parallel operations for speed
      const permissionPromise = requestCameraPermission();
      const initPromise = preInitialize();
      
      // Run permission check and initialization in parallel with short timeouts
      const permissionTimeoutPromise = new Promise<boolean>(resolve => {
        setTimeout(() => {
          console.log('SDK: Permission check timed out');
          resolve(false);
        }, 200); // 200ms for permission check
      });
      
      // Run both operations in parallel
      const [hasPermission] = await Promise.all([
        Promise.race([permissionPromise, permissionTimeoutPromise]),
        Promise.race([initPromise, new Promise<boolean>(r => setTimeout(() => r(true), 300))])
      ]);
      
      if (!hasPermission) {
        console.error("SDK: Camera permission denied or timed out");
        if (isMountedRef.current) {
          setIsError(true);
        }
        return false;
      }
      
      // Check if viewRef is available - fail fast
      if (!viewRef.current) {
        console.error('SDK: View reference not available');
        if (isMountedRef.current) {
          setIsError(true);
        }
        return false;
      }
      
      // Create scanner if needed
      if (!scannerRef.current) {
        try {
          console.log('SDK: Creating scanner instance...');
          
          // Create fresh instance with timeout
          const createPromise = BarcodeScanner.createInstance();
          const createTimeoutPromise = new Promise<BarcodeScanner>((_, reject) => {
            setTimeout(() => reject(new Error("Create scanner timed out")), 300);
          });
          
          try {
            scannerRef.current = await Promise.race([createPromise, createTimeoutPromise]);
          } catch (e) {
            console.error('SDK: Scanner creation timed out or failed:', e);
            if (isMountedRef.current) {
              setIsError(true);
            }
            return false;
          }
          
          console.log('SDK: Scanner instance created');
          
          // Configure scanner with minimal settings for speed
          const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
            (acc, cur) => acc | cur, 0
          );
          
          try {
            // Minimal settings update with timeout
            const settingsPromise = (async () => {
              let settings = await scannerRef.current!.getRuntimeSettings();
              settings.barcodeFormatIds = barcodeFormatIds;
              settings.deblurLevel = BARCODE_READER_CONFIG.deblurLevel;
              settings.timeout = BARCODE_READER_CONFIG.timeout;
              await scannerRef.current!.updateRuntimeSettings(settings);
            })();
            
            await Promise.race([
              settingsPromise,
              new Promise(r => setTimeout(r, 100))
            ]);
          } catch (settingErr) {
            console.warn('SDK: Error updating runtime settings, continuing:', settingErr);
          }
          
          // Configure basic scanner options for speed
          scannerRef.current.singleFrameMode = false;
          scannerRef.current.ifShowScanRegionMask = false;
          
          // Set minimal video settings for faster startup
          try {
            await Promise.race([
              scannerRef.current.updateVideoSettings({
                video: {
                  width: { ideal: 480 },
                  height: { ideal: 360 },
                  facingMode: { ideal: 'environment' }
                }
              }),
              new Promise(r => setTimeout(r, 100))
            ]);
          } catch (e) {
            console.warn('SDK: Error setting video settings, continuing:', e);
          }
        } catch (error) {
          console.error('SDK: Failed to create scanner instance:', error);
          if (isMountedRef.current) {
            setIsError(true);
          }
          return false;
        }
      }
      
      // Start the scanner
      try {
        console.log('SDK: Starting scanner...');
        
        // Check view container again
        if (!viewRef.current) {
          console.error('SDK: View container lost during initialization');
          if (isMountedRef.current) {
            setIsError(true);
          }
          return false;
        }
        
        // Clear the view container first to avoid duplicate elements
        while (viewRef.current.firstChild) {
          viewRef.current.removeChild(viewRef.current.firstChild);
        }
        
        // Create video container
        const container = document.createElement('div');
        container.className = 'dce-video-container';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        viewRef.current.appendChild(container);
        
        // Set up scan callback to avoid duplicates
        const scanResults = new Set();
        scannerRef.current.onFrameRead = (results) => {
          if (results.length > 0) {
            const firstResult = results[0];
            const resultText = firstResult.barcodeText;
            
            // Only call once per unique code
            if (!scanResults.has(resultText) && resultText) {
              scanResults.add(resultText);
              console.log('SDK: Barcode detected:', resultText);
              if (onScan && isMountedRef.current) {
                onScan(resultText, firstResult.barcodeFormatString);
                setTimeout(() => scanResults.clear(), 3000);
              }
            }
          }
        };
        
        // Set UI element with faster timeout
        await Promise.race([
          scannerRef.current.setUIElement(container),
          new Promise(r => setTimeout(r, 100))
        ]);
        
        // Faster scan settings
        try {
          await Promise.race([
            scannerRef.current.updateScanSettings({
              intervalTime: 40,
              duplicateForgetTime: 1000
            }),
            new Promise(r => setTimeout(r, 100))
          ]);
        } catch (e) {
          console.warn('SDK: Error setting scan settings, continuing:', e);
        }
        
        // Open camera immediately with strict timeout
        console.log('SDK: Opening camera...');
        try {
          await Promise.race([
            scannerRef.current.open(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Camera open timeout")), 300))
          ]);
        } catch (e) {
          console.warn('SDK: Camera opening warning, continuing:', e);
        }
        
        // Style video elements
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
        }, 50);
        
        // Show scanner - continue even if still loading
        console.log('SDK: Showing scanner UI...');
        
        try {
          await Promise.race([
            scannerRef.current.show(),
            new Promise(r => setTimeout(r, 100))
          ]);
        } catch (e) {
          console.warn('SDK: Show scanner UI warning, continuing:', e);
        }
        
        // Mark as initialized and scanning
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsScanning(true);
          setIsError(false);
        }
        
        console.log('SDK: Scanner started successfully');
        
        // Clear the master timeout as we've succeeded
        if (timeoutRef.current === masterTimeout) {
          clearTimeout(masterTimeout);
          timeoutRef.current = null;
        }
        
        return true;
      } catch (error) {
        console.error('SDK: Failed to start scanner:', error);
        if (isMountedRef.current) {
          setIsError(true);
        }
        return false;
      }
    } catch (e) {
      console.error('SDK: Scanner error:', e);
      if (isMountedRef.current) {
        setIsError(true);
      }
      return false;
    } finally {
      // Clear timeout and reset flag
      if (timeoutRef.current === masterTimeout) {
        clearTimeout(masterTimeout);
        timeoutRef.current = null;
      }
      requestInProgressRef.current = false;
    }
  }, [onScan, requestCameraPermission, preInitialize]);

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
            await scannerRef.current.turnOffTorch().catch(() => {});
            setIsTorchOn(false);
          } catch (e) {
            console.warn('SDK: Failed to turn off torch:', e);
          }
        }
        
        // Stop scanner if it's open with timeout
        try {
          if (scannerRef.current.isOpen) {
            console.log('SDK: Closing scanner...');
            // Remove callback first
            scannerRef.current.onFrameRead = undefined;
            scannerRef.current.onUnduplicatedRead = undefined;
            
            // Use Promise.all with short timeouts to avoid hanging
            await Promise.race([
              (async () => {
                await scannerRef.current!.stop();
                await scannerRef.current!.hide();
                await scannerRef.current!.close();
              })(),
              new Promise(r => setTimeout(r, 500))
            ]);
            
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
      
      // Try global cleanup
      try {
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

  // Toggle torch without closing scanner
  const toggleTorch = useCallback(async (): Promise<boolean | undefined> => {
    if (!scannerRef.current || !isScanning) {
      console.log('SDK: Cannot toggle torch when scanner is not active');
      return false;
    }
    
    try {
      console.log(`SDK: Toggling torch to ${!isTorchOn ? 'ON' : 'OFF'}`);
      
      if (!isTorchOn) {
        try {
          await Promise.race([
            scannerRef.current.turnOnTorch(),
            new Promise(r => setTimeout(r, 300))
          ]);
          setIsTorchOn(true);
          return true;
        } catch (err) {
          console.warn('SDK: Torch not supported or error:', err);
          return undefined;
        }
      } else {
        try {
          await Promise.race([
            scannerRef.current.turnOffTorch(),
            new Promise(r => setTimeout(r, 300))
          ]);
          setIsTorchOn(false);
          return false;
        } catch (err) {
          console.warn('SDK: Error turning torch off:', err);
          setIsTorchOn(false);
          return false;
        }
      }
    } catch (error) {
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
      
      try {
        if (state) {
          await Promise.race([
            scannerRef.current.turnOnTorch(),
            new Promise(r => setTimeout(r, 300))
          ]);
        } else {
          await Promise.race([
            scannerRef.current.turnOffTorch(),
            new Promise(r => setTimeout(r, 300))
          ]);
        }
        
        setIsTorchOn(state);
        return true;
      } catch (error) {
        console.error(`SDK: Failed to set torch state to ${state}:`, error);
        
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
