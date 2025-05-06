
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { toast } from 'sonner';
import { DYNAMSOFT_LICENSE_KEY, BARCODE_READER_CONFIG, initializeDynamsoft } from '@/utils/dynamsoftConfig';

export interface ScanResult {
  code: string;
  symbology: string;
}

interface UseBarcodeScannerSDKProps {
  onScan: (code: string, symbology: string) => void;
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
  const initializeAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);
  const requestInProgressRef = useRef(false);
  const permissionRequestedRef = useRef(false);
  const initSuccessRef = useRef(false);
  const isIOSRef = useRef(false);

  // Track if permissions should be requested automatically
  const autoRequestPermissionsRef = useRef(true);
  
  // Detect browser for specific handling
  useEffect(() => {
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
      
      // Use more detailed constraints for better mobile compatibility
      // iOS devices need a different approach
      const constraints = {
        video: isIOSRef.current ? 
          true : // Simplified for iOS
          { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Release the stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Camera permission granted');
      setCameraPermissions(true);
      setIsError(false);
      
      // Reset initialization flag to try again
      initializeAttemptedRef.current = false;
      
      // Small delay to ensure async state updates complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  // More reliable camera permissions check
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
              } else if (result.state === 'prompt') {
                console.log('Camera permission will be requested');
                // Continue to request access
              } else if (result.state === 'denied') {
                console.log('Camera permission was previously denied');
                setCameraPermissions(false);
                return;
              }
            } catch (e) {
              console.log('Permission query not supported, trying direct access');
            }
          }
          
          // On browsers without permissions API, try direct access
          // Direct permission request - this works more reliably across browsers
          if (autoRequestPermissionsRef.current) {
            await requestCameraPermission();
          }
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
        
        // Initialize Dynamsoft SDK once
        await initializeDynamsoft();
        
        // Create scanner instance for later use
        if (!scannerRef.current) {
          console.log('Creating scanner instance...');
          const scanner = await BarcodeScanner.createInstance();
          scannerRef.current = scanner;
          
          // Configure settings
          const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
            (acc, cur) => acc | cur, 0
          );
          
          let settings = await scanner.getRuntimeSettings();
          settings.barcodeFormatIds = barcodeFormatIds;
          settings.deblurLevel = BARCODE_READER_CONFIG.deblurLevel;
          settings.timeout = BARCODE_READER_CONFIG.timeout;
          
          await scanner.updateRuntimeSettings(settings);
          console.log('Scanner configured with optimized settings');
          
          // Configure video settings
          scanner.singleFrameMode = false;
          scanner.ifShowScanRegionMask = false;
          
          try {
            // Use simplified video settings for iOS
            if (isIOSRef.current) {
              await scanner.updateVideoSettings({
                video: {
                  facingMode: 'environment',
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }
              });
            } else {
              await scanner.updateVideoSettings(BARCODE_READER_CONFIG.videoSettings);
            }
            console.log('Video settings configured');
          } catch (e) {
            console.warn('Failed to update video settings:', e);
          }
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

  // Clean up all scanner resources on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        const cleanup = async () => {
          try {
            if (scannerRef.current) {
              // Stop camera if it's open
              if (scannerRef.current.isOpen) {
                try {
                  await scannerRef.current.stop();
                } catch (e) {
                  console.warn('Error stopping scanner during cleanup:', e);
                }
              }
              
              // Destroy scanner completely
              try {
                await scannerRef.current.destroyContext();
                scannerRef.current = null;
                console.log('Scanner resources cleaned up on unmount');
              } catch (e) {
                console.warn('Error destroying scanner context:', e);
              }
            }
          } catch (err) {
            console.error('Error during scanner cleanup:', err);
          }
        };
        
        cleanup();
      }
    };
  }, []);

  // Reset the scanner completely
  const resetScanner = useCallback(async () => {
    if (requestInProgressRef.current) {
      console.log('Reset already in progress, ignoring');
      return false;
    }
    
    requestInProgressRef.current = true;
    try {
      console.log('Performing complete scanner reset...');
      
      // Clean up existing scanner
      if (scannerRef.current) {
        try {
          // Stop camera if it's open
          if (scannerRef.current.isOpen) {
            try {
              await scannerRef.current.stop();
              // Give some time for camera to fully close
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
              console.warn('Error stopping scanner during reset:', e);
            }
          }
          
          // Remove callbacks
          scannerRef.current.onUnduplicatedRead = undefined;
          
          // Destroy the scanner
          try {
            await scannerRef.current.destroyContext();
            scannerRef.current = null;
          } catch (e) {
            console.warn('Error destroying scanner context during reset:', e);
          }
        } catch (e) {
          console.error('Error cleaning up scanner:', e);
        }
      }
      
      // Reset temporary BarcodeReader to clear global state
      try {
        console.log("Resetting scanner resources");
        const tempReader = await BarcodeReader.createInstance();
        if (tempReader) {
          await tempReader.destroyContext();
          console.log("Successfully reset scanner resources");
        }
      } catch (e) {
        console.warn('Error during scanner resource reset:', e);
      }
      
      // Allow some time for resources to be released
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // Create a new scanner instance
        console.log('Creating new scanner instance...');
        const scanner = await BarcodeScanner.createInstance();
        scannerRef.current = scanner;
        
        // Configure settings again
        const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
          (acc, cur) => acc | cur, 0
        );
        
        let settings = await scanner.getRuntimeSettings();
        settings.barcodeFormatIds = barcodeFormatIds;
        settings.deblurLevel = BARCODE_READER_CONFIG.deblurLevel;
        settings.timeout = BARCODE_READER_CONFIG.timeout;
        
        await scanner.updateRuntimeSettings(settings);
        
        // Configure scanner options
        scanner.singleFrameMode = false;
        scanner.ifShowScanRegionMask = false;
        
        // Use different settings for iOS
        if (isIOSRef.current) {
          await scanner.updateVideoSettings({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } else {
          await scanner.updateVideoSettings(BARCODE_READER_CONFIG.videoSettings);
        }
        
        // Update state
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsError(false);
          setIsScanning(false);
          setIsTorchOn(false);
        }
        
        console.log('Scanner reset successfully');
        return true;
      } catch (error) {
        console.error('Failed to reset scanner:', error);
        if (isMountedRef.current) {
          setIsError(true);
        }
        return false;
      }
    } finally {
      requestInProgressRef.current = false;
    }
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

  // Start or stop scanner with better error handling
  const toggleScanning = useCallback(async () => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, ignoring');
      return;
    }
    
    if (!isInitialized || !scannerRef.current) {
      console.log('Scanner not initialized yet, checking permissions and reinitializing');
      
      // Reset initialization flag to force reinitialization
      initializeAttemptedRef.current = false;
      initSuccessRef.current = false;
      
      // Check permissions again
      if (cameraPermissions !== true) {
        const permGranted = await requestCameraPermission();
        if (!permGranted) {
          toast.error('Camera access required for scanning');
          return;
        }
      }
      
      // Force a complete scanner reset
      const resetSuccess = await resetScanner();
      
      if (!resetSuccess) {
        toast.error('Could not initialize scanner. Please try again.');
        return;
      }
      
      // Give a moment for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!scannerRef.current) {
        toast.error('Scanner not ready. Please try again.');
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
          
          // Ensure camera is fully stopped before trying to open it again
          if (scannerRef.current.isOpen) {
            await scannerRef.current.stop();
            // Wait for camera to fully release
            await new Promise(resolve => setTimeout(resolve, 500));
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
          
          // Handle iOS differently for better compatibility
          if (isIOSRef.current) {
            try {
              // For iOS, use a simpler approach
              await scannerRef.current.setUIElement(container as HTMLElement);
            } catch (e) {
              console.error('UI element error on iOS:', e);
              // Retry with a different approach for iOS
              await resetScanner();
              
              if (!scannerRef.current) {
                throw new Error('Failed to recover scanner on iOS');
              }
              
              // Try again with simpler settings
              await scannerRef.current.setUIElement(container as HTMLElement);
            }
          } else {
            // Regular browsers
            try {
              await scannerRef.current.setUIElement(container as HTMLElement);
            } catch (e) {
              console.error('UI element error:', e);
              
              // If camera is somehow still open, stop it
              if (scannerRef.current.isOpen) {
                try {
                  await scannerRef.current.stop();
                  await new Promise(resolve => setTimeout(resolve, 500));
                } catch (stopError) {
                  console.warn('Error stopping camera:', stopError);
                }
              }
              
              // Complete reset of scanner
              await resetScanner();
              
              if (!scannerRef.current) {
                throw new Error('Failed to recover scanner');
              }
              
              // Try setting UI element again after reset
              console.log('Retrying UI element setup after reset');
              await scannerRef.current.setUIElement(container as HTMLElement);
            }
          }
          
          // Open camera
          console.log('Opening camera...');
          await scannerRef.current.open();
          
          // Style video elements
          setTimeout(() => {
            const videoElements = document.querySelectorAll('.dce-video-container video');
            videoElements.forEach((video) => {
              // Cast to HTMLVideoElement to access style property
              const videoElement = video as HTMLVideoElement;
              videoElement.style.objectFit = 'cover';
              videoElement.style.width = '100%';
              videoElement.style.height = '100%';
            });
          }, 100);
          
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
          
          // Force a complete scanner reset
          await resetScanner();
          
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
  }, [isInitialized, isScanning, cleanupScanner, onScan, resetScanner, cameraPermissions, requestCameraPermission]);

  // Set torch state directly with improved error handling
  const setTorchState = useCallback(async (state: boolean): Promise<boolean> => {
    if (!isInitialized || !scannerRef.current || !isScanning) {
      console.log('Cannot set torch state when scanner is not active');
      return false;
    }
    
    try {
      console.log(`Setting torch state to ${state ? 'ON' : 'OFF'}`);
      
      // Check if torch is supported on the device first - useful for iOS
      try {
        const capabilities = await scannerRef.current.getCapabilities();
        if (!capabilities?.torch) {
          console.log('Torch not supported on this device/browser');
          if (state) {
            toast.error("Torch not available on this device");
          }
          return false;
        }
      } catch (capError) {
        console.warn('Error checking torch capabilities:', capError);
        // Continue anyway, might work on some devices
      }
      
      if (state) {
        await scannerRef.current.turnOnTorch();
      } else {
        await scannerRef.current.turnOffTorch();
      }
      
      if (isMountedRef.current) {
        setIsTorchOn(state);
      }
      
      console.log(`Torch state set to ${state ? 'ON' : 'OFF'} successfully`);
      return true;
    } catch (error) {
      console.error(`Error setting torch state to ${state ? 'ON' : 'OFF'}:`, error);
      
      // Don't show error when turning off torch, just succeed silently
      if (state) {
        toast.error("Torch not available on this device");
      }
      return false;
    }
  }, [isInitialized, isScanning]);

  // Legacy toggle torch function (now uses setTorchState)
  const toggleTorch = useCallback(async () => {
    return await setTorchState(!isTorchOn);
  }, [isTorchOn, setTorchState]);

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
    resetScanner
  };
};
