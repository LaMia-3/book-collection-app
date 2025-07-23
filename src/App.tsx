import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UIProvider } from "./components/ui-common/UIProvider";
import { ImportProvider } from "./contexts/ImportContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import PaletteProvider from "./contexts/PaletteContext";
import BirthdayCelebration from "./components/BirthdayCelebration";
import ImportStatusDisplay from "./components/ImportStatusDisplay";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

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
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ImportProvider>
        </PaletteProvider>
      </SettingsProvider>
    </UIProvider>
  </QueryClientProvider>
);

export default App;
