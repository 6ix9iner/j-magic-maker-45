
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
        // FIXED: Close the scanner properly to ensure resources are released
        await stopScanning();
      } else {
        console.log("Starting scanner...");
        
        // FIXED: Ensure scanner is properly created before attempting to use it
        if (!barcodeScannerRef.current) {
          console.log("Scanner reference lost, reinitializing...");
          await initializeScanner();
        }
        
        try {
          // FIXED: More robust handling of UI element setting
          console.log("Setting UI element container");
          if (barcodeScannerRef.current && viewRef.current) {
            try {
              // Only try to set UI element if camera is not open
              if (!cameraOpen) {
                await barcodeScannerRef.current.setUIElement(viewRef.current);
              }
            } catch (e) {
              // If there's an error about UI element when camera is open
              if (e instanceof Error && e.message.includes("camera is open")) {
                console.log("Camera is already open, trying to stop first");
                await barcodeScannerRef.current.stop();
                setCameraOpen(false);
                // Try again after stopping
                await barcodeScannerRef.current.setUIElement(viewRef.current);
              } else {
                throw e; // Rethrow if it's another type of error
              }
            }
            
            // Set up the scan callback
            barcodeScannerRef.current.onUnduplicatedRead = async (txt, result) => {
              console.log("Barcode detected:", txt, result);
              onScan(txt, result.barcodeFormatString);
              
              if (stopAfterScan) {
                try {
                  await stopScanning();
                } catch (error) {
                  console.error("Error stopping scanner after scan:", error);
                }
              }
            };
            
            // FIXED: Much more robust scanner starting
            try {
              console.log("Starting scanner with show()");
              await barcodeScannerRef.current.show();
              setIsScanning(true);
              setCameraOpen(true);
            } catch (error) {
              console.error("Error starting scanner with show():", error);
              
              // FIXED: Better error handling for common errors
              if (error instanceof Error) {
                if (error.message.includes("already open") || 
                    error.message.includes("camera is open")) {
                  console.log("Camera already open, setting scanning state");
                  setIsScanning(true);
                  setCameraOpen(true);
                } else {
                  // For other errors, try a full reset
                  console.log("Critical scanner error, doing full reset");
                  await cleanupScanner();
                  await initializeScanner();
                  
                  // Try one more time
                  if (barcodeScannerRef.current && viewRef.current) {
                    try {
                      await barcodeScannerRef.current.setUIElement(viewRef.current);
                      await barcodeScannerRef.current.show();
                      setIsScanning(true);
                      setCameraOpen(true);
                    } catch(e) {
                      console.error("Couldn't recover scanner after reset:", e);
                      throw e;
                    }
                  }
                }
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          console.error("Error in scanner setup:", error);
          
          // FIXED: Full scanner reset if all else fails
          if (error instanceof Error && (
              error.message.includes("destroyed") || 
              error.message.includes("UIElement") ||
              error.message.includes("context"))) {
            
            console.log("Scanner in bad state, doing full reset");
            await cleanupScanner();
            await initializeScanner();
            
            // Try one last time with fresh scanner
            if (barcodeScannerRef.current && viewRef.current) {
              await barcodeScannerRef.current.setUIElement(viewRef.current);
              await barcodeScannerRef.current.show();
              setIsScanning(true);
              setCameraOpen(true);
            }
          } else {
            toast({
              title: 'Scanner Error',
              description: 'Failed to start scanner. Please reload the page.',
              variant: 'destructive'
            });
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error toggling scan state:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle scanning mode. Please reload the page.',
        variant: 'destructive'
      });
      
      // Reset state on error
      setIsScanning(false);
      setCameraOpen(false);
      setIsTorchOn(false);
    }
  };

  const stopScanning = async () => {
    console.log("Stopping scanner explicitly...");
    if (!barcodeScannerRef.current) {
      console.log("No scanner to stop");
      setIsScanning(false);
      setCameraOpen(false);
      setIsTorchOn(false);
      return;
    }

    try {
      // FIXED: More robust stop with additional checks
      if (cameraOpen) {
        console.log("Stopping camera...");
        try {
          await barcodeScannerRef.current.stop();
          console.log("Camera stopped successfully");
        } catch (e) {
          console.error("Error stopping camera:", e);
          
          // Handle specific errors
          if (e instanceof Error && e.message.includes("destroyed")) {
            console.log("Scanner already destroyed, recreating instance");
            barcodeScannerRef.current = null;
            await initializeScanner();
          }
        }
      }
      
      // Always reset states regardless of any errors
      setIsScanning(false);
      setCameraOpen(false);
      setIsTorchOn(false);
    } catch (error) {
      console.error('Error in stopScanning:', error);
      
      // Always reset states even with errors
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
