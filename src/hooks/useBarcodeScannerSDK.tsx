
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { useToast } from '@/hooks/use-toast';
import { DYNAMSOFT_LICENSE_KEY, BARCODE_READER_CONFIG } from '@/utils/dynamsoftConfig';

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
  const permissionCheckedRef = useRef(false);

  const barcodeScannerRef = useRef<BarcodeScanner | null>(null);
  const { toast } = useToast();
  
  // Track if component is mounted to prevent state updates after unmounting
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check for camera permissions immediately
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Avoid checking permissions multiple times
        if (permissionCheckedRef.current) return;
        permissionCheckedRef.current = true;
        
        console.log('Checking camera permissions...');
        
        // Check permission status first
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
            
            if (result.state === 'granted') {
              console.log('Camera permission is already granted');
              setCameraPermissions(true);
              return;
            } else if (result.state === 'prompt') {
              console.log('Camera permission will be requested');
            } else if (result.state === 'denied') {
              console.log('Camera permission was previously denied');
              setCameraPermissions(false);
              return;
            }
          } catch (e) {
            console.log('Permission query not supported, trying direct access');
          }
        }
        
        // If permissions API not available or permission state is 'prompt',
        // try to request camera access directly
        console.log('Requesting camera access...');
        const constraints = { 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Release the stream immediately after permission check
        stream.getTracks().forEach(track => track.stop());
        console.log('Camera permission granted');
        setCameraPermissions(true);
      } catch (err) {
        console.error('Camera permission check failed:', err);
        setCameraPermissions(false);
      }
    };

    // Add a small delay to ensure the component is mounted
    const timeoutId = setTimeout(() => {
      checkPermissions();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Initialize the barcode SDK
  useEffect(() => {
    if (cameraPermissions !== true) return;
    
    const initSDK = async () => {
      try {
        console.log('Initializing Dynamsoft SDK...');
        // Set license
        BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
        
        // Set resource path to ensure worker scripts load correctly
        BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
        
        // Wait for engine to initialize
        await BarcodeReader.loadWasm();
        console.log('BarcodeReader WASM loaded successfully');

        // Create scanner if we don't already have one
        if (!barcodeScannerRef.current) {
          const scanner = await BarcodeScanner.createInstance();
          barcodeScannerRef.current = scanner;
          console.log('Scanner instance created successfully');
  
          // Configure runtime settings
          const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
            (acc, cur) => acc | cur,
            0
          );
  
          // Create a default runtime settings first
          let settings = await scanner.getRuntimeSettings();
          
          // Then modify the settings
          settings.barcodeFormatIds = barcodeFormatIds;
          settings.deblurLevel = 2;
          
          // Update with the modified settings
          await scanner.updateRuntimeSettings(settings);
          console.log('Scanner runtime settings configured');
  
          scanner.singleFrameMode = false;
          
          // Properly type check before accessing properties
          try {
            const cameraSettings = await scanner.getVideoSettings();
            if (cameraSettings && typeof cameraSettings === 'object' && cameraSettings.video) {
              // Only update if video is an object and not a boolean
              if (typeof cameraSettings.video === 'object') {
                cameraSettings.video = {
                  ...cameraSettings.video,
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: { ideal: 'environment' }
                };
                await scanner.updateVideoSettings(cameraSettings);
                console.log('Camera video settings updated');
              }
            }
          } catch (e) {
            console.error('Failed to update video settings:', e);
            // Continue initialization even if video settings fail
          }
        }

        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsError(false); // Reset error state on successful initialization
        }
      } catch (error) {
        console.error('Failed to initialize Dynamsoft SDK:', error);
        if (isMountedRef.current) {
          setIsError(true);
          toast({
            title: 'Error',
            description: 'Failed to initialize barcode scanner.',
            variant: 'destructive'
          });
        }
      }
    };

    initSDK();

    return () => {
      // We'll handle cleanup in the dedicated cleanup function
    };
  }, [toast, cameraPermissions]);

  // Make cleanupScanner a stable function with useCallback
  const cleanupScanner = useCallback(async () => {
    if (!barcodeScannerRef.current) return;
    
    try {
      const scanner = barcodeScannerRef.current;
      
      // Stop scanning if active
      if (scanner.isOpen) {
        await scanner.stop();
        console.log('Scanner stopped during cleanup');
      }
      
      // Turn off torch if it's on
      if (isTorchOn) {
        try {
          await scanner.turnOffTorch();
          console.log('Torch turned off during cleanup');
        } catch (e) {
          console.log('Error turning off torch during cleanup:', e);
        }
      }
      
      // Reset callback
      scanner.onUnduplicatedRead = undefined;
      
      // Reset UI element references
      try {
        // Clear UI element to prevent issues with subsequent scans
        await scanner.setUIElement(null);
        console.log('UI element cleared during cleanup');
      } catch (e) {
        console.log('Error clearing UI element during cleanup:', e);
      }
      
      // Update state safely if component is still mounted
      if (isMountedRef.current) {
        setIsScanning(false);
        setIsTorchOn(false);
      }
      
      console.log('Scanner resources cleaned up successfully');
    } catch (err) {
      console.error('Error cleaning up scanner:', err);
    }
  }, [isTorchOn]);
  
  // Function to handle scanner UI setup and camera start
  const toggleScanning = async () => {
    if (!isInitialized || !barcodeScannerRef.current || !viewRef.current) {
      console.log('Cannot toggle scanning - scanner not initialized or view not ready');
      return;
    }

    try {
      const scanner = barcodeScannerRef.current;
      
      if (isScanning) {
        console.log('Stopping scanner...');
        await scanner.stop();
        // Make sure torch is off when stopping
        if (isTorchOn) {
          try {
            await scanner.turnOffTorch();
            if (isMountedRef.current) {
              setIsTorchOn(false);
            }
          } catch (e) {
            console.log('Error turning off torch on stop:', e);
          }
        }
        if (isMountedRef.current) {
          setIsScanning(false);
        }
        
        // Reset callback to prevent duplicate scans
        scanner.onUnduplicatedRead = undefined;
      } else {
        console.log('Starting scanner...');
        
        try {
          // Important: Only set UI element when the scanner is not already running
          if (!isScanning) {
            // First do a full cleanup to ensure we're starting fresh
            await cleanupScanner();
            
            // Make sure we have a reference to the UI container
            const container = viewRef.current.querySelector('.dce-video-container');
            if (!container) {
              console.error('Video container not found in DOM');
              throw new Error('Video container element not found');
            }
            
            // Set up the onUnduplicatedRead callback to handle successful scans
            scanner.onUnduplicatedRead = (txt, result) => {
              console.log('Barcode detected:', txt, result.barcodeFormatString);
              onScan(txt, result.barcodeFormatString);
            };
            
            // Important: Cast container as HTMLElement to match the expected type
            await scanner.setUIElement(container as HTMLElement);
            console.log('UI element set successfully');
            
            // Add a small delay to ensure the UI element is properly rendered
            await new Promise(resolve => setTimeout(resolve, 300));
            
            try {
              await scanner.show();
              console.log('Scanner showed successfully');
              if (isMountedRef.current) {
                setIsScanning(true);
              }
            } catch (e) {
              console.error('Error showing scanner after delay:', e);
              await resetScannerState(scanner);
              handleScanError(e);
            }
          }
        } catch (e) {
          console.error('Error starting scanner:', e);
          handleScanError(e);
          return;
        }
      }
    } catch (error) {
      console.error('Error toggling scan state:', error);
      handleScanError(error);
    }
  };
  
  // Helper function to reset scanner state
  const resetScannerState = async (scanner: BarcodeScanner) => {
    try {
      console.log('Resetting scanner state...');
      // Disconnect any camera resources
      await scanner.stop();
      
      // Reset internal state
      scanner.onUnduplicatedRead = undefined;
      
      // Clear UI element reference
      try {
        await scanner.setUIElement(null);
      } catch (err) {
        console.log('Error clearing UI element during reset:', err);
      }
      
      // Update component state safely
      if (isMountedRef.current) {
        setIsScanning(false);
        setIsTorchOn(false);
      }
      
      return true;
    } catch (err) {
      console.error('Error during scanner reset:', err);
      return false;
    }
  };
  
  // Helper function to handle scan errors
  const handleScanError = (error: any) => {
    if (error && error.message && error.message.includes("It is not allowed to change the UIElement when the camera is open")) {
      // Handle the specific error by stopping the scanner first
      if (barcodeScannerRef.current) {
        // Use async function with await instead of .then()
        const resetScanner = async () => {
          try {
            await barcodeScannerRef.current?.stop();
            // More aggressive cleanup
            barcodeScannerRef.current.onUnduplicatedRead = undefined;
            
            try {
              await barcodeScannerRef.current?.setUIElement(null);
            } catch (err) {
              console.log('Error clearing UI element during error handling:', err);
            }
            
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsScanning(false);
              }
              // Allow user to try again
              toast({
                title: 'Scanner Reset',
                description: 'Please try scanning again.',
                variant: 'default'
              });
            }, 500);
          } catch (err) {
            console.error('Error stopping scanner during reset:', err);
          }
        };
        
        // Call the async function
        resetScanner();
      }
    } else {
      if (isMountedRef.current) {
        toast({
          title: 'Camera Error',
          description: 'Failed to access camera. Please check permissions.',
          variant: 'destructive'
        });
        setIsError(true);
      }
    }
  };

  const toggleTorch = async () => {
    if (!isInitialized || !barcodeScannerRef.current || !isScanning) {
      console.log('Cannot toggle torch - scanner not initialized or not scanning');
      return;
    }

    try {
      const newTorchState = !isTorchOn;
      console.log('Toggling torch to:', newTorchState);
      
      if (newTorchState) {
        await barcodeScannerRef.current.turnOnTorch();
        console.log('Torch turned on');
      } else {
        await barcodeScannerRef.current.turnOffTorch();
        console.log('Torch turned off');
      }
      if (isMountedRef.current) {
        setIsTorchOn(newTorchState);
      }
    } catch (error) {
      console.error('Error toggling torch:', error);
      if (isMountedRef.current) {
        toast({
          description: 'Failed to toggle torch. Your device may not support this feature.',
          variant: 'destructive'
        });
      }
    }
  };

  // Function to manually request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      console.log('Manually requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Release the stream after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Camera permission granted manually');
      if (isMountedRef.current) {
        setCameraPermissions(true);
        // Reset error state after permissions granted
        setIsError(false);
      }
      return true;
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      return false;
    }
  };

  // Clean up all scanner resources when component unmounts
  useEffect(() => {
    return () => {
      // Ensure we clean up when unmounting
      const cleanupOnUnmount = async () => {
        if (barcodeScannerRef.current) {
          try {
            // Stop scanning if active
            if (barcodeScannerRef.current.isOpen) {
              await barcodeScannerRef.current.stop();
            }
            
            // Reset callback
            barcodeScannerRef.current.onUnduplicatedRead = undefined;
            
            // Destroy the scanner instance to free all resources
            await barcodeScannerRef.current.destroyContext();
            barcodeScannerRef.current = null;
            
            console.log('Scanner destroyed during unmount');
          } catch (err) {
            console.error('Error cleaning up scanner during unmount:', err);
          }
        }
      };
      
      cleanupOnUnmount();
    };
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
    requestCameraPermission,
    cleanupScanner
  };
};
