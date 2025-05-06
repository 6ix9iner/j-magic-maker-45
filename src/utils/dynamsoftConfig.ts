
/**
 * Dynamsoft Barcode Reader configuration
 */
import { BarcodeReader, BarcodeScanner, EnumBarcodeFormat } from "dynamsoft-javascript-barcode";

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
    intervalTime: 100, // More reliable scanning interval (was 20ms)
    maxNumberOfResults: 1
  },
  // Performance settings - optimized for reliability
  timeout: 10000, // Increased timeout for more reliable initialization
  deblurLevel: 3, // Higher deblur level for better recognition
  maxAlgorithmThreadCount: 2, // Two threads for better performance
  // Video settings - improved for compatibility
  videoSettings: {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 }, // Higher resolution for better scanning
      height: { ideal: 720 }, // Higher resolution for better scanning
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Improve SDK loading with explicit settings
BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";

// Global instance reference to improve reuse
let globalReaderInstance: BarcodeReader | null = null;
let isInitializing = false;
let hasWasmLoaded = false;

/**
 * Initialize the Dynamsoft BarcodeReader SDK with optimized performance
 */
export const initializeDynamsoft = async () => {
  // Prevent multiple simultaneous initialization
  if (isInitializing) {
    console.log("Initialization already in progress...");
    // Wait for the current initialization to complete
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isInitializing) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });
    return hasWasmLoaded;
  }
  
  // Return immediately if already initialized
  if (hasWasmLoaded) {
    console.log("SDK already initialized, skipping...");
    return true;
  }
  
  isInitializing = true;
  
  try {
    console.log("Initializing Dynamsoft SDK...");
    
    // Enhanced browser compatibility settings
    try {
      // @ts-ignore - Browser compatibility options
      BarcodeReader.browserFriendly = true;
      // @ts-ignore
      BarcodeReader.useImageSettings = true;
      // @ts-ignore
      BarcodeReader.loadWasmPriority = "speed";
      
      // Set up for all scanner instances
      // @ts-ignore - Set defaults for scanner
      BarcodeScanner.defaultUIElementURL = "";
      // @ts-ignore - Better browser compatibility
      BarcodeScanner.singleFrameMode = false;
    } catch (e) {
      console.warn("Could not set some browser compatibility options:", e);
    }
    
    // Force clean initialization each time
    try {
      // @ts-ignore - Reset initialization if any issues occur
      BarcodeReader._bInitialized = false;
      // @ts-ignore - Clear any old instances
      BarcodeScanner._onCameraSelectionChanged = undefined;
      // @ts-ignore - Just in case, reset any worker state
      BarcodeScanner.bUseDefaultUIElement = false;
    } catch (e) {
      console.warn("Error during reset:", e);
    }
    
    // Faster SDK loader - load WASM resources
    try {
      console.log("Loading WASM resources...");
      await BarcodeReader.loadWasm();
      hasWasmLoaded = true;
    } catch (e) {
      console.warn("WASM loading failed, will retry:", e);
      // Force a new attempt
      try {
        console.log("Retrying WASM load...");
        // @ts-ignore - Reset the initialization state
        BarcodeReader._bInitialized = false;
        await BarcodeReader.loadWasm();
        hasWasmLoaded = true;
      } catch (retryError) {
        console.error("Failed to initialize BarcodeReader after retry:", retryError);
        throw new Error("Failed to initialize scanner components");
      }
    }
    
    // Pre-initialize scanner components for faster camera opening
    try {
      if (BarcodeScanner.isDesktopBrowser()) {
        await BarcodeScanner.preloadModule();
        console.log("Scanner module preloaded for desktop browser");
      }
    } catch (e) {
      console.warn("Failed to preload scanner module:", e);
    }
    
    console.log("Dynamsoft SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Dynamsoft SDK:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

/**
 * Get the global reader instance or create one if it doesn't exist
 */
export const getReaderInstance = async (): Promise<BarcodeReader> => {
  if (!globalReaderInstance) {
    try {
      await initializeDynamsoft();
      globalReaderInstance = await BarcodeReader.createInstance();
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
    // @ts-ignore - Attempt to clean up any global state
    if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.cleanFrameBuffer) {
      await BarcodeScanner.cleanFrameBuffer();
    }
  } catch (e) {
    console.warn("Error during scanner cleanup:", e);
  }
};
