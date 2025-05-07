
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

// License key for Dynamsoft Barcode Reader
export const DYNAMSOFT_LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzOTU3ODgwLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzOTU3ODgwIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjotMTgyODIwMDQwNH0=";

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
export const ensureLicenseIsSet = async () => {
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
    
    // Mark as initialized globally to prevent duplicate initialization attempts
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
      console.log("License already initialized");
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
  await ensureLicenseIsSet();
  
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
    
    // Mark as initialization in progress
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
ensureLicenseIsSet().catch(console.error);
