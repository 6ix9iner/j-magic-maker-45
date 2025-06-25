/**
 * Creates configuration for the Dynamsoft barcode reader
 */
export const createBarcodeReaderConfig = () => {
  return {
    // Set formats to scan for
    barcodeFormats: [
      'QR_CODE', 
      'EAN_13',
      'EAN_8', 
      'UPC_A', 
      'UPC_E', 
      'CODE_128', 
      'CODE_39', 
      'CODE_93',
      'DATA_MATRIX',
      'PDF417',
      'AZTEC',
      'ITF',
      'CODABAR',
      'MAXICODE'
    ],
    // Enhanced performance settings
    scaleDownThreshold: 2300,
    timeout: 10000,
    region: {
      regionMeasuredByPercentage: 1,
      regionLeft: 5,
      regionTop: 5, 
      regionRight: 95,
      regionBottom: 95
    }
  };
};

/**
 * Get camera constraints optimized for device compatibility
 * 
 * More flexible camera constraints that work across different devices
 */
export const getCameraConstraints = (): MediaTrackConstraints => {
  // Use more flexible constraints that work on most devices
  return {
    // Request back camera if available, but don't require it
    facingMode: { ideal: 'environment' },
    // Request HD resolution but don't require it
    width: { ideal: 1280 },
    height: { ideal: 720 },
    // Reasonable framerate
    frameRate: { ideal: 30, min: 15 }
  };
};

// Beep sound for successful scan (base64 encoded)
export const BEEP_SOUND_URL = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAKAAAJTAAXFxcXJCQkJCQwMDAwPT09PT1JSUlJVlZWVlZiYmJib29vb295eXl5hoaGhoaTk5OToKCgoKCsrKystbW1tbXBwcHBzs7Ozs7a2tra5ubm5ub09PT0/v7+/v8AAAAAUE1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMuJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kMQAAAiNHWG1iYAI447zTqTQARbSfG5WJgAnBF+nDRJgBOx3J8KxGFTru0KhQKhwMBgMDx8fH8fBwH/4OA+D/8H/wfB//8Hwf//B8H//B8H//wH/4EA//xAP/8QD//EA//xAP/8QD//EA//wF2xBUHZH6kR9SEkj6R/iNH3d3d0REd3d3d0REX//////////////////+qqq7u7uqqqqqqu7u7qqqqqqu7u7qqqqqqqIiIiO7u7oiIiIju7u6IiIiI7u7uiIiIiHREX/////////////////////////////////////////////////////////////////////////8AAgIJiBBQGJYF4X+AQcZEfH5YFwX//B8H//B///////8QD//iAf/4CAf/4CJAOHj4/jwOAgGAwKhQKHcnBZx9CzuQoFAoHB6qqrUIddVVVVbh2191VVVVdw7fh2qqqqrhLexwl1VVVXVVlC3ucJdVVVVVVTtcOsO7h1VVVVVVWpVV3d3VEREREVVVVXV1dERERFVVVVdXV0REREVVVVXd3dERERE=";

// Dynamsoft license key configuration
export const DYNAMSOFT_LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA0MTkxNDUwLU1UQTBNVGt4TkRVd0xYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwNDE5MTQ1MCIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NkbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsImNoZWNrQ29kZSI6MTE3NTU5MTExNn0=";
