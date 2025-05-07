import { useEffect, useRef, useState } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { useToast } from '@/hooks/use-toast';
import { DYNAMSOFT_LICENSE_KEY, ensureLicenseIsSet } from '@/utils/dynamsoftConfig';

export interface ScanResult {
  code: string;
  symbology: string;
}

interface UseBarcodeScannerSDKProps {
  onScan: (code: string, symbology: string) => void;
  stopAfterScan?: boolean; // Whether to automatically stop scanning after detecting a barcode
}

export const useBarcodeScannerSDK = ({ onScan, stopAfterScan = false }: UseBarcodeScannerSDKProps) => {
  const viewRef = useRef<HTMLDivElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isError, setIsError] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const barcodeScannerRef = useRef<BarcodeScanner | null>(null);
  const { toast } = useToast();

  // Initialize the Dynamsoft Barcode SDK
  useEffect(() => {
    let isMounted = true;
    
    // Set everything up in a self-executing async function
    (async () => {
      try {
        console.log("Setting up Dynamsoft Barcode SDK");
        
        // 1. Configure license first (without modifying it after loadWasm is called)
        await ensureLicenseIsSet();
        
        // 2. Set engine resource path without version in path
        console.log("Setting resource path");
        BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode/dist/";
        
        // 3. Verify product key
        try {
          console.log("Verifying license");
          await BarcodeReader.loadWasm();
          console.log("License verified successfully");
        } catch (err) {
          console.error("License verification failed:", err);
          if (isMounted) {
            setIsError(true);
            toast({
              title: 'License Error',
              description: 'Failed to verify the barcode scanner license.',
              variant: 'destructive'
            });
          }
          return;
        }

        // 4. Create a scanner instance and initialize
        if (isMounted) {
          console.log("Initializing scanner");
          await initializeScanner();
          console.log("Scanner initialized successfully");
        }
      } catch (error) {
        console.error('Setup failed:', error);
        if (isMounted) {
          setIsError(true);
          toast({
            title: 'Error',
            description: 'Failed to initialize barcode scanner.',
            variant: 'destructive'
          });
        }
      }
    })();

    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [toast]);

  // Separate cleanup function to ensure proper resource release
  const cleanupScanner = async () => {
    try {
      if (barcodeScannerRef.current) {
        console.log("Cleaning up scanner resources");
        
        // First stop scanning if active
        if (cameraOpen || isScanning) {
          try {
            await barcodeScannerRef.current.stop();
            setCameraOpen(false);
          } catch (e) {
            console.log("Error stopping scanner during cleanup:", e);
          }
        }
        
        // Then destroy the context completely
        try {
          await barcodeScannerRef.current.destroyContext();
        } catch (e) {
          console.log("Error destroying scanner context:", e);
        }
        
        console.log("Scanner resources released");
        barcodeScannerRef.current = null;
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
    
    // Reset states
    setIsScanning(false);
    setCameraOpen(false);
    setIsTorchOn(false);
  };

  const initializeScanner = async () => {
    try {
      console.log("Creating barcode scanner instance...");
      
      // Create a scanner instance
      const scanner = await BarcodeScanner.createInstance();
      barcodeScannerRef.current = scanner;
      
      console.log("Scanner instance created successfully");
      console.log("Configuring scanner settings...");
      
      // Configure runtime settings
      const settings = await scanner.getRuntimeSettings();
      console.log("Current settings:", settings);
      
      // Update barcode formats - ensure we're using a valid format
      settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000;  // Common 1D, QR, DataMatrix
      
      // Update deblur level
      settings.deblurLevel = 2;
      
      // Apply the updated settings
      await scanner.updateRuntimeSettings(settings);

      // Configure scanner UI settings
      scanner.singleFrameMode = false;
      
      // Set static properties on the BarcodeScanner class, not the instance
      try {
        // Set the UI Element URL on the class, not the instance
        BarcodeScanner.defaultUIElementURL = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode/dist/dbr.ui.html";
        
        console.log("Preparing DOM for scanner UI");
      } catch (e) {
        console.log("Warning while configuring UI elements:", e);
      }

      console.log("Barcode SDK initialized successfully");
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      throw error; // Rethrow to be caught by the parent try-catch
    }
  };

  const toggleScanning = async () => {
    if (!isInitialized || !barcodeScannerRef.current || !viewRef.current) {
      console.log("Cannot toggle scanning: scanner not ready");
      return;
    }

    try {
      if (isScanning || cameraOpen) {
        console.log("Stopping scanner...");
        await barcodeScannerRef.current.stop();
        setIsScanning(false);
        setCameraOpen(false);
        setIsTorchOn(false); // Reset torch state when stopping
      } else {
        console.log("Starting scanner...");
        
        // Make sure any previous scanner session is stopped and cleaned up
        try {
          if (barcodeScannerRef.current) {
            await barcodeScannerRef.current.stop();
            setCameraOpen(false);
          }
        } catch (e) {
          console.log("No active scanner to stop or error stopping:", e);
          
          // If stopping fails with a destroyed error, recreate the scanner
          if (e instanceof Error && (
              e.message.includes("destroyed") || 
              e.message.includes("camera is not open") ||
              e.message.includes("context")
            )) {
            console.log("Scanner context issue detected, reinitializing...");
            await cleanupScanner();
            await initializeScanner();
          }
        }
        
        // Clear the view container and set it up fresh
        if (viewRef.current && barcodeScannerRef.current) {
          try {
            // Set the UI Element before showing
            console.log("Setting UI element container");
            
            // Make sure we don't try to set UI when camera is already open
            if (!cameraOpen) {
              await barcodeScannerRef.current.setUIElement(viewRef.current);
            }
            
            // Set up the scan callback
            barcodeScannerRef.current.onUnduplicatedRead = async (txt, result) => {
              console.log("Barcode detected:", txt, result);
              
              // Call the onScan callback
              onScan(txt, result.barcodeFormatString);
              
              // Automatically stop scanning if stopAfterScan is true
              if (stopAfterScan && (isScanning || cameraOpen)) {
                try {
                  console.log("Auto-stopping scanner after successful scan");
                  await stopScanning();
                } catch (error) {
                  console.error("Error stopping scanner after scan:", error);
                }
              }
            };
            
            // Start the scanner with camera
            console.log("Showing scanner");
            await barcodeScannerRef.current.show();
            setIsScanning(true);
            setCameraOpen(true);
          } catch (error) {
            console.error("Error starting scanner:", error);
            
            // If show() fails, check for specific error types and handle accordingly
            if (error instanceof Error) {
              // Camera is already open error
              if (error.message.includes("camera is open")) {
                console.log("Camera is already open, no need to reopen");
                setIsScanning(true);
                setCameraOpen(true);
                return;
              }
              
              // UIElement change error when camera is open
              if (error.message.includes("change the UIElement when the camera is open")) {
                console.log("Cannot change UI Element while camera is open, stopping first");
                try {
                  await barcodeScannerRef.current.stop();
                  setCameraOpen(false);
                  
                  // Try again after stopping
                  await barcodeScannerRef.current.setUIElement(viewRef.current);
                  await barcodeScannerRef.current.show();
                  setIsScanning(true);
                  setCameraOpen(true);
                  return;
                } catch (e) {
                  console.error("Failed to restart scanner:", e);
                }
              }
              
              // Other context/destroyed errors
              if (error.message.includes("destroyed") || 
                  error.message.includes("context") ||
                  error.message.includes("camera")) {
                console.log("Scanner context issue detected, attempting recovery...");
                
                // Full cleanup and reinit
                await cleanupScanner();
                await initializeScanner();
                
                // Try one more time after reinitialization
                if (barcodeScannerRef.current && viewRef.current) {
                  await barcodeScannerRef.current.setUIElement(viewRef.current);
                  await barcodeScannerRef.current.show();
                  setIsScanning(true);
                  setCameraOpen(true);
                }
              } else {
                throw error; // Rethrow if we can't handle it
              }
            }
          }
        } else {
          console.error("View reference or scanner is not available");
          toast({
            title: 'Error',
            description: 'Scanner view not ready.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error toggling scan state:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle scanning mode.',
        variant: 'destructive'
      });
      
      // Reset state on error
      setIsScanning(false);
      setCameraOpen(false);
      setIsTorchOn(false);
    }
  };

  const stopScanning = async () => {
    if (!isInitialized || !barcodeScannerRef.current || (!isScanning && !cameraOpen)) {
      console.log("Cannot stop scanning: scanner not ready or not scanning");
      return;
    }

    try {
      console.log("Stopping scanner...");
      await barcodeScannerRef.current.stop();
      setIsScanning(false);
      setCameraOpen(false);
      setIsTorchOn(false); // Reset torch state when stopping
    } catch (error) {
      console.error('Error stopping scan:', error);
      // Don't show error toast here to avoid too many notifications
      
      // Still reset states even if there was an error
      setIsScanning(false);
      setCameraOpen(false);
      setIsTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!isInitialized || !barcodeScannerRef.current || !isScanning) {
      toast({
        description: 'Please start scanning first before using the torch.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newTorchState = !isTorchOn;
      if (newTorchState) {
        await barcodeScannerRef.current.turnOnTorch();
      } else {
        await barcodeScannerRef.current.turnOffTorch();
      }
      setIsTorchOn(newTorchState);
    } catch (error) {
      console.error('Error toggling torch:', error);
      toast({
        description: 'Failed to toggle torch. Your device may not support this feature.',
        variant: 'destructive'
      });
    }
  };

  return {
    viewRef,
    isScanning,
    isTorchOn,
    isInitialized,
    isError,
    toggleScanning,
    toggleTorch,
    stopScanning
  };
};
