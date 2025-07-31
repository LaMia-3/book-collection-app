/**
 * CacheResetListener.ts
 * 
 * Provides a utility to detect when storage has been reset and invalidate
 * any in-memory caches to ensure services don't use stale data
 */

// Event name for reset notifications
export const STORAGE_RESET_EVENT = 'bookapp:storage-reset';

/**
 * Creates and dispatches a custom event to notify services when storage has been reset
 */
export function notifyStorageReset(): void {
  const resetEvent = new CustomEvent(STORAGE_RESET_EVENT);
  document.dispatchEvent(resetEvent);
  console.log('Storage reset event dispatched');
  
  // Also store reset timestamp in localStorage for services that initialize later
  localStorage.setItem('storage_reset_timestamp', Date.now().toString());
}

/**
 * Adds a listener for storage reset events
 * @param callback Function to execute when storage has been reset
 * @returns Cleanup function to remove the listener
 */
export function addStorageResetListener(callback: () => void): () => void {
  const handler = () => {
    console.log('Storage reset detected, running callback');
    callback();
  };
  
  document.addEventListener(STORAGE_RESET_EVENT, handler);
  
  return () => {
    document.removeEventListener(STORAGE_RESET_EVENT, handler);
  };
}

/**
 * Checks if storage has been reset since the provided timestamp
 * @param lastCheckTime Timestamp to check against
 * @returns True if storage has been reset since lastCheckTime
 */
export function hasStorageBeenResetSince(lastCheckTime: number): boolean {
  const resetTimestamp = localStorage.getItem('storage_reset_timestamp');
  if (!resetTimestamp) return false;
  
  const resetTime = parseInt(resetTimestamp, 10);
  return resetTime > lastCheckTime;
}
