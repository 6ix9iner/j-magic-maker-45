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

  // Track if permissions should be requested automatically
  const autoRequestPermissionsRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize camera permissions check
  useEffect(() => {
    const checkPermissions = async () => {
      if (permissionRequestedRef.current) return;
      
      try {
        console.log('Checking camera permissions...');
        
        // Try the Permissions API first
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
        
        // Only auto-request if configured to do so
        if (autoRequestPermissionsRef.current) {
          permissionRequestedRef.current = true;
          
          // Use simple constraints for permission check
          console.log('Auto-requesting camera access...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
          
          // Release the stream immediately
          stream.getTracks().forEach(track => track.stop());
          console.log('Camera permission granted');
          setCameraPermissions(true);
        }
      } catch (err) {
        console.error('Camera permission check failed:', err);
        setCameraPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  // Initialize the SDK when permissions are granted
  useEffect(() => {
    if (cameraPermissions !== true || initializeAttemptedRef.current) return;
    
    const initSDK = async () => {
      try {
        initializeAttemptedRef.current = true;
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
            await scanner.updateVideoSettings(BARCODE_READER_CONFIG.videoSettings);
            console.log('Video settings configured');
          } catch (e) {
            console.warn('Failed to update video settings:', e);
          }
        }
        
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsError(false);
        }
      } catch (error) {
        console.error('Failed to initialize barcode scanner SDK:', error);
        if (isMountedRef.current) {
          setIsError(true);
          toast.error('Failed to initialize scanner. Please try again.');
        }
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
                await scannerRef.current.stop();
              }
              
              // Destroy scanner completely
              await scannerRef.current.destroyContext();
              scannerRef.current = null;
              console.log('Scanner resources cleaned up on unmount');
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
    console.log('Performing complete scanner reset...');
    
    // Clean up existing scanner
    if (scannerRef.current) {
      try {
        // Stop camera if it's open
        if (scannerRef.current.isOpen) {
          await scannerRef.current.stop();
        }
        
        // Remove callbacks
        scannerRef.current.onUnduplicatedRead = undefined;
        
        // Destroy the scanner
        await scannerRef.current.destroyContext();
        scannerRef.current = null;
      } catch (e) {
        console.error('Error destroying scanner:', e);
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
      console.warn('Error during scanner reset:', e);
    }
    
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
      
      await scanner.updateVideoSettings(BARCODE_READER_CONFIG.videoSettings);
      
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
  }, []);

  // Clean up scanner resources
  const cleanupScanner = useCallback(async () => {
    if (requestInProgressRef.current) return;
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
    
    if (!isInitialized || !scannerRef.current) {
      console.log('Scanner not initialized yet');
      toast.error('Scanner not ready. Please try again.');
      return;
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
          
          // Get or create video container
          let container = viewRef.current.querySelector('.dce-video-container');
          if (!container) {
            container = document.createElement('div');
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
          
          // Set UI element
          try {
            await scannerRef.current.setUIElement(container as HTMLElement);
          } catch (e) {
            // If error with UI element, reset and try again
            if (e instanceof Error && e.message.includes("not allowed to change")) {
              console.log('UI element error - stopping and trying again');
              await scannerRef.current.stop();
              await new Promise(resolve => setTimeout(resolve, 500));
              await scannerRef.current.setUIElement(container as HTMLElement);
            } else {
              throw e;
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
          
          // Try to reset
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
  }, [isInitialized, isScanning, cleanupScanner, onScan, resetScanner]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!isInitialized || !scannerRef.current || !isScanning) {
      return;
    }
    
    try {
      if (isTorchOn) {
        await scannerRef.current.turnOffTorch();
      } else {
        await scannerRef.current.turnOnTorch();
      }
      
      if (isMountedRef.current) {
        setIsTorchOn(!isTorchOn);
      }
    } catch (error) {
      console.error('Error toggling torch:', error);
      toast.error('Failed to toggle flashlight');
    }
  }, [isInitialized, isScanning, isTorchOn]);

  // Explicitly request camera permission
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Requesting camera permission...');
      permissionRequestedRef.current = true;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Release the stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Camera permission granted');
      setCameraPermissions(true);
      setIsError(false);
      
      // Reset initialization flag to try again
      initializeAttemptedRef.current = false;
      
      return true;
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      setCameraPermissions(false);
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
    requestCameraPermission,
    cleanupScanner,
    resetScanner
  };
};
