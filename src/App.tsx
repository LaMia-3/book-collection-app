import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UIProvider } from "./components/ui-common/UIProvider";
import { ImportProvider } from "./contexts/ImportContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import PaletteProvider from "./contexts/PaletteContext";
import BirthdayCelebration from "./components/BirthdayCelebration";
import ImportStatusDisplay from "./components/ImportStatusDisplay";
import { DatabasePreloader } from "./components/DatabasePreloader";
import Index from "./pages/Index";
import SeriesPage from "./pages/SeriesPage";
import SeriesDetailPage from "./pages/SeriesDetailPage";
// TestBackendPage has been integrated into AdminPage as a tab
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
// IndexedDBTester component is now used within AdminPage

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UIProvider>
      <SettingsProvider>
        <PaletteProvider>
          <ImportProvider>
            <TooltipProvider>
              <Sonner />
              <ImportStatusDisplay />
              <BirthdayCelebration />
              <DatabasePreloader>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/series" element={<SeriesPage />} />
                  <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
                  <Route path="/test-backend" element={<Navigate to="/admin?tab=backend-test" replace />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/test-indexeddb" element={<Navigate to="/admin?tab=indexeddb-test" replace />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </DatabasePreloader>
            </TooltipProvider>
          </ImportProvider>
        </PaletteProvider>
      </SettingsProvider>
    </UIProvider>
  </QueryClientProvider>
);

export default App;
