
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
  // Set formats to scan for - focusing on the most common formats for faster scanning
  barcodeFormats: [
    0x3FF | 0x1000000 | 0x2000000 // Most common 1D formats and QR code for speed
  ],
  // Scanning settings - extremely optimized for faster scanning
  scanSettings: {
    intervalTime: 30, // Even faster scanning interval (reduced from 40ms)
    maxNumberOfResults: 1
  },
  // Performance settings - extreme optimization for speed
  timeout: 400, // Reduced timeout to 400ms for faster initialization (reduced from 500ms)
  deblurLevel: 0, // Lowest deblur level for maximum speed
  maxAlgorithmThreadCount: 1, // Single thread for faster startup
  // Video settings - lowest resolution for speed
  videoSettings: {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 320 }, // Reduced from 480 to 320 for faster initialization
      height: { ideal: 240 }, // Reduced from 360 to 240
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Safety flag to prevent multiple license initialization
let licenseInitialized = false;
let hasWasmLoaded = false;
let isInitializing = false;

// Initialize with a direct approach that only sets the license once
export const ensureLicenseIsSet = () => {
  if (typeof window === 'undefined') return; // Server-side safety check
  
  // Skip if already initialized
  if (licenseInitialized) return;

  // Use global window flag to ensure license is only set once across hot reloads
  // @ts-ignore - Access window as global storage
  if (window._dynamsoft_license_initialized) {
    licenseInitialized = true;
    return;
  }
  
  try {
    console.log("Setting Dynamsoft license");
    
    // Set license key only if it hasn't been set before
    BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
    
    // Set CDN path with specific version to prevent redirects
    BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
    
    // Extreme speed optimizations
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
    licenseInitialized = true;
    // @ts-ignore - Access window as global storage
    window._dynamsoft_license_initialized = true;
  } catch (e) {
    // If error contains "license is not allowed to change", it means the license was already set
    if (e instanceof Error && e.message && e.message.includes('not allowed to change')) {
      // License is already set, mark as initialized
      licenseInitialized = true;
      // @ts-ignore - Access window as global storage
      window._dynamsoft_license_initialized = true;
    } else {
      console.error("License initialization error:", e);
    }
  }
};

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
        
        waited += 10; // Reduced from 20ms to 10ms check interval
        if (waited >= 300) { // 300ms maximum wait (reduced from 500ms)
          clearInterval(interval);
          console.log("Waited too long for initialization, continuing anyway");
          resolve(true);
        }
      }, 10); // Check very frequently (reduced from 20ms to 10ms)
    });
  }
  
  isInitializing = true;
  
  try {
    console.log("Initializing Dynamsoft SDK with extreme speed optimizations...");
    
    // Use a strict timeout of 400ms for the entire initialization (reduced from 950ms)
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
      }, 400); // 400ms timeout (reduced from 950ms)
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
 * Clean up Dynamsoft resources
 */
export const cleanupDynamsoft = async () => {
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
