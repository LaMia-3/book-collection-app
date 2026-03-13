import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import BirthdayCelebration from "@/components/BirthdayCelebration";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ImportStatusDisplay from "@/components/ImportStatusDisplay";
import { DatabasePreloader } from "@/components/DatabasePreloader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { UIProvider } from "@/components/ui-common/UIProvider";
import LocalStorageCheck from "@/components/debug/LocalStorageCheck";
import { ImportProvider } from "@/contexts/ImportContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PaletteProvider from "@/contexts/PaletteContext";
import AboutPage from "@/pages/AboutPage";
import AdminPage from "@/pages/AdminPage";
import CollectionDetailPage from "@/pages/CollectionDetailPage";
import CollectionsPage from "@/pages/CollectionsPage";
import Index from "@/pages/Index";
import InsightsPage from "@/pages/InsightsPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import RegisterPage from "@/pages/RegisterPage";
import SeriesDetailPage from "@/pages/SeriesDetailPage";
import SeriesPage from "@/pages/SeriesPage";

const queryClient = new QueryClient();

const ProtectedLibraryLayout = () => (
  <ProtectedRoute>
    <SettingsProvider>
      <PaletteProvider>
        <ImportProvider>
          <ImportStatusDisplay />
          <BirthdayCelebration />
          <DatabasePreloader>
            <Outlet />
          </DatabasePreloader>
        </ImportProvider>
      </PaletteProvider>
    </SettingsProvider>
  </ProtectedRoute>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/about" element={<AboutPage />} />

    <Route element={<ProtectedLibraryLayout />}>
      <Route path="/" element={<Index />} />
      <Route path="/series" element={<SeriesPage />} />
      <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route
        path="/collections/:collectionId"
        element={<CollectionDetailPage />}
      />
      <Route path="/insights" element={<InsightsPage />} />
      <Route
        path="/test-backend"
        element={<Navigate to="/admin?tab=backend-test" replace />}
      />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="/test-indexeddb"
        element={<Navigate to="/admin?tab=indexeddb-test" replace />}
      />
      <Route path="/storage-check" element={<LocalStorageCheck />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <TooltipProvider>
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
