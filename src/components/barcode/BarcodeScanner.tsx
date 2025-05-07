
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { AlertCircle, ScanBarcode, ArrowLeft } from 'lucide-react';

// Dynamsoft license key 
const LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzOTU3ODgwLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzOTU3ODgwIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjotMTgyODIwMDQwNH0=";

interface BarcodeScannerProps {
  onScan: (code: string, symbology: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const { toast } = useToast();
  const beepSoundRef = useRef(new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAyMjIyMjIyMjIyMjIyMjIyMjI8PDw8PDw8PDw8PDw8PDw8PDw8P////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAeAAAAAAAAAAbAyfj2eAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MoxAAUw2KeVEsQAkIkDmTkUGOgBbOuTDLgeBB4PDgwI/CE4OHQcBAMYE/B/4P+QfgQdCDoQd/oEPKv/rSrkPvt4uJLjzYcgLJkBLhsz8QHLHONELRyivykv2s/2+K4mb6HsbiiuOy8aVbk6sQE1ZhjqbMRdQAjgh1A+hQJHLMAQ6ipxEcSDJEqAT5QSCwGUCVDECOXKRQYQ0Q7vQxA5dVMAQQoWysxCZgp2NE0GG0F+WqUylUUGIaRky1A4FAMYUA5VAhwzRAEsFzORgViVByk4Syr/czU0kmlcr9ec08nVXNz/+MoxA8ZKyq0AGsQvDU3O9KmZffHp7TW73LnZplsyttZ59+/HvvFet22dtZ2y7LWtrrW7vSt1tc7Nd3Z613ed6960r8fus61L9estmvXdnbtlta3ve7TTibmeWvVzbmcl7R5Wa1dy53Z13qs6mZ3Jbl1y23ttZltv9a2+cZ+7acltnWdJJDctu7usDvaV2WtZ29ttrNNNt/bOt6mcYf9Xm1O9La2m7bskziRNiZHuXNvOS3d2W7u2dpzNsXNaZr73/vZX/G1Ju93O//f+7la2yNNexFU7yADsU7/+MoxAYRsXbVvsGHBCNYkVkpBYryXCU6KJdCGzWS0snWlaVq0VZbR9nWTPOlrO1LW5Wa35Zm3TMv3da1fX/Za1Kel//+t//fTZ/t5r7f/erzXbf//733W3//Vo9q618fn1uzPivf07d+a1+TVPU2qdEjQ0likVNPGoquaqvmohxB6aoMXnEHVOVIm5oyLryZGUXUFTMy/NLTtO131///8wf////9L+vNXf////+3/+73//u5H28UJgpa1YkokGUWSSDJgzaZnJqr/+MoxBQSU0L4AMJSkMqt8lqla1NXlq03MjShS1TVZRRRSKkkiqEyKORuZDeZLJZFaG9NTdlaVr///+1////uZf////////9////ef///////vmUiQRDJVokIEkTImExI0kUjQmRpLZLSdJSdaVdVXZTUtNU1TNJVdcy6UUVJoZC1KVNDOojEVTM5/1Zn/////9sv////tf///////7lf////////FVrJdKJNEOhAikEinkZRI0iyLREkskojbrbrWq/qkaUiVVVMmaRQkBm2USSK/+MoxBsSYyMAAMJSfKwVVMXoTHmoiQZdmYiQRdWMhqpDKZFa0uXTO40kSpLZm2qqppKQwgUVSrA0esBFAszWqaa1Uqmt1NJUv/loqmRNFIqqJkS1qVCYTEx0KIiZipClFVE6hpFxNNBP7+mkIqUVVaKrmVKmTJCFAJiYoLhoiKtQpf3pEwwCAchQgUxYY1AoLFhIUI7GiFBlPCYzLTXZk+lV1TUfsVWqaW6St//////////////8zUtSFKBFEUioTBAYR11IZjaUcxQmDxEPOCgH/+MoxBgRsvFHhSiAA5MCRYFCQwJDQBD+CB/4JP/ggf8CQ/LlxVNiiI0H0DSCvDQ0LlzGxE6JBESPieGJlbNMk1v////9JKv/////6qmVQyNqlJlUTKoyVKUpUqVRsqjZJSSVRskqqNkmSqSRlZVIzJWyyVqlmSSGwcmVbFAUDBKArEVCSIYNa10hCqxT5RkrcwKmeEohAkslkkk0lkkkrqvqTf/+pKv///////9SSSaJJJdI1I0jXSNdIwNPRRREREVUVUtlQXUL/+MoxBwS0dLtXT2AA1ME5Kkk1YqRUioFQKgVZ6RUCpFQKoVIqBVipFSKgVQqRUY4qRUCpKoVIqBVipJNSKgVIqBVFUVRVFUVRVFUVRVFUkmpFSKkqiVJVFUVRVFUVRVFUVRVFUVRU9NX0XpoWBITxXlk0V8CRtCgUip9JH+j/R/o/0FfN/qS+CQtiuK60f6P9H+lfSfkLb6JoKi2Ymhkzk0kf/0f6P9JSRzJP0pvUvEcaONHGjjRxo40cBIYCQwEhgJDAKICQwEhgJDASOBYuEnBJJP/+MoxB4RyMGkBUlAAbipLSqKkiclElgVF0mmVWVTLJKqJP6qSKCSRUVAKi4clHxDQKBJEkTcdR8Q0KDYZxPlDQcHJbf///9ezdqUQpjNOdV/lPWd//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+MoxB8QEKkUA0tAAA=="));
  const [lastScan, setLastScan] = useState<{code: string, symbology: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const scannerRef = useRef<DynamsoftScanner | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize the scanner when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        console.log("Initializing barcode scanner...");
        
        // Set license once
        if (!BarcodeReader.license) {
          BarcodeReader.license = LICENSE_KEY;
        }
        
        // Set CDN path if not already done
        if (!BarcodeReader.engineResourcePath) {
          BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
        }
        
        // Create a new scanner instance
        const scanner = await DynamsoftScanner.createInstance();
        scannerRef.current = scanner;
        
        // Configure settings for better performance
        try {
          const settings = await scanner.getRuntimeSettings();
          settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common formats
          settings.deblurLevel = 2;
          await scanner.updateRuntimeSettings(settings);
        } catch (e) {
          console.error("Error configuring scanner settings:", e);
        }
        
        // Set up scan callback
        scanner.onUnduplicatedRead = (txt, result) => {
          beepSoundRef.current.play().catch(e => console.log("Beep error:", e));
          setLastScan({ code: txt, symbology: result.barcodeFormatString });
          setIsScanning(false);
          onScan(txt, result.barcodeFormatString);
        };
        
        if (isMounted) {
          setIsInitialized(true);
          setIsError(false);
        }
      } catch (error) {
        console.error("Scanner initialization error:", error);
        if (isMounted) {
          setIsError(true);
        }
      }
    };

    initialize();
    
    // Cleanup when component unmounts
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        console.log("Cleaning up scanner...");
        scannerRef.current.stop().catch(e => console.log("Error stopping scanner:", e));
        scannerRef.current.destroyContext().catch(e => console.log("Error destroying scanner context:", e));
        scannerRef.current = null;
      }
      
      // Also clean up any video elements
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        try {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            if (stream && typeof stream.getTracks === 'function') {
              stream.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
          }
        } catch (e) {
          console.log("Error cleaning up video:", e);
        }
      });
    };
  }, [onScan]);
  
  // Toggle scanning on/off
  const toggleScanning = async () => {
    try {
      if (!scannerRef.current) {
        console.log("No scanner available");
        return;
      }
      
      if (isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
        setIsTorchOn(false);
      } else {
        if (viewRef.current) {
          await scannerRef.current.setUIElement(viewRef.current);
          await scannerRef.current.show();
          setIsScanning(true);
        }
      }
    } catch (error) {
      console.error("Error toggling scanner:", error);
      toast({
        title: "Scanner Error",
        description: "Failed to control the scanner. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Toggle torch on/off
  const toggleTorch = async () => {
    try {
      if (!scannerRef.current || !isScanning) {
        return;
      }
      
      if (isTorchOn) {
        await scannerRef.current.turnOffTorch();
        setIsTorchOn(false);
      } else {
        await scannerRef.current.turnOnTorch();
        setIsTorchOn(true);
      }
    } catch (error) {
      console.error("Error toggling torch:", error);
      toast({
        description: "Your device may not support the torch feature.",
        variant: "destructive"
      });
    }
  };
  
  // Reset scanner for another scan
  const handleReset = () => {
    setLastScan(null);
    toggleScanning();
  };

  // Show error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">Scanner Initialization Failed</h3>
          <p className="text-gray-500 mt-2">
            The barcode scanner couldn't initialize. This could be due to camera permissions or browser compatibility.
          </p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Display the scan result when available
  if (lastScan && !isScanning) {
    return (
      <div className="flex flex-col w-full h-full">
        <div 
          className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg"
          style={{ minHeight: '60vh' }}
        >
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <ScanBarcode className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Barcode Detected</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm w-full max-w-md mb-6">
            <p className="text-gray-500 text-sm mb-1">Code:</p>
            <p className="text-lg font-medium break-all mb-4">{lastScan.code}</p>
            <p className="text-gray-500 text-sm mb-1">Format:</p>
            <p className="text-lg font-medium">{lastScan.symbology}</p>
          </div>
          <Button 
            onClick={handleReset} 
            className="mt-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Scan Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div 
        className="flex-1 relative w-full rounded-md overflow-hidden bg-black"
        style={{ minHeight: '70vh' }}
      >
        <div 
          ref={viewRef}
          className="w-full h-full dce-video-container"
        ></div>
        
        {!isScanning && isInitialized && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <ScanBarcode className="w-16 h-16 mb-4 opacity-60" />
            <p className="text-lg opacity-60">Click 'Start Scanning' to begin</p>
          </div>
        )}
      </div>
      <div className="flex justify-center gap-4 p-4">
        <Button 
          onClick={toggleScanning} 
          variant={isScanning ? "destructive" : "default"}
          disabled={!isInitialized}
        >
          {isScanning ? 'Stop Scanning' : 'Start Scanning'}
        </Button>
        {isInitialized && (
          <Button 
            onClick={toggleTorch} 
            variant={isTorchOn ? "secondary" : "outline"}
            disabled={!isScanning}
          >
            {isTorchOn ? 'Torch Off' : 'Torch On'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
