
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeReader, BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { useToast } from '@/hooks/use-toast';
import { DYNAMSOFT_LICENSE_KEY, ensureLicenseIsSet, cleanupDynamsoft } from '@/utils/dynamsoftConfig';

export interface ScanResult {
  code: string;
  symbology: string;
}

interface UseBarcodeScannerSDKProps {
  onScan: (code: string, symbology: string) => void;
  stopAfterScan?: boolean; // Whether to automatically stop scanning after detecting a barcode
  key?: number | string; // Optional key for forced re-initialization
}

export const useBarcodeScannerSDK = ({ onScan, stopAfterScan = false, key = 0 }: UseBarcodeScannerSDKProps) => {
  const viewRef = useRef<HTMLDivElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isError, setIsError] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [forceReset, setForceReset] = useState(0);

  const barcodeScannerRef = useRef<BarcodeScanner | null>(null);
  const mountedRef = useRef(true); // Track if component is mounted
  const { toast } = useToast();

  // Reset scanner state without toggling - useful before a new scan
  const resetScannerState = useCallback(() => {
    setForceReset(prev => prev + 1);
  }, []);

  // Cleanup scanner resources - moved to a reusable callback function
  const cleanupScanner = useCallback(async () => {
    try {
      console.log("Cleaning up scanner resources");
      
      // First stop scanning if active
      if (barcodeScannerRef.current) {
        if (cameraOpen || isScanning) {
          try {
            await barcodeScannerRef.current.stop();
            console.log("Camera stopped during cleanup");
          } catch (e) {
            console.log("Error stopping scanner during cleanup:", e);
          }
        }
        
        // Then destroy the context completely
        try {
          await barcodeScannerRef.current.destroyContext();
          console.log("Scanner context destroyed");
        } catch (e) {
          console.log("Error destroying scanner context:", e);
        }
        
        console.log("Scanner resources released");
        barcodeScannerRef.current = null;
      }
      
      // Additional global cleanup
      await cleanupDynamsoft();
      
      // Reset states if component is still mounted
      if (mountedRef.current) {
        setIsScanning(false);
        setCameraOpen(false);
        setIsTorchOn(false);
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }, [cameraOpen, isScanning]);

  // Initialize scanner function - moved to a reusable callback
  const initializeScanner = useCallback(async () => {
    if (!mountedRef.current) return; // Don't initialize if unmounted
    
    try {
      console.log("Creating barcode scanner instance...");
      
      // Clean up any existing instances first
      await cleanupScanner();
      
      // Create a new scanner instance
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
      
      // Set default UI element URL
      try {
        BarcodeScanner.defaultUIElementURL = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode/dist/dbr.ui.html";
      } catch (e) {
        console.log("Warning while configuring UI elements:", e);
      }

      // Mark as initialized
      if (mountedRef.current) {
        setIsInitialized(true);
        setIsError(false); // Clear any previous errors
      }
      
      console.log("Barcode SDK initialized successfully");
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      
      if (mountedRef.current) {
        setIsError(true);
        toast({
          title: 'Error',
          description: 'Failed to initialize barcode scanner.',
          variant: 'destructive'
        });
      }
    }
  }, [cleanupScanner, toast]);

  // Initialize the Dynamsoft Barcode SDK
  useEffect(() => {
    mountedRef.current = true;
    let initializationAttempted = false;
    
    // Set everything up in a self-executing async function
    (async () => {
      try {
        console.log("Setting up Dynamsoft Barcode SDK");
        
        // Prevent multiple initialization attempts
        if (initializationAttempted) return;
        initializationAttempted = true;
        
        // 1. Configure license first
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
          if (mountedRef.current) {
            setIsError(true);
            toast({
              title: 'License Error',
              description: 'Failed to verify the barcode scanner license.',
              variant: 'destructive'
            });
          }
          return;
        }

        // 4. Initialize scanner
        if (mountedRef.current) {
          console.log("Initializing scanner");
          await initializeScanner();
        }
      } catch (error) {
        console.error('Setup failed:', error);
        if (mountedRef.current) {
          setIsError(true);
          toast({
            title: 'Error',
            description: 'Failed to initialize barcode scanner.',
            variant: 'destructive'
          });
        }
      }
    })();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      cleanupScanner();
    };
  }, [toast, key, forceReset, initializeScanner, cleanupScanner]);

  // Toggle scanning function
  const toggleScanning = async () => {
    if (!isInitialized) {
      console.log("Cannot toggle scanning: scanner not ready");
      
      // Try to reinitialize if there was an error
      if (isError) {
        await initializeScanner();
        return;
      }
      return;
    }

    try {
      if (isScanning || cameraOpen) {
        console.log("Stopping scanner...");
        await stopScanning();
      } else {
        console.log("Starting scanner...");
        
        // Ensure scanner is properly created
        if (!barcodeScannerRef.current) {
          console.log("Scanner reference lost, reinitializing...");
          await initializeScanner();
          
          // If still not available after reinitialization, abort
          if (!barcodeScannerRef.current) {
            console.error("Failed to recreate scanner");
            return;
          }
        }

        // Set up scanner UI and start
        if (barcodeScannerRef.current && viewRef.current) {
          try {
            // Make sure camera is closed before setting UI element
            if (cameraOpen) {
              try {
                await barcodeScannerRef.current.stop();
                setCameraOpen(false);
                setIsScanning(false);
                
                // Brief delay to ensure camera is fully closed
                await new Promise(resolve => setTimeout(resolve, 300));
              } catch (e) {
                console.log("Error while ensuring camera is closed:", e);
              }
            }
            
            console.log("Setting UI element container");
            await barcodeScannerRef.current.setUIElement(viewRef.current);
            
            // Set up scan callback
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
            
            // Start scanning
            try {
              console.log("Starting scanner with show()");
              await barcodeScannerRef.current.show();
              setIsScanning(true);
              setCameraOpen(true);
            } catch (error) {
              console.error("Error starting scanner with show():", error);
              
              if (error instanceof Error) {
                if (error.message.includes("already open") || 
                    error.message.includes("camera is open")) {
                  console.log("Camera already open, setting scanning state");
                  setIsScanning(true);
                  setCameraOpen(true);
                } else {
                  // Full reset for other errors
                  console.log("Critical scanner error, doing full reset");
                  await cleanupScanner();
                  await initializeScanner();
                  
                  // Try again with new instance
                  if (barcodeScannerRef.current && viewRef.current && mountedRef.current) {
                    await barcodeScannerRef.current.setUIElement(viewRef.current);
                    await barcodeScannerRef.current.show();
                    setIsScanning(true);
                    setCameraOpen(true);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error in scanner setup:", error);
            
            // Full scanner reset as last resort
            console.log("Scanner in bad state, doing full reset");
            await cleanupScanner();
            
            // Brief pause to ensure resources are released
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try again with fresh instance
            await initializeScanner();
            
            if (barcodeScannerRef.current && viewRef.current && mountedRef.current) {
              await barcodeScannerRef.current.setUIElement(viewRef.current);
              await barcodeScannerRef.current.show();
              setIsScanning(true);
              setCameraOpen(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error toggling scan state:', error);
      
      if (mountedRef.current) {
        toast({
          title: 'Error',
          description: 'Failed to toggle scanning mode. Please try again.',
          variant: 'destructive'
        });
        
        // Reset state and force recreation on error
        setIsScanning(false);
        setCameraOpen(false);
        setIsTorchOn(false);
        resetScannerState();
      }
    }
  };

  // Improved stop scanning function
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
      // More robust stop with additional checks
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
      
      // Reset states if component is still mounted
      if (mountedRef.current) {
        setIsScanning(false);
        setCameraOpen(false);
        setIsTorchOn(false);
      }
    } catch (error) {
      console.error('Error in stopScanning:', error);
      
      // Always reset states even with errors
      if (mountedRef.current) {
        setIsScanning(false);
        setCameraOpen(false);
        setIsTorchOn(false);
      }
    }
  };

  // Toggle torch function
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
    stopScanning,
    resetScannerState
  };
};
