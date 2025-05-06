
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { toast } from 'sonner';
import { DYNAMSOFT_LICENSE_KEY, BARCODE_READER_CONFIG, initializeDynamsoft, getReaderInstance, cleanupDynamsoft } from '@/utils/dynamsoftConfig';

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

  // Initialize Dynamsoft when component mounts
  useEffect(() => {
    const initSDK = async () => {
      try {
        console.log('Pre-initializing SDK...');
        await initializeDynamsoft();
        console.log('SDK pre-initialization complete');
      } catch (error) {
        console.warn('SDK pre-initialization failed, will retry later:', error);
      }
    };
    
    initSDK();
    
    return () => {
      isMountedRef.current = false;
      cleanupScanner();
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
      console.log('Requesting camera permission...');
      
      // Use simplified constraints for faster camera access
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Release the stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Camera permission granted');
      setCameraPermissions(true);
      setIsError(false);
      
      return true;
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      setCameraPermissions(false);
      toast.error('Camera permission denied');
      return false;
    } finally {
      requestInProgressRef.current = false;
    }
  }, []);

  // Start the scanner
  const startScanner = useCallback(async (): Promise<boolean> => {
    if (!viewRef.current) {
      console.log('View reference not available');
      return false;
    }
    
    if (requestInProgressRef.current) {
      console.log('Scanner request already in progress');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      console.log('Initializing scanner...');
      
      // Ensure we have permission first
      if (cameraPermissions !== true) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          return false;
        }
      }
      
      // Initialize Dynamsoft if needed
      try {
        await initializeDynamsoft();
      } catch (error) {
        console.error('Failed to initialize Dynamsoft:', error);
        setIsError(true);
        return false;
      }
      
      // Create scanner if needed
      if (!scannerRef.current) {
        try {
          console.log('Creating scanner instance...');
          const scanner = await BarcodeScanner.createInstance();
          scannerRef.current = scanner;
          
          // Configure scanner with optimized settings
          const barcodeFormatIds = BARCODE_READER_CONFIG.barcodeFormats.reduce(
            (acc, cur) => acc | cur, 0
          );
          
          let settings = await scanner.getRuntimeSettings();
          settings.barcodeFormatIds = barcodeFormatIds;
          settings.deblurLevel = BARCODE_READER_CONFIG.deblurLevel;
          settings.timeout = BARCODE_READER_CONFIG.timeout;
          
          await scanner.updateRuntimeSettings(settings);
          
          // Configure basic scanner options
          scanner.singleFrameMode = false;
          scanner.ifShowScanRegionMask = false;
          
          // Set video settings
          await scanner.updateVideoSettings(BARCODE_READER_CONFIG.videoSettings);
          
          console.log('Scanner instance created');
        } catch (error) {
          console.error('Failed to create scanner instance:', error);
          setIsError(true);
          return false;
        }
      }
      
      // Start the scanner
      try {
        console.log('Starting scanner...');
        
        // Get container
        if (!viewRef.current) {
          throw new Error('View container not available');
        }
        
        // Create video container if needed
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
        
        // Set UI element
        await scannerRef.current.setUIElement(container as HTMLElement);
        
        // Open camera
        await scannerRef.current.updateScanSettings({
          intervalTime: BARCODE_READER_CONFIG.scanSettings.intervalTime
        });
        await scannerRef.current.open();
        
        // Style video
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
        
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsScanning(true);
          setIsError(false);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to start scanner:', error);
        setIsError(true);
        return false;
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [cameraPermissions, onScan, requestCameraPermission]);

  // Stop the scanner
  const stopScanner = useCallback(async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Stop request already in progress');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      if (scannerRef.current) {
        console.log('Stopping scanner...');
        
        // Turn off torch if it's on
        if (isTorchOn) {
          try {
            await scannerRef.current.turnOffTorch();
            setIsTorchOn(false);
          } catch (e) {
            console.warn('Failed to turn off torch:', e);
          }
        }
        
        // Stop scanner if it's open
        if (scannerRef.current.isOpen) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            console.warn('Failed to stop scanner:', e);
          }
        }
        
        // Remove callback
        scannerRef.current.onUnduplicatedRead = undefined;
      }
      
      setIsScanning(false);
      return true;
    } catch (error) {
      console.error('Failed to stop scanner:', error);
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
        console.log('Cleaning up scanner resources...');
        try {
          await scannerRef.current.destroyContext();
          scannerRef.current = null;
        } catch (e) {
          console.warn('Failed to destroy scanner context:', e);
        }
      }
      
      setIsScanning(false);
      setIsTorchOn(false);
    } catch (error) {
      console.error('Failed to clean up scanner:', error);
    }
  }, [stopScanner]);

  // Toggle torch
  const toggleTorch = useCallback(async (): Promise<boolean> => {
    if (!scannerRef.current || !isScanning) {
      console.log('Cannot toggle torch when scanner is not active');
      return false;
    }
    
    try {
      console.log(`Toggling torch to ${!isTorchOn ? 'ON' : 'OFF'}`);
      
      // Check if torch is supported
      try {
        const capabilities = await scannerRef.current.getCapabilities();
        const extendedCapabilities = capabilities as ExtendedMediaTrackCapabilities;
        if (!extendedCapabilities?.torch) {
          console.log('Torch not supported on this device/browser');
          throw new Error('Torch not supported');
        }
      } catch (capError) {
        console.warn('Error checking torch capabilities:', capError);
        throw new Error('Torch not available');
      }
      
      // Toggle torch
      if (!isTorchOn) {
        await scannerRef.current.turnOnTorch();
      } else {
        await scannerRef.current.turnOffTorch();
      }
      
      const newState = !isTorchOn;
      setIsTorchOn(newState);
      return newState;
    } catch (error) {
      console.error('Failed to toggle torch:', error);
      throw error;
    }
  }, [isScanning, isTorchOn]);

  // Set torch state directly
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
        const extendedCapabilities = capabilities as ExtendedMediaTrackCapabilities;
        if (!extendedCapabilities?.torch) {
          console.log('Torch not supported on this device/browser');
          return false;
        }
      } catch (capError) {
        console.warn('Error checking torch capabilities:', capError);
      }
      
      // Set torch state
      if (state) {
        await scannerRef.current.turnOnTorch();
      } else {
        await scannerRef.current.turnOffTorch();
      }
      
      setIsTorchOn(state);
      return true;
    } catch (error) {
      console.error(`Failed to set torch state to ${state}:`, error);
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
