
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { toast } from 'sonner';
import { 
  BARCODE_READER_CONFIG, 
  initializeDynamsoft,
  getScannerInstance
} from '@/utils/dynamsoftConfig';

export interface ScanResult {
  code: string;
  symbology: string;
}

interface UseBarcodeScannerSDKProps {
  onScan: (code: string, symbology: string) => void;
}

// Define extended MediaTrackCapabilities to include torch property
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
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
  const permissionRequestedRef = useRef(false);
  const initSuccessRef = useRef(false);
  const isIOSRef = useRef(false);
  
  // Detect browser for specific handling
  useEffect(() => {
    // Detect iOS for special handling
    const ua = navigator.userAgent;
    isIOSRef.current = /iPad|iPhone|iPod/.test(ua) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Explicitly request camera permission with better feedback
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Camera permission request already in progress');
      return false;
    }
    
    try {
      requestInProgressRef.current = true;
      console.log('Requesting camera permission...');
      permissionRequestedRef.current = true;
      
      // Use more focused constraints for faster camera access
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 480 }, // Reduced for faster startup
          height: { ideal: 360 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Release the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Camera permission granted');
      setCameraPermissions(true);
      setIsError(false);
      
      return true;
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      setCameraPermissions(false);
      
      // If it fails, update UI to show proper error
      toast.error('Camera permission denied. Please allow camera access in your browser settings.');
      return false;
    } finally {
      requestInProgressRef.current = false;
    }
  }, []);

  // Check camera permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (permissionRequestedRef.current || cameraPermissions !== null) return;
      
      try {
        console.log('Checking camera permissions...');
        
        // Check if we already have an active camera
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          if (videoDevices.length === 0) {
            console.log('No video devices found');
            setCameraPermissions(false);
            return;
          }
          
          // Try the Permissions API first - only works in secure contexts and some browsers
          if (navigator.permissions && navigator.permissions.query) {
            try {
              const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
              
              if (result.state === 'granted') {
                console.log('Camera permission is already granted');
                setCameraPermissions(true);
                return;
              } else if (result.state === 'denied') {
                console.log('Camera permission was previously denied');
                setCameraPermissions(false);
                return;
              }
            } catch (e) {
              console.log('Permission query not supported, trying direct access');
            }
          }
          
          // Request permission directly
          await requestCameraPermission();
        } else {
          console.log('MediaDevices API not available in this browser');
          setCameraPermissions(false);
          toast.error('Your browser does not support camera access');
        }
      } catch (err) {
        console.error('Camera permission check failed:', err);
        setCameraPermissions(false);
      }
    };

    checkPermissions();
  }, [requestCameraPermission]);

  // Initialize the SDK when permissions are granted
  useEffect(() => {
    if (cameraPermissions !== true || initSuccessRef.current) return;
    
    const initSDK = async () => {
      if (requestInProgressRef.current) return;
      
      try {
        requestInProgressRef.current = true;
        console.log('Initializing barcode scanner SDK...');
        
        // Initialize Dynamsoft SDK
        await initializeDynamsoft();
        
        // Get scanner instance
        if (!scannerRef.current) {
          console.log('Creating scanner instance...');
          const scanner = await getScannerInstance();
          scannerRef.current = scanner;
          
          // Configure only essential settings for faster startup
          const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
            (acc, cur) => acc | cur, 0
          );
          
          let settings = await scanner.getRuntimeSettings();
          settings.barcodeFormatIds = barcodeFormatIds;
          settings.deblurLevel = BARCODE_READER_CONFIG.deblurLevel;
          settings.timeout = BARCODE_READER_CONFIG.timeout;
          
          await scanner.updateRuntimeSettings(settings);
          
          // Minimal scanner options for speed
          scanner.singleFrameMode = false;
          scanner.ifShowScanRegionMask = false;
          
          // Set video settings based on platform
          await scanner.updateVideoSettings(BARCODE_READER_CONFIG.videoSettings);
          console.log('Video settings configured');
        }
        
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsError(false);
          initSuccessRef.current = true;
        }
      } catch (error) {
        console.error('Failed to initialize barcode scanner SDK:', error);
        if (isMountedRef.current) {
          setIsError(true);
          toast.error('Failed to initialize scanner. Please try again.');
        }
      } finally {
        requestInProgressRef.current = false;
      }
    };
    
    initSDK();
  }, [cameraPermissions]);

  // Clean up scanner resources on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        const cleanup = async () => {
          try {
            // Mark as unmounted to prevent state updates
            isMountedRef.current = false;
            
            // Stop camera if it's open
            if (scannerRef.current && scannerRef.current.isOpen) {
              await scannerRef.current.stop();
            }
          } catch (err) {
            console.error('Error during scanner cleanup:', err);
          }
        };
        
        cleanup();
      }
    };
  }, []);

  // Clean up scanner resources
  const cleanupScanner = useCallback(async () => {
    if (requestInProgressRef.current) {
      console.log('Cleanup request already in progress, ignoring');
      return;
    }
    
    requestInProgressRef.current = true;
    
    try {
      if (scannerRef.current) {
        // Stop camera if it's active
        if (scannerRef.current.isOpen) {
          try {
            console.log('Stopping scanner...');
            await scannerRef.current.stop();
          } catch (e) {
            console.warn('Error stopping scanner:', e);
          }
        }
        
        // Reset callbacks
        scannerRef.current.onUnduplicatedRead = undefined;
        
        // Turn off torch if active
        if (isTorchOn) {
          try {
            await scannerRef.current.turnOffTorch();
          } catch (e) {
            console.warn('Error turning off torch:', e);
          }
        }
      }
      
      // Update state
      if (isMountedRef.current) {
        setIsScanning(false);
        setIsTorchOn(false);
      }
    } catch (err) {
      console.error('Error during scanner cleanup:', err);
    } finally {
      requestInProgressRef.current = false;
    }
  }, [isTorchOn]);

  // Start or stop scanner
  const toggleScanning = useCallback(async () => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, ignoring');
      return;
    }
    
    if (!scannerRef.current) {
      console.log('Scanner not initialized yet, checking permissions and reinitializing');
      
      // Reset initialization flag
      initSuccessRef.current = false;
      
      // Check permissions again
      if (cameraPermissions !== true) {
        const permGranted = await requestCameraPermission();
        if (!permGranted) {
          toast.error('Camera access required for scanning');
          return;
        }
      }
      
      // Force initialization
      await initializeDynamsoft();
      
      // Get scanner instance
      scannerRef.current = await getScannerInstance();
      
      if (!scannerRef.current) {
        toast.error('Could not initialize scanner. Please try again.');
        return;
      }
    }
    
    if (!viewRef.current) {
      console.log('View reference not available');
      return;
    }
    
    requestInProgressRef.current = true;
    
    try {
      if (isScanning) {
        // Stop scanning
        await cleanupScanner();
      } else {
        console.log('Starting scanner...');
        
        try {
          // Get container
          if (!viewRef.current) {
            throw new Error('View container not available');
          }
          
          // Make sure camera is stopped before restarting
          if (scannerRef.current.isOpen) {
            await scannerRef.current.stop();
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Get or create video container
          let container = viewRef.current.querySelector('.dce-video-container') as HTMLElement | null;
          if (!container) {
            container = document.createElement('div') as HTMLElement;
            container.className = 'dce-video-container';
            container.style.width = '100%';
            container.style.height = '100%';
            viewRef.current.appendChild(container);
          }
          
          // Set up scan callback
          scannerRef.current.onUnduplicatedRead = (txt, result) => {
            console.log('Barcode detected:', txt, result.barcodeFormatString);
            onScan(txt, result.barcodeFormatString);
          };
          
          // Check if scanner is open before setting UI element
          if (!scannerRef.current.isOpen) {
            await scannerRef.current.setUIElement(container as HTMLElement);
          }
          
          // Open camera with faster scan interval
          await scannerRef.current.updateScanSettings({
            intervalTime: BARCODE_READER_CONFIG.scanSettings.intervalTime
          });
          
          // Open scanner
          await scannerRef.current.open();
          
          // Style video for better appearance
          setTimeout(() => {
            try {
              const videoElements = document.querySelectorAll('.dce-video-container video');
              videoElements.forEach((video) => {
                const videoElement = video as HTMLVideoElement;
                videoElement.style.objectFit = 'cover';
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
              });
            } catch (e) {
              console.warn('Video styling error:', e);
            }
          }, 50);
          
          // Show scanner
          await scannerRef.current.show();
          console.log('Scanner started successfully');
          
          // Update state
          if (isMountedRef.current) {
            setIsScanning(true);
            setIsError(false);
          }
        } catch (e) {
          console.error('Error starting scanner:', e);
          
          // Try to recover by getting a fresh scanner instance
          try {
            // Stop current scanner if it exists
            if (scannerRef.current && scannerRef.current.isOpen) {
              await scannerRef.current.stop();
            }
            
            // Force get a new scanner instance
            await initializeDynamsoft();
            scannerRef.current = await getScannerInstance();
          } catch (resetError) {
            console.error('Failed to recover scanner:', resetError);
          }
          
          // Show error toast
          toast.error('Error accessing camera. Please try again.');
          
          if (isMountedRef.current) {
            setIsScanning(false);
            setIsError(true);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling scanner:', error);
      
      if (isMountedRef.current) {
        setIsError(true);
        toast.error('Scanner error. Please try again.');
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [isScanning, cleanupScanner, onScan, cameraPermissions, requestCameraPermission]);

  // Set torch state
  const setTorchState = useCallback(async (state: boolean): Promise<boolean> => {
    if (!scannerRef.current || !isScanning) {
      console.log('Cannot set torch state when scanner is not active');
      return false;
    }
    
    try {
      console.log(`Setting torch state to ${state ? 'ON' : 'OFF'}`);
      
      // Check if torch is supported
      try {
        const capabilities = await scannerRef.current.getCapabilities();
        // Cast to our extended interface that includes the torch property
        const extendedCapabilities = capabilities as ExtendedMediaTrackCapabilities;
        if (!extendedCapabilities?.torch) {
          console.log('Torch not supported on this device/browser');
          if (state) {
            toast.error("Torch not available on this device");
          }
          return false;
        }
      } catch (capError) {
        console.warn('Error checking torch capabilities:', capError);
      }
      
      // Set torch state
      try {
        if (state) {
          await scannerRef.current.turnOnTorch();
        } else {
          await scannerRef.current.turnOffTorch();
        }
        
        // Update state
        if (isMountedRef.current) {
          setIsTorchOn(state);
        }
        
        return true;
      } catch (torchError) {
        console.warn(`Error setting torch state:`, torchError);
        if (state) {
          toast.error("Torch not available on this device");
        }
        return false;
      }
    } catch (error) {
      console.error(`Error setting torch state:`, error);
      
      if (state) {
        toast.error("Torch not available on this device");
      }
      return false;
    }
  }, [isScanning]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    return await setTorchState(!isTorchOn);
  }, [isTorchOn, setTorchState]);

  // Pre-initialize for faster startup later
  const preInitialize = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Pre-initializing SDK for faster startup');
      
      // Initialize Dynamsoft SDK
      const success = await initializeDynamsoft();
      
      console.log('Pre-initialization complete');
      return success;
    } catch (error) {
      console.log('Pre-initialization failed, will retry when needed:', error);
      return false;
    }
  }, []);

  return {
    viewRef,
    isScanning,
    isTorchOn,
    isInitialized,
    isError,
    cameraPermissions,
    toggleScanning,
    toggleTorch,
    setTorchState,
    requestCameraPermission,
    cleanupScanner,
    preInitialize
  };
};
