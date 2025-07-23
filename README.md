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
- **Local Storage**: Your data is stored locally with IndexedDB and localStorage

## Technology Stack

- **Frontend**: React with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Context API
- **Storage**: IndexedDB with localStorage fallback
- **Build Tools**: Vite

## Getting Started

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

- `/src/components`: UI components
- `/src/contexts`: React contexts for state management
- `/src/services`: Service layers for API and data management
- `/src/hooks`: Custom React hooks
- `/src/types`: TypeScript type definitions
- `/src/utils`: Utility functions

## Customization

The application supports theme customization through the Settings dialog, including:
- Preferred name for your library
- Birthday celebration notifications
- Default view mode selection
- API preferences
- Book spine color palettes
