
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

  const barcodeScannerRef = useRef<BarcodeScanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initSDK = async () => {
      try {
        // Set license
        BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
        
        // Set resource path to ensure worker scripts load correctly
        BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
        
        // Wait for engine to initialize
        await BarcodeReader.loadWasm();

        // Create scanner
        const scanner = await BarcodeScanner.createInstance();
        barcodeScannerRef.current = scanner;

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

        scanner.singleFrameMode = false;

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
        barcodeScannerRef.current.destroyContext();
        barcodeScannerRef.current = null;
      }
    };
  }, [toast]);

  const toggleScanning = async () => {
    if (!isInitialized || !barcodeScannerRef.current || !viewRef.current) {
      return;
    }

    try {
      if (isScanning) {
        await barcodeScannerRef.current.stop();
      } else {
        await barcodeScannerRef.current.setUIElement(viewRef.current);

        barcodeScannerRef.current.onUnduplicatedRead = (txt, result) => {
          onScan(txt, result.barcodeFormatString);
        };

        await barcodeScannerRef.current.show();
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
    toggleTorch
  };
};
