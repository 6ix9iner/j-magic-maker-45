
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
    intervalTime: 100, // Increased interval for more reliable operation
    maxNumberOfResults: 1
  },
  // Performance settings - optimized for reliable operation
  timeout: 1000, // Increased timeout for more reliable initialization
  deblurLevel: 0, // Lowest deblur level for maximum speed
  maxAlgorithmThreadCount: 1, // Single thread for faster startup
  // Video settings - balanced resolution for reliability
  videoSettings: {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 640 }, // Increased from 320 to 640 for better recognition
      height: { ideal: 480 }, // Increased from 240 to 480
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Safety flags to prevent multiple license initialization
let licenseInitialized = false;
let hasWasmLoaded = false;
let isInitializing = false;

// Track active scanner instances
let activeInstances = new Set();

// Initialize with a direct approach that only sets the license once
export const ensureLicenseIsSet = async () => {
  if (typeof window === 'undefined') return; // Server-side safety check
  
  // Skip if already initialized
  if (licenseInitialized) {
    console.log("License already initialized, skipping");
    return;
  }

  // Use global window flag to ensure license is only set once across hot reloads
  // @ts-ignore - Access window as global storage
  if (window._dynamsoft_license_initialized) {
    licenseInitialized = true;
    console.log("License already initialized via window flag");
    return;
  }
  
  try {
    console.log("Setting Dynamsoft license");
    
    // Set license key only if it hasn't been set before
    BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
    
    // Make sure to use consistent CDN version to avoid issues
    BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
    
    // Set up more reliable initialization
    try {
      // Reset all global Dynamsoft configuration settings for a clean start
      // @ts-ignore - Need to access internal properties for reset
      if (BarcodeScanner._onReadyEventEmitter) {
        // @ts-ignore - Reset internal event system
        BarcodeScanner._onReadyEventEmitter = null;
      }
      
      // Ensure consistent UI element URL
      BarcodeScanner.defaultUIElementURL = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/dbr.ui.html";
      
      // Enable more detailed logging for debugging
      // @ts-ignore - Debug property may not be in types
      BarcodeScanner._bUseFullFeature = true;
    } catch (e) {
      console.warn("Non-critical error during scanner configuration:", e);
    }
    
    // Mark as initialized globally to prevent duplicate initialization attempts
    licenseInitialized = true;
    // @ts-ignore - Access window as global storage
    window._dynamsoft_license_initialized = true;
    
    console.log("License initialized successfully");
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
      throw e; // Rethrow to be handled higher up
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
        
        waited += 50; // Check every 50ms for better responsiveness
        if (waited >= 3000) { // 3s maximum wait for initialization
          clearInterval(interval);
          console.log("Waited too long for initialization, continuing anyway");
          resolve(true);
        }
      }, 50);
    });
  }
  
  isInitializing = true;
  
  try {
    console.log("Initializing Dynamsoft SDK with reliability optimizations...");
    
    // Attempt to load WASM if not already loaded
    if (!hasWasmLoaded) {
      try {
        await BarcodeReader.loadWasm();
        hasWasmLoaded = true;
      } catch (e) {
        console.error("Failed to load Dynamsoft WASM:", e);
        // Continue despite error, browser might recover
      }
    }
    
    return hasWasmLoaded;
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
 * Clean up Dynamsoft resources - improved with better camera resource management
 */
export const cleanupDynamsoft = async () => {
  try {
    console.log("Running comprehensive Dynamsoft cleanup");
    
    // Clean frame buffer if available
    const extendedBarcodeScanner = BarcodeScanner as unknown as BarcodeScannerExtended;
    if (extendedBarcodeScanner.cleanFrameBuffer) {
      await extendedBarcodeScanner.cleanFrameBuffer();
    }
    
    // Get access to internal scanners array for thorough cleanup
    try {
      // @ts-ignore - Access internal array of scanners for cleanup
      if (BarcodeScanner._scanners && BarcodeScanner._scanners.length > 0) {
        // @ts-ignore - Clear internal scanner array
        for (const scanner of BarcodeScanner._scanners) {
          try {
            if (scanner) {
              // First try to stop the scanner if it's running
              try {
                await scanner.stop();
                console.log("Scanner stopped during cleanup");
              } catch (e) {
                console.warn("Error stopping scanner during cleanup:", e);
              }
              
              // Then destroy its context
              try {
                await scanner.destroyContext();
                console.log("Scanner context destroyed");
              } catch (e) {
                console.warn("Error destroying scanner context:", e);
              }
            }
          } catch (e) {
            console.warn("Error during scanner cleanup:", e);
          }
        }
        
        // Reset scanner array when done
        // @ts-ignore - Reset scanner array
        BarcodeScanner._scanners = [];
      }
    } catch (e) {
      console.warn("Non-critical error during scanner array cleanup:", e);
    }
    
    // Release any active camera streams
    try {
      const videoTracks = document.querySelectorAll('video');
      videoTracks.forEach(video => {
        try {
          if (video.srcObject) {
            // @ts-ignore - Access media stream
            const stream = video.srcObject;
            if (stream && stream.getTracks) {
              const tracks = stream.getTracks();
              tracks.forEach(track => {
                try {
                  if (track.readyState === 'live') {
                    track.stop();
                    console.log("Stopped video track");
                  }
                } catch (e) {
                  console.warn("Error stopping video track:", e);
                }
              });
            }
            video.srcObject = null;
          }
        } catch (e) {
          console.warn("Error cleaning up video element:", e);
        }
      });
    } catch (e) {
      console.warn("Error during video cleanup:", e);
    }
    
    console.log("Dynamsoft cleanup complete");
  } catch (e) {
    console.warn("Error during full Dynamsoft cleanup:", e);
  }
};

// Reset all Dynamsoft resources on page unload
if (typeof window !== 'undefined') {
  // @ts-ignore - Add unload handler
  window.addEventListener('beforeunload', async () => {
    await cleanupDynamsoft();
  });
}

// Immediately initialize the license
ensureLicenseIsSet().catch(console.error);

