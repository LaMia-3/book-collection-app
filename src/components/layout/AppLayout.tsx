import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
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
  
  // Get the personalized library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Personal Library`
    : "My Personal Library";
  
  // Determine current section and title based on route
  let title = libraryName;
  let subtitle = "Track your reading journey, one book at a time";
  let currentAddButtonLabel = addButtonLabel;
  
  if (location.pathname.startsWith('/series')) {
    title = settings.preferredName 
      ? `${settings.preferredName}'s Series`
      : "My Series";
    subtitle = "Organize and track your book series";
    currentAddButtonLabel = "Add Series";
  } else if (location.pathname.startsWith('/collections')) {
    title = settings.preferredName 
      ? `${settings.preferredName}'s Collections`
      : "My Collections";
    subtitle = "Create custom collections of your favorite books";
    currentAddButtonLabel = "Add Collection";
  } else if (location.pathname.startsWith('/insights')) {
    title = settings.preferredName 
      ? `${settings.preferredName}'s Reading Insights`
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
      </div>
    </div>
  );
}

export default AppLayout;
