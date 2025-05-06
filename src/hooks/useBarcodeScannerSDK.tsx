
import { useEffect, useRef, useState } from 'react';
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

  const barcodeScannerRef = useRef<BarcodeScanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        // Release the stream immediately after permission check
        stream.getTracks().forEach(track => track.stop());
        setCameraPermissions(true);
      } catch (err) {
        console.error('Camera permission check failed:', err);
        setCameraPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
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

        // Create scanner
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
        
        // Fix 1: Properly type the video settings to avoid TypeScript errors
        const cameraSettings = await scanner.getVideoSettings();
        if (cameraSettings.video) {
          // Only set these if video property exists and is an object (not boolean)
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

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Dynamsoft SDK:', error);
        setIsError(true);
        toast({
          title: 'Error',
          description: 'Failed to initialize barcode scanner.',
          variant: 'destructive'
        });
      }
    };

    initSDK();

    return () => {
      if (barcodeScannerRef.current) {
        console.log('Cleaning up scanner...');
        barcodeScannerRef.current.destroyContext();
        barcodeScannerRef.current = null;
      }
    };
  }, [toast]);

  const toggleScanning = async () => {
    if (!isInitialized || !barcodeScannerRef.current || !viewRef.current) {
      console.log('Cannot toggle scanning - scanner not initialized or view not ready');
      return;
    }

    try {
      if (isScanning) {
        console.log('Stopping scanner...');
        await barcodeScannerRef.current.stop();
        // Make sure torch is off when stopping
        if (isTorchOn) {
          try {
            await barcodeScannerRef.current.turnOffTorch();
            setIsTorchOn(false);
          } catch (e) {
            console.log('Error turning off torch on stop:', e);
          }
        }
      } else {
        console.log('Starting scanner...');
        await barcodeScannerRef.current.setUIElement(viewRef.current);

        barcodeScannerRef.current.onUnduplicatedRead = (txt, result) => {
          console.log('Barcode detected:', txt, result.barcodeFormatString);
          onScan(txt, result.barcodeFormatString);
        };

        try {
          await barcodeScannerRef.current.show();
          console.log('Scanner showed successfully');
          
          // Fix 2: Remove getCameraInfo which doesn't exist on BarcodeScanner
          // Just log that scanner is active
          console.log('Camera is now active');
          
          // We can check torch capability in a safer way later when needed
        } catch (e) {
          console.error('Error showing scanner:', e);
          toast({
            title: 'Camera Error',
            description: 'Failed to access camera. Please check permissions.',
            variant: 'destructive'
          });
          setIsError(true);
          return;
        }
      }
      setIsScanning(prev => !prev);
    } catch (error) {
      console.error('Error toggling scan state:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle scanning mode.',
        variant: 'destructive'
      });
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
    cameraPermissions,
    toggleScanning,
    toggleTorch
  };
};
