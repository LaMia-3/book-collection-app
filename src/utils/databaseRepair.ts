import { createLogger } from './loggingUtils';
import { IndexedDBService } from '@/services/storage/IndexedDBService';

const log = createLogger('DatabaseRepair');
const indexedDBService = new IndexedDBService();

/**
 * Adds a floating database repair button to the UI
 * This should only be used in development mode or when database issues are detected
 */
export function addDatabaseRepairButton(): void {
  // Only run in browser environment
  if (typeof document === 'undefined') return;
  
  log.info('Adding database repair button to UI');
  
  try {
    // Check if button already exists
    if (document.getElementById('db-repair-button')) {
      log.info('Database repair button already exists');
      return;
    }
    
    // Create container for the button
    const container = document.createElement('div');
    container.id = 'db-repair-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    
    // Create the button
    const button = document.createElement('button');
    button.id = 'db-repair-button';
    button.innerText = '🛠️ Repair Database';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#f43f5e';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    // Add hover effect
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#e11d48';
    });
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '#f43f5e';
    });
    
    // Add click handler
    button.addEventListener('click', async () => {
      log.info('Database repair button clicked');
      
      // Show repair dialog
      showRepairDialog();
    });
    
    // Add button to container
    container.appendChild(button);
    
    // Add container to document
    document.body.appendChild(container);
    
    log.info('Database repair button added to UI');
  } catch (error) {
    log.error('Failed to add database repair button', { error: String(error) });
  }
}

/**
 * Shows a modal dialog for database repair options
 */
function showRepairDialog(): void {
  try {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.zIndex = '10000';
    backdrop.style.display = 'flex';
    backdrop.style.justifyContent = 'center';
    backdrop.style.alignItems = 'center';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '90%';
    modal.style.maxWidth = '500px';
    modal.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    
    // Create modal header
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    
    const title = document.createElement('h2');
    title.innerText = 'Database Repair Utility';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '20px';
    
    const description = document.createElement('p');
    description.innerText = 'Use these tools to fix database issues. Only use when experiencing problems.';
    description.style.margin = '0';
    description.style.color = '#666';
    description.style.fontSize = '14px';
    
    header.appendChild(title);
    header.appendChild(description);
    
    // Create status area
    const statusArea = document.createElement('div');
    statusArea.id = 'db-repair-status';
    statusArea.style.padding = '10px';
    statusArea.style.marginBottom = '20px';
    statusArea.style.borderRadius = '4px';
    statusArea.style.display = 'none';
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'space-between';
    buttonsContainer.style.marginTop = '20px';
    
    // Create repair button
    const repairButton = document.createElement('button');
    repairButton.innerText = '🔄 Repair Database';
    repairButton.style.padding = '10px 15px';
    repairButton.style.backgroundColor = '#3b82f6';
    repairButton.style.color = 'white';
    repairButton.style.border = 'none';
    repairButton.style.borderRadius = '4px';
    repairButton.style.cursor = 'pointer';
    repairButton.style.fontWeight = 'bold';
    
    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.innerText = '⚠️ Reset Database';
    resetButton.style.padding = '10px 15px';
    resetButton.style.backgroundColor = '#f43f5e';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '4px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.fontWeight = 'bold';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.padding = '10px 15px';
    closeButton.style.backgroundColor = '#e5e7eb';
    closeButton.style.color = '#374151';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    
    // Add click handlers
    repairButton.addEventListener('click', async () => {
      updateStatus('Checking database health...', 'info');
      
      try {
        const repaired = await indexedDBService.checkAndRepairDatabase();
        
        if (repaired) {
          updateStatus('Database repair completed successfully. Refresh the page to see changes.', 'success');
        } else {
          updateStatus('Database repair failed. Try resetting the database instead.', 'error');
        }
      } catch (error) {
        updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    });
    
    resetButton.addEventListener('click', async () => {
      if (!window.confirm('WARNING: This will delete all your data! Are you sure you want to reset the database?')) {
        return;
      }
      
      updateStatus('Resetting database...', 'info');
      
      try {
        await indexedDBService.resetDatabase();
        updateStatus('Database reset successful. Refresh the page to start fresh.', 'success');
      } catch (error) {
        updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    });
    
    closeButton.addEventListener('click', () => {
      document.body.removeChild(backdrop);
    });
    
    // Add buttons to container
    buttonsContainer.appendChild(repairButton);
    buttonsContainer.appendChild(resetButton);
    buttonsContainer.appendChild(closeButton);
    
    // Add all elements to modal
    modal.appendChild(header);
    modal.appendChild(statusArea);
    modal.appendChild(buttonsContainer);
    
    // Add modal to backdrop
    backdrop.appendChild(modal);
    
    // Add backdrop to document
    document.body.appendChild(backdrop);
  } catch (error) {
    log.error('Failed to show repair dialog', { error: String(error) });
  }
}

/**
 * Updates the status area in the repair dialog
 */
function updateStatus(message: string, type: 'info' | 'success' | 'error'): void {
  const statusArea = document.getElementById('db-repair-status');
  if (!statusArea) return;
  
  statusArea.style.display = 'block';
  statusArea.innerText = message;
  
  switch (type) {
    case 'info':
      statusArea.style.backgroundColor = '#e0f2fe';
      statusArea.style.color = '#0369a1';
      break;
    case 'success':
      statusArea.style.backgroundColor = '#dcfce7';
      statusArea.style.color = '#166534';
      break;
    case 'error':
      statusArea.style.backgroundColor = '#fee2e2';
      statusArea.style.color = '#b91c1c';
      break;
  }
}

/**
 * Checks if database errors are detected and adds repair button if needed
 */
export function checkForDatabaseErrors(): void {
  // Listen for custom events from IndexedDBService
  document.addEventListener('book-collection:notification', (event: Event) => {
    const detail = (event as CustomEvent).detail;
    
    if (
      detail?.source === 'IndexedDB' && 
      detail?.variant === 'destructive' && 
      detail?.title?.includes('Error')
    ) {
      log.warn('Database error detected, adding repair button');
      addDatabaseRepairButton();
    }
  });
}

/**
 * Initialize database error detection
 * Call this function early in your application startup
 */
export function initDatabaseErrorDetection(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      checkForDatabaseErrors();
    });
  }
}
