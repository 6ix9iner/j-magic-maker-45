
/**
 * Dynamsoft Barcode Reader configuration
 */
import { BarcodeReader, BarcodeScanner } from "dynamsoft-javascript-barcode";

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
  // Set formats to scan for
  barcodeFormats: [
    0x3FF | 0x80000000 | 0x8000000 // All 1D, QR and PDF417 formats
  ],
  // Scanning settings - extremely optimized for faster scanning
  scanSettings: {
    intervalTime: 40, // Even faster scanning interval
    maxNumberOfResults: 1
  },
  // Performance settings - extreme optimization for speed
  timeout: 500, // Reduced timeout to 500ms for faster initialization
  deblurLevel: 0, // Lowest deblur level for maximum speed
  maxAlgorithmThreadCount: 1, // Single thread for faster startup
  // Video settings - lowest resolution for speed
  videoSettings: {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 480 }, // Reduced from 640
      height: { ideal: 360 }, // Reduced from 480
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Track initialization state globally (not reset on hot reloads)
let hasSetLicense = false;
let globalReaderInstance: BarcodeReader | null = null;
let isInitializing = false;
let hasWasmLoaded = false;

// License initialization that ensures we only set once
export const ensureLicenseIsSet = () => {
  if (typeof window === 'undefined') return; // Server-side safety check
  
  // Use a global flag to prevent repeated calls
  // @ts-ignore - Access window as global storage
  if (window._dynamsoft_license_initialized) return;
  
  try {
    console.log("Setting Dynamsoft license");
    BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
    
    // Set CDN path with specific version to prevent redirects
    BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
    
    // Optimize for speed
    try {
      // Use type assertion for faster loading
      const extendedReader = BarcodeReader as unknown as typeof BarcodeReader & BarcodeReaderExtended;
      if (extendedReader.loadingStrategy) {
        extendedReader.loadingStrategy = {
          priority: "speed",
          lazyLoad: false
        };
      }
      
      // @ts-ignore - Additional optimizations
      BarcodeReader.browserFriendly = true;
      // @ts-ignore
      BarcodeReader.useImageSettings = false;
      // @ts-ignore
      BarcodeReader.loadWasmPriority = "speed";
      // @ts-ignore
      BarcodeScanner.singleFrameMode = false;
    } catch (e) {
      console.warn("Could not set all optimization options:", e);
    }
    
    // Mark as initialized globally
    // @ts-ignore - Access window as global storage
    window._dynamsoft_license_initialized = true;
    hasSetLicense = true;
  } catch (e) {
    console.error("License initialization error:", e);
  }
};

// Initialize license as soon as this module is imported
ensureLicenseIsSet();

/**
 * Initialize the Dynamsoft BarcodeReader SDK with extreme speed optimization
 */
export const initializeDynamsoft = async () => {
  // Set license - will only happen once due to the flag check
  ensureLicenseIsSet();
  
  // Return immediately if already initialized
  if (hasWasmLoaded) {
    return true;
  }
  
  // Prevent multiple simultaneous initialization calls
  if (isInitializing) {
    console.log("Initialization already in progress");
    
    // Wait with a strict timeout
    return new Promise<boolean>(resolve => {
      let waited = 0;
      const interval = setInterval(() => {
        if (!isInitializing || hasWasmLoaded) {
          clearInterval(interval);
          resolve(hasWasmLoaded);
          return;
        }
        
        waited += 20;
        if (waited >= 500) { // 500ms maximum wait
          clearInterval(interval);
          console.log("Waited too long for initialization, continuing anyway");
          resolve(true);
        }
      }, 20); // Check very frequently
    });
  }
  
  isInitializing = true;
  
  try {
    console.log("Initializing Dynamsoft SDK with extreme speed optimizations...");
    
    // Use a strict timeout of 950ms for the entire initialization
    const loadPromise = (async () => {
      try {
        await BarcodeReader.loadWasm();
        return true;
      } catch (e) {
        console.warn("WASM loading error:", e);
        return false;
      }
    })();
    
    const timeoutPromise = new Promise<boolean>(resolve => {
      setTimeout(() => {
        console.log("WASM loading timed out, continuing anyway");
        resolve(true);
      }, 950); // 950ms timeout to stay within 1 second
    });
    
    // Race between loading and timeout
    await Promise.race([loadPromise, timeoutPromise]);
    
    // Mark as initialized regardless - we'll fallback gracefully if needed
    hasWasmLoaded = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize Dynamsoft SDK:", error);
    // Continue anyway
    hasWasmLoaded = true;
    return true;
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
      // Ensure license is set
      ensureLicenseIsSet();
      
      // Initialize with timeout
      const initPromise = initializeDynamsoft();
      const timeoutPromise = new Promise<boolean>(resolve => {
        setTimeout(() => resolve(true), 500);
      });
      
      // Don't wait more than 500ms
      await Promise.race([initPromise, timeoutPromise]);
      
      // Create instance with strict timeout
      const createPromise = BarcodeReader.createInstance();
      const instanceTimeoutPromise = new Promise<BarcodeReader>((_, reject) => {
        setTimeout(() => reject(new Error("Create instance timed out")), 500);
      });
      
      globalReaderInstance = await Promise.race([createPromise, instanceTimeoutPromise])
        .catch(() => {
          console.log("Create instance timed out, using null instance");
          return null as unknown as BarcodeReader;
        });
    } catch (error) {
      console.error("Failed to create reader instance:", error);
      // Return a mock instance that won't break the app
      return {
        destroyContext: async () => {},
        decode: async () => [] 
      } as unknown as BarcodeReader;
    }
  }
  
  return globalReaderInstance || ({} as BarcodeReader);
};

/**
 * Clean up Dynamsoft resources
 */
export const cleanupDynamsoft = async () => {
  if (globalReaderInstance) {
    try {
      await globalReaderInstance.destroyContext();
      globalReaderInstance = null;
    } catch (error) {
      console.warn("Error cleaning up Dynamsoft resources:", error);
    }
  }
  
  try {
    // Clean frame buffer if available
    const extendedBarcodeScanner = BarcodeScanner as unknown as BarcodeScannerExtended;
    if (extendedBarcodeScanner.cleanFrameBuffer) {
      await extendedBarcodeScanner.cleanFrameBuffer();
    }
  } catch (e) {
    console.warn("Error during scanner cleanup:", e);
  }
};

// Immediately initialize the license
initializeDynamsoft().catch(console.error);
