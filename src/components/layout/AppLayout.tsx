import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { EnhancedHeader } from '@/components/navigation/EnhancedHeader';
import { ViewMode } from '@/components/ViewToggle';

interface AppLayoutProps {
  children: ReactNode;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onAddClick?: () => void;
  onSettingsClick?: () => void;
  onSearchAPIClick?: () => void;
  onManualEntryClick?: () => void;
  addButtonLabel?: string;
  searchComponent?: ReactNode;
}

export function AppLayout({
  children,
  viewMode,
  onViewModeChange,
  onAddClick,
  onSettingsClick,
  onSearchAPIClick,
  onManualEntryClick,
  addButtonLabel,
  searchComponent
}: AppLayoutProps) {
  const location = useLocation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const preferredName = user?.preferredName || settings.preferredName;
  
  // Get the personalized library name
  const libraryName = preferredName
    ? `${preferredName}'s Personal Library`
    : "My Personal Library";
  
  // Determine current section and title based on route
  let title = libraryName;
  let subtitle = "Track your reading journey, one book at a time";
  let currentAddButtonLabel = addButtonLabel;
  
  if (location.pathname.startsWith('/series')) {
    title = preferredName
      ? `${preferredName}'s Series`
      : "My Series";
    subtitle = "Organize and track your book series";
    currentAddButtonLabel = "Add Series";
  } else if (location.pathname.startsWith('/collections')) {
    title = preferredName
      ? `${preferredName}'s Collections`
      : "My Collections";
    subtitle = "Create custom collections of your favorite books";
    currentAddButtonLabel = "Add Collection";
  } else if (location.pathname.startsWith('/insights')) {
    title = preferredName
      ? `${preferredName}'s Reading Insights`
      : "My Reading Insights";
    subtitle = "Track your reading progress and achievements";
    currentAddButtonLabel = undefined; // No add button for insights
  }
  
  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="container mx-auto max-w-6xl">
        <EnhancedHeader
          title={title}
          subtitle={subtitle}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onAddClick={onAddClick}
          onSettingsClick={onSettingsClick}
          onSearchAPIClick={onSearchAPIClick}
          onManualEntryClick={onManualEntryClick}
          addButtonLabel={currentAddButtonLabel}
        >
          {searchComponent && (
            <div className="relative flex-1 mt-6 mb-0">
              {searchComponent}
            </div>
          )}
        </EnhancedHeader>
        
        {children}

        {/* Footer */}
        <footer className="mt-12 mb-6 px-4 text-center text-xs text-muted-foreground/60">
          <nav className="flex items-center justify-center gap-1.5">
            <Link to="/about?tab=changelog" className="hover:text-muted-foreground transition-colors">Changelog</Link>
            <span>·</span>
            <Link to="/about?tab=known-issues" className="hover:text-muted-foreground transition-colors">Known Issues</Link>
            <span>·</span>
            <Link to="/about?tab=roadmap" className="hover:text-muted-foreground transition-colors">Roadmap</Link>
            <span>·</span>
            <Link to="/about?tab=privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
            <span>·</span>
            <Link to="/about?tab=about" className="hover:text-muted-foreground transition-colors">About</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

export default AppLayout;
