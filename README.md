# Book Collection App

## Summary

Book Collection App is a modern web application for tracking and managing your personal book collection. It allows you to add books from multiple sources, organize them into series, track your reading progress, and visualize your reading habits through detailed insights.

![Book Collection App](https://placeholder-for-app-screenshot.png)

## Core Features

- **Book Management**
  - Add books via Google Books API or Open Library API
  - Track reading status, progress, and completion dates
  - Edit book details including title, author, page count, descriptions, and genres
  - Organize books into series with automatic detection
  
- **Multiple Views**
  - Visual bookshelf display
  - List view with sorting and filtering
  - Cover grid for visual browsing
  - Insights dashboard with reading statistics

- **Advanced Functionality**
  - Series management with automatic detection
  - Offline support with IndexedDB storage
  - Import/export collections in CSV or JSON format
  - Advanced search with fuzzy matching
  - Reading goals tracking
  - Theme customization

## Technology Stack

- **Frontend**: React with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Context API
- **Storage**: IndexedDB for offline-capable persistence
- **External APIs**: Google Books API and Open Library API
- **Build Tool**: Vite

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher

### Installation

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/your-username/book-collection-app.git
cd book-collection-app

# Install dependencies
npm install
```

### Running the Application

```bash
# Start development server
npm run dev

# The application will be available at http://localhost:8094
```

### Windows-Specific Instructions

1. **Node.js Installation**:
   - Download and install Node.js from the [official website](https://nodejs.org/)
   - During installation, check the option to install necessary tools for native modules

2. **Running in PowerShell**:
   ```powershell
   # If you encounter execution policy issues
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   
   # Start the development server
   npm run dev
   ```

3. **Troubleshooting Common Windows Issues**:
   - If you see ENOENT errors, ensure paths don't contain special characters
   - For permission errors, run your terminal as Administrator
   - For node-gyp related errors:
     ```powershell
     npm install --global --production windows-build-tools
     ```

## Project Structure

- `/src/components` - React components
- `/src/services` - API and data services
- `/src/contexts` - React context providers
- `/src/hooks` - Custom React hooks
- `/src/utils` - Utility functions
- `/src/types` - TypeScript type definitions

## Available Routes

- `/` - Main bookshelf view
- `/series` - Series management
- `/admin` - Admin tools and debugging

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request