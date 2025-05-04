
import { 
  HTMLCanvasElementLuminanceSource, 
  BinaryBitmap, 
  HybridBinarizer, 
  GlobalHistogramBinarizer,
  BrowserMultiFormatReader
} from '@zxing/library';

/**
 * Enhances canvas image for better barcode detection, especially with blurry images
 */
export const enhanceCanvasForBlurryBarcodes = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  try {
    // Get the image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Samsung S10 optimizations - more aggressive contrast enhancement
    const contrast = 1.8; // Higher contrast for Samsung screens
    const brightness = 15; // Higher brightness for better visibility
    const threshold = 128; // Mid-point for thresholding
    
    // Apply multi-stage image processing
    for (let i = 0; i < data.length; i += 4) {
      // Step 1: Convert to grayscale with optimal weights for Samsung displays
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      
      // Step 2: Apply contrast and brightness adjustments
      let newVal = (gray - threshold) * contrast + threshold + brightness;
      
      // Step 3: Apply adaptive thresholding based on local area
      if (i % (canvas.width * 16) === 0) { // Sample every few rows for performance
        // Check for areas that might contain barcodes (high contrast regions)
        let localContrast = 0;
        for (let j = -8; j <= 8; j += 2) {
          if (i + j * 4 >= 0 && i + j * 4 < data.length) {
            localContrast += Math.abs(data[i + j * 4] - data[i]);
          }
        }
        
        // In high contrast areas (likely barcode regions), increase sharpness
        if (localContrast > 200) {
          newVal = newVal > threshold ? 255 : 0; // Binary threshold for barcode-like areas
        }
      }
      
      // Apply the enhanced values
      data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newVal));
    }
    
    // Put the modified pixels back
    context.putImageData(imageData, 0, 0);
    
    // For debugging - capture processed frames occasionally
    if (Math.random() < 0.01) { // 1% of frames
      console.log("Enhanced frame for blur reduction applied");
    }
  } catch (e) {
    console.error("Error enhancing image:", e);
    // Continue without enhancement if it fails
  }
};

/**
 * Try different binarizer methods for better barcode detection
 */
export const tryMultipleBinarizers = (
  luminanceSource: HTMLCanvasElementLuminanceSource,
  codeReader: BrowserMultiFormatReader
): string | null => {
  try {
    // Try HybridBinarizer first (good for most cases)
    const hybridBinarizer = new HybridBinarizer(luminanceSource);
    const hybridBitmap = new BinaryBitmap(hybridBinarizer);
    
    try {
      const result = codeReader.decodeBitmap(hybridBitmap);
      if (result) {
        return result.getText();
      }
    } catch (err) {
      // Silent failure - try other method
    }
    
    // Fall back to GlobalHistogramBinarizer (sometimes better for blurry codes)
    const histogramBinarizer = new GlobalHistogramBinarizer(luminanceSource);
    const histogramBitmap = new BinaryBitmap(histogramBinarizer);
    
    try {
      const result = codeReader.decodeBitmap(histogramBitmap);
      if (result) {
        return result.getText();
      }
    } catch (err) {
      // Silent failure
    }
    
    return null; // No barcode found with either method
  } catch (err) {
    return null;
  }
};

/**
 * Process different sections of an image for barcode detection
 */
export const processImageSections = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  codeReader: BrowserMultiFormatReader
): string | null => {
  // Define image sections to analyze
  const sections = [
    { x: 0, y: 0, w: canvas.width, h: canvas.height/2 },
    { x: 0, y: canvas.height/2, w: canvas.width, h: canvas.height/2 },
    { x: 0, y: 0, w: canvas.width/2, h: canvas.height },
    { x: canvas.width/2, y: 0, w: canvas.width/2, h: canvas.height },
    { x: canvas.width/4, y: canvas.height/4, w: canvas.width/2, h: canvas.height/2 }
  ];
  
  for (const section of sections) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      video, 
      section.x, section.y, section.w, section.h,
      0, 0, canvas.width, canvas.height
    );
    enhanceCanvasForBlurryBarcodes(context, canvas);
    const sectionLuminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
    const barcodeValue = tryMultipleBinarizers(sectionLuminanceSource, codeReader);
    
    if (barcodeValue && barcodeValue.trim() !== '') {
      return barcodeValue;
    }
  }
  
  return null;
};
