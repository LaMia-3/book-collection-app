import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SecondaryNavigationProps {
  section: 'library' | 'series' | 'collections' | 'insights';
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function SecondaryNavigation({ 
  section, 
  viewMode, 
  onViewModeChange,
  activeTab,
  onTabChange
}: SecondaryNavigationProps) {
  // Library section - no secondary navigation anymore (moved to header)
  if (section === 'library' && viewMode && onViewModeChange) {
    return null;
  }
  
  // Series section - no secondary navigation
  if (section === 'series') {
    return null;
  }
  
  // Collections section - no secondary navigation
  if (section === 'collections') {
    return null;
  }
  
  // Insights section - no secondary navigation
  if (section === 'insights') {
    return null;
  }
  
  return null;
}

export default SecondaryNavigation;
