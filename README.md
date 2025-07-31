# Book Collection App

## Overview

A modern web application for tracking and managing your personal book collection.

## Features

- **Search and Add Books**: Add books to your collection via Google Books API or Open Library API
- **Multiple Views**: Display your collection as a visual bookshelf, list, cover grid, or insights dashboard
- **Book Management**: Track reading status, ratings, notes, and series information
- **Data Visualization**: View reading trends and statistics with the insights dashboard
- **Customization**: Personalize your bookshelf with different color palettes
- **Enhanced Search**: Advanced search capabilities with fuzzy matching and field-specific filtering
- **Import/Export**: Import and export your collection in CSV or JSON format
- **Local Storage**: Your data is stored locally using IndexedDB 

## Technology Stack

- **Frontend**: React with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Context API
- **Storage**: IndexedDB as the exclusive source of truth for all data
- **Build Tools**: Vite

## Getting Started

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

### Windows-Specific Instructions

The application is fully compatible with Windows. If you're using Windows, follow these additional steps for the best experience:

1. **Node.js Installation**:
   - Download and install Node.js from the [official website](https://nodejs.org/)
   - During installation, make sure to check the option to install necessary tools for native modules

2. **Command Line**:
   - You can use either Command Prompt, PowerShell, or Windows Terminal
   - For the best experience, we recommend using PowerShell

3. **Running the Application**:
   ```powershell
   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

4. **Troubleshooting Windows-Specific Issues**:
   - If you encounter ENOENT errors, ensure paths don't contain special characters
   - If you see permission errors, try running your terminal as Administrator
   - For any "node-gyp" related errors during installation, run:
     ```powershell
     npm install --global --production windows-build-tools
     ```

## Project Structure

- `/src/components`: UI components
- `/src/contexts`: React contexts for state management
- `/src/services`: Service layers for API and data management
- `/src/hooks`: Custom React hooks
- `/src/types`: TypeScript type definitions
- `/src/utils`: Utility functions

## Available Pages

### Main Pages
- **/** - Home page with main bookshelf view and collection management
- **/series** - Browse and manage all your book series
- **/series/:seriesId** - Detailed view of a specific series

### Admin and Debug Pages
- **/admin** - Admin dashboard with comprehensive debug tools:
  - Database Viewer - View and manage IndexedDB data stores
  - Data Migration - Tools for migrating between storage systems
  - Database Reset - Reset database to a clean state
  - IndexedDB Test - Verify the IndexedDB implementation
  - Backend Test - Test and verify backend API functionality

## Customization

The application supports theme customization through the Settings dialog, including:
- Preferred name for your library
- Birthday celebration notifications
- Default view mode selection
- API preferences
- Book spine color palettes

## Debugging

### Browser Console Debugging

1. **Access Chrome DevTools**:
   - Right-click anywhere on the page and select "Inspect" or press F12
   - Click on the "Console" tab to view errors and logs
   - Filter by error types using the dropdown menu (Errors, Warnings, Info)

2. **Network Debugging**:
   - Use the "Network" tab in DevTools to monitor API requests
   - Filter by XHR requests to focus on data fetching issues
   - Check for failed requests (red entries) or slow responses

### Server-Side Debugging

1. **Enable Verbose Logging**:
   ```sh
   # Run with debug output for Vite
   DEBUG=vite:* npm run dev
   
   # Run with debug output for React
   REACT_APP_DEBUG=true npm run dev
   ```

2. **Common Issues and Solutions**:
   - **CORS errors**: Check browser console for cross-origin issues
   - **White screen**: Look for JavaScript errors in the console
   - **Unresponsive UI**: Check for infinite loops or blocked main thread
   - **API failures**: Verify network requests and response codes

3. **Performance Debugging**:
   - Use the "Performance" tab in DevTools to record and analyze rendering
   - Look for long tasks that might be blocking the UI thread
   - Check for memory leaks in the "Memory" tab

### Cross-Browser Testing

The application is designed to work across modern browsers, but some features may behave differently:

- **Chrome/Edge**: Best overall support, recommended for development
- **Firefox**: Good support, may have minor styling differences
- **Safari**: Test for WebKit-specific issues, especially with flexbox layouts

If you encounter browser-specific issues, add the following to your bug report:
- Browser name and version
- Operating system
- Steps to reproduce
- Screenshots of the console errors