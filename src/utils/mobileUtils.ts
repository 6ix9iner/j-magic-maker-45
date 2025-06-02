
/**
 * Mobile-specific utility functions for better performance and error handling
 */

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isSlowConnection = (): boolean => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  }
  return false;
};

export const getOptimalTimeout = (): number => {
  if (isSlowConnection()) {
    return 60000; // 60 seconds for slow connections
  }
  if (isMobileDevice()) {
    return 30000; // 30 seconds for mobile
  }
  return 15000; // 15 seconds for desktop
};

export const createTimeoutPromise = (timeout: number = getOptimalTimeout()) => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout - please check your connection')), timeout)
  );
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

export const simplifyDataForMobile = (data: any[], maxItems: number = 10): any[] => {
  if (!Array.isArray(data)) return [];
  return data.slice(0, maxItems);
};

export const logMobileDebug = (message: string, data?: any) => {
  if (isMobileDevice()) {
    console.log(`[MOBILE DEBUG] ${message}`, data);
  }
};
