
/**
 * Dynamsoft Barcode Reader configuration
 */
import { BarcodeReader, BarcodeScanner, EnumBarcodeFormat } from "dynamsoft-javascript-barcode";

// Interface for extended BarcodeScanner functionality
interface BarcodeScannerExtended {
  isDesktopBrowser?: () => boolean;
  preloadModule?: () => Promise<void>;
  cleanFrameBuffer?: () => Promise<void>;
}

// Interface for extended BarcodeReader functionality
interface BarcodeReaderExtended {
  loadingStrategy?: {
    priority: string;
    lazyLoad: boolean;
  };
}

// License key for Dynamsoft Barcode Reader
export const DYNAMSOFT_LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzOTU3ODgwLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzOTU3ODgwIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjotMTgyODIwMDQwNH0=";

// Beep sound for successful scan - using a smaller MP3 file for better compatibility
export const BEEP_SOUND_URL = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAyMjIyMjIyMjIyMjIyMjIyMjI8PDw8PDw8PDw8PDw8PDw8PDw8P////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAeAAAAAAAAAAbAyfj2eAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MoxAAUw2KeVEsQAkIkDmTkUGOgBbOuTDLgeBB4PDgwI/CE4OHQcBAMYE/B/4P+QfgQdCDoQd/oEPKv/rSrkPvt4uJLjzYcgLJkBLhsz8QHLHONELRyivykv2s/2+K4mb6HsbiiuOy8aVbk6sQE1ZhjqbMRdQAjgh1A+hQJHLMAQ6ipxEcSDJEqAT5QSCwGUCVDECOXKRQYQ0Q7vQxA5dVMAQQoWysxCZgp2NE0GG0F+WqUylUUGIaRky1A4FAMYUA5VAhwzRAEsFzORgViVByk4Syr/czU0kmlcr9ec08nVXNz/+MoxA8ZKyq0AGsQvDU3O9KmZffHp7TW73LnZplsyttZ59+/HvvFet22dtZ2y7LWtrrW7vSt1tc7Nd3Z613ed6960r8fus61L9estmvXdnbtlta3ve7TTibmeWvVzbmcl7R5Wa1dy53Z13qs6mZ3Jbl1y23ttZltv9a2+cZ+7acltnWdJJDctu7usDvaV2WtZ29ttrNNNt/bOt6mcYf9Xm1O9La2m7bskziRNiZHuXNvOS3d2W7u2dpzNsXNaZr73/vZX/G1Ju93O//f+7la2yNNexFU7yADsU7/+MoxAYRsXbVvsGHBCNYkVkpBYryXCU6KJdCGzWS0snWlaVq0VZbR9nWTPOlrO1LW5Wa35Zm3TMv3da1fX/Za1Kel//+t//fTZ/t5r7f/erzXbf//733W3//Vo9q618fn1uzPivf07d+a1+TVPU2qdEjQ0likVNPGoquaqvmohxB6aoMXnEHVOVIm5oyLryZGUXUFTMy/NLTtO131///8wf////9L+vNXf////+3/+73//u5H28UJgpa1YkokGUWSSDJgzaZnJqr/+MoxBQSU0L4AMJSkMqt8lqla1NXlq03MjShS1TVZRRRSKkkiqEyKORuZDeZLJZFaG9NTdlaVr///+1////uZf////////9////ef///////vmUiQRDJVokIEkTImExI0kUjQmRpLZLSdJSdaVdVXZTUtNU1TNJVdcy6UUVJoZC1KVNDOojEVTM5/1Zn/////9sv////tf///////7lf////////FVrJdKJNEOhAikEinkZRI0iyLREkskojbrbrWq/qkaUiVVVMmaRQkBm2USSK/+MoxBsSYyMAAMJSfKwVVMXoTHmoiQZdmYiQRdWMhqpDKZFa0uXTO40kSpLZm2qqppKQwgUVSrA0esBFAszWqaa1Uqmt1NJUv/loqmRNFIqqJkS1qVCYTEx0KIiZipClFVE6hpFxNNBP7+mkIqUVVaKrmVKmTJCFAJiYoLhoiKtQpf3pEwwCAchQgUxYY1AoLFhIUI7GiFBlPCYzLTXZk+lV1TUfsVWqaW6St//////////////8zUtSFKBFEUioTBAYR11IZjaUcxQmDxEPOCgH/+MoxBgRsvFHhSiAA5MCRYFCQwJDQBD+CB/4JP/ggf8CQ/LlxVNiiI0H0DSCvDQ0LlzGxE6JBESPieGJlbNMk1v////9JKv/////6qmVQyNqlJlUTKoyVKUpUqVRsqjZJSSVRskqqNkmSqSRlZVIzJWyyVqlmSSGwcmVbFAUDBKArEVCSIYNa10hCqxT5RkrcwKmeEohAkslkkk0lkkkrqvqTf/+pKv///////9SSSaJJJdI1I0jXSNdIwNPRRREREVUVUtlQXUL/+MoxBwS0dLtXT2AA1ME5Kkk1YqRUioFQKgVZ6RUCpFQKoVIqBVipFSKgVQqRUY4qRUCpKoVIqBVipJNSKgVIqBVFUVRVFUVRVFUVRVFUkmpFSKkqiVJVFUVRVFUVRVFUVRVFUVRU9NX0XpoWBITxXlk0V8CRtCgUip9JH+j/R/o/0FfN/qS+CQtiuK60f6P9H+lfSfkLb6JoKi2Ymhkzk0kf/0f6P9JSRzJP0pvUvEcaONHGjjRxo40cBIYCQwEhgJDAKICQwEhgJDASOBYuEnBJJP/+MoxB4RyMGkBUlAAbipLSqKkiclElgVF0mmVWVTLJKqJP6qSKCSRUVAKi4clHxDQKBJEkTcdR8Q0KDYZxPlDQcHJbf///9ezdqUQpjNOdV/lPWd//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+MoxB8QEKkUA0tAAA==";

// Configure barcode formats
export const BARCODE_READER_CONFIG = {
  // Set formats to scan for using EnumBarcodeFormat
  barcodeFormats: [
    EnumBarcodeFormat.BF_QR_CODE,
    EnumBarcodeFormat.BF_EAN_13,
    EnumBarcodeFormat.BF_EAN_8,
    EnumBarcodeFormat.BF_UPC_A,
    EnumBarcodeFormat.BF_UPC_E,
    EnumBarcodeFormat.BF_CODE_128,
    EnumBarcodeFormat.BF_CODE_39,
    EnumBarcodeFormat.BF_CODE_93,
    EnumBarcodeFormat.BF_DATAMATRIX,
    EnumBarcodeFormat.BF_PDF417,
    EnumBarcodeFormat.BF_AZTEC
  ],
  // Scanning settings - improved for faster scanning
  scanSettings: {
    intervalTime: 50, // Faster scanning interval (was 100ms)
    maxNumberOfResults: 1
  },
  // Performance settings - optimized for speed
  timeout: 3000, // Reduced timeout for faster initialization (was 8000)
  deblurLevel: 2, // Lower deblur level for better speed (was 3)
  maxAlgorithmThreadCount: 1, // Single thread for faster startup
  // Video settings - optimized for speed
  videoSettings: {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 }, 
      height: { ideal: 720 }, 
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Set SDK loading with faster explicit settings
BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
// Fast loading mode - use type assertion to set loading strategy
try {
  // Use type assertion to access extended properties
  const extendedReader = BarcodeReader as unknown as typeof BarcodeReader & BarcodeReaderExtended;
  extendedReader.loadingStrategy = {
    priority: "speed", // Prioritize speed over accuracy
    lazyLoad: false
  };
} catch (e) {
  console.warn("Could not set loading strategy:", e);
}

// Global instance reference to improve reuse
let globalReaderInstance: BarcodeReader | null = null;
let isInitializing = false;
let hasWasmLoaded = false;

// Track initialization attempts
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 2;

/**
 * Initialize the Dynamsoft BarcodeReader SDK with speed optimization
 */
export const initializeDynamsoft = async () => {
  // Return immediately if already initialized
  if (hasWasmLoaded) {
    console.log("SDK already initialized, returning immediately");
    return true;
  }
  
  // Prevent multiple simultaneous initialization calls
  if (isInitializing) {
    console.log("Initialization already in progress, waiting...");
    // Wait for current initialization but with shorter timeout
    let waitTime = 0;
    const maxWaitTime = 1500; // 1.5 seconds maximum wait (was 3000)
    
    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isInitializing || hasWasmLoaded) {
          clearInterval(checkInterval);
          resolve(hasWasmLoaded);
        }
        
        waitTime += 50; // Check more frequently (was 100)
        if (waitTime >= maxWaitTime) {
          clearInterval(checkInterval);
          console.log("Waited too long for initialization, continuing anyway");
          resolve(false);
        }
      }, 50);
    });
  }
  
  // Track attempts
  initializationAttempts++;
  if (initializationAttempts > MAX_INIT_ATTEMPTS) {
    console.warn(`Exceeded maximum initialization attempts, returning true anyway`);
    hasWasmLoaded = true; // Force it to true to prevent further attempts
    return true;
  }
  
  isInitializing = true;
  
  try {
    console.log("Initializing Dynamsoft SDK with speed optimizations...");
    
    // Enhanced browser compatibility settings
    try {
      // @ts-ignore - Browser compatibility options
      BarcodeReader.browserFriendly = true;
      // @ts-ignore
      BarcodeReader.useImageSettings = true;
      // @ts-ignore - Optimize for speed
      BarcodeReader.loadWasmPriority = "speed";
      
      // Set up for all scanner instances
      // @ts-ignore - Set defaults for scanner
      BarcodeScanner.defaultUIElementURL = "";
      // @ts-ignore - Better browser compatibility
      BarcodeScanner.singleFrameMode = false;
      
      // Add faster initialization optimizations
      try {
        // @ts-ignore - Set loading mode to speed
        BarcodeReader.loadWasmMode = "wasm";
        // @ts-ignore - Skip version check for speed
        BarcodeReader.checkVersion = false;
      } catch (e) {
        console.warn("Could not optimize loading speed:", e);
      }
      
    } catch (e) {
      console.warn("Could not set some browser compatibility options:", e);
    }
    
    // Use a much shorter timeout for WASM loading
    const loadWasmPromise = BarcodeReader.loadWasm();
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("WASM loading timed out")), 2000); // Reduced from 5000
    });
    
    try {
      console.log("Loading WASM resources...");
      await Promise.race([loadWasmPromise, timeoutPromise]);
      hasWasmLoaded = true;
    } catch (e) {
      console.warn("WASM loading failed or timed out, continuing anyway:", e);
      
      // Assume it loaded even if it didn't - we'll detect issues when creating instances
      hasWasmLoaded = true;
    }
    
    // Pre-initialize scanner components for faster camera opening only for desktop
    try {
      // Access extended properties safely
      const extendedBarcodeScanner = BarcodeScanner as unknown as BarcodeScannerExtended;
      
      if (extendedBarcodeScanner.isDesktopBrowser && extendedBarcodeScanner.isDesktopBrowser()) {
        if (extendedBarcodeScanner.preloadModule) {
          // Set timeout for preload to prevent hanging
          const preloadPromise = extendedBarcodeScanner.preloadModule();
          const preloadTimeout = new Promise((resolve) => {
            setTimeout(resolve, 1000); // Only wait 1s max for preload
          });
          
          await Promise.race([preloadPromise, preloadTimeout]);
          console.log("Scanner module preloaded for desktop browser");
        }
      }
    } catch (e) {
      console.warn("Failed to preload scanner module, continuing:", e);
    }
    
    console.log("Dynamsoft SDK initialized successfully");
    return hasWasmLoaded;
  } catch (error) {
    console.error("Failed to initialize Dynamsoft SDK:", error);
    // Don't throw, just return false
    return false;
  } finally {
    isInitializing = false;
  }
};

/**
 * Get the global reader instance or create one if it doesn't exist
 * with optimized initialization
 */
export const getReaderInstance = async (): Promise<BarcodeReader> => {
  if (!globalReaderInstance) {
    try {
      // Don't wait for full initialization
      initializeDynamsoft();
      
      // Create instance with timeout to prevent hanging
      const createPromise = BarcodeReader.createInstance();
      const timeoutPromise = new Promise<BarcodeReader>((_, reject) => {
        setTimeout(() => reject(new Error("Create instance timed out")), 2000);
      });
      
      globalReaderInstance = await Promise.race([createPromise, timeoutPromise])
        .catch(() => {
          console.log("Create instance timed out, trying again");
          return BarcodeReader.createInstance();
        });
    } catch (error) {
      console.error("Failed to create reader instance:", error);
      throw error;
    }
  }
  
  return globalReaderInstance;
};

/**
 * Clean up Dynamsoft resources
 */
export const cleanupDynamsoft = async () => {
  if (globalReaderInstance) {
    try {
      await globalReaderInstance.destroyContext();
      globalReaderInstance = null;
      console.log("Cleaned up Dynamsoft resources");
    } catch (error) {
      console.error("Error cleaning up Dynamsoft resources:", error);
    }
  }
  
  // Also try to clean up scanner instances if any exist
  try {
    // Access extended properties safely
    const extendedBarcodeScanner = BarcodeScanner as unknown as BarcodeScannerExtended;
    
    if (extendedBarcodeScanner.cleanFrameBuffer) {
      await extendedBarcodeScanner.cleanFrameBuffer();
    }
  } catch (e) {
    console.warn("Error during scanner cleanup:", e);
  }
};
