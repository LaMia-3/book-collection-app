import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/theme-extensions.css'
import { initDatabaseErrorDetection } from './utils/databaseRepair'

// Initialize database error detection
initDatabaseErrorDetection();

createRoot(document.getElementById("root")!).render(<App />);
