
/**
 * Utilities for creating and managing DOM elements for Dynamsoft barcode scanning
 */

/**
 * Creates a properly configured video container element for the Dynamsoft barcode scanner
 */
export const createDynamicVideoContainer = (): HTMLElement => {
  const videoContainer = document.createElement('div');
  videoContainer.className = 'dce-video-container';
  
  // Set required styles for proper scanner operation
  videoContainer.style.position = 'absolute';
  videoContainer.style.left = '0';
  videoContainer.style.top = '0';
  videoContainer.style.width = '100%';
  videoContainer.style.height = '100%';
  videoContainer.style.backgroundColor = 'black';
  
  return videoContainer;
};

/**
 * Sets up the barcode scanner container in a parent element
 */
export const setupScannerContainer = (
  containerElement: HTMLDivElement, 
  removeExisting = false
): boolean => {
  if (!containerElement) return false;
  
  try {
    // Remove existing container if requested
    if (removeExisting) {
      const existingContainer = containerElement.querySelector('.dce-video-container');
      if (existingContainer) {
        existingContainer.remove();
      }
    }
    
    // Only create a new container if one doesn't exist
    if (!containerElement.querySelector('.dce-video-container')) {
      const videoContainer = createDynamicVideoContainer();
      containerElement.appendChild(videoContainer);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up scanner container:', error);
    return false;
  }
};

/**
 * Prepares an overlay element for barcode scanner UI
 */
export const setupScannerOverlayElement = (
  overlayElement: HTMLDivElement
): void => {
  if (!overlayElement) return;
  
  // Add required classes for Dynamsoft
  overlayElement.classList.add('dce-video-container-overlay');
  
  // Ensure parent container is properly configured
  const parentElement = overlayElement.parentElement;
  if (parentElement) {
    (parentElement as HTMLElement).style.position = 'relative';
  }
};

/**
 * Clean up any barcode scanner DOM elements
 */
export const cleanupScannerDOM = (
  containerElement?: HTMLDivElement | null
): void => {
  if (!containerElement) return;
  
  // Remove video container
  const videoContainer = containerElement.querySelector('.dce-video-container');
  if (videoContainer) {
    videoContainer.remove();
  }
  
  // Clean up any video elements that might still be active
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.srcObject) {
      try {
        const stream = video.srcObject as MediaStream;
        if (stream && typeof stream.getTracks === 'function') {
          const tracks = stream.getTracks();
          tracks.forEach(track => {
            try {
              if (track.readyState === 'live') {
                track.stop();
              }
            } catch (e) {
              console.warn('Error stopping video track:', e);
            }
          });
        }
        video.srcObject = null;
      } catch (e) {
        console.warn('Error cleaning up video element:', e);
      }
    }
  });
};

/**
 * Utility to ensure an element for video mounting is ready
 */
export const ensureVideoMountPoint = (
  containerRef: React.RefObject<HTMLDivElement>
): HTMLElement | null => {
  if (!containerRef.current) return null;
  
  let videoContainer = containerRef.current.querySelector('.dce-video-container');
  if (!videoContainer) {
    // Create the container if it doesn't exist
    videoContainer = createDynamicVideoContainer();
    containerRef.current.appendChild(videoContainer);
    console.log("Created dce-video-container element");
  }
  
  return videoContainer as HTMLElement;
};
