import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';
import { PrimaryNavigation } from './PrimaryNavigation';
import { SecondaryNavigation } from './SecondaryNavigation';
import { ViewMode } from '@/components/ViewToggle';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Search, PenLine } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface EnhancedHeaderProps {
  title: string;
  subtitle?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onAddClick?: () => void;
  onSettingsClick?: () => void;
  addButtonLabel?: string;
  showNotifications?: boolean;
  children?: React.ReactNode;
  onSearchAPIClick?: () => void;
  onManualEntryClick?: () => void;
}

export function EnhancedHeader({
  title,
  subtitle,
  viewMode,
  onViewModeChange,
  onAddClick,
  onSettingsClick,
  addButtonLabel = "Add Books",
  showNotifications = true,
  children,
  onSearchAPIClick,
  onManualEntryClick
}: EnhancedHeaderProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  
  // Determine current section based on route
  let currentSection: 'library' | 'series' | 'collections' | 'insights' = 'library';
  if (location.pathname.startsWith('/series')) {
    currentSection = 'series';
  } else if (location.pathname.startsWith('/collections')) {
    currentSection = 'collections';
  } else if (location.pathname.startsWith('/insights')) {
    currentSection = 'insights';
  }
  
  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {onAddClick && currentSection !== 'insights' && (
              currentSection === 'library' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" className="flex items-center gap-2" size="sm">
                      <PlusCircle className="h-4 w-4" />
                      {addButtonLabel}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={onSearchAPIClick}>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onManualEntryClick}>
                      <PenLine className="h-4 w-4 mr-2" />
                      Manual Entry
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="default" className="flex items-center gap-2" size="sm" onClick={onAddClick}>
                  <PlusCircle className="h-4 w-4" />
                  {addButtonLabel}
                </Button>
              )
            )}
            {showNotifications && (
              <NotificationBell />
            )}
            {onSettingsClick && (
              <HeaderActionButton
                icon={<Settings className="h-4 w-4" />}
                label="Settings"
                onClick={onSettingsClick}
              />
            )}
          </>
        }
        className="py-6"
      >
        <div className="mt-4">
          <PrimaryNavigation currentPath={location.pathname} />
        </div>
        
        {currentSection === 'library' && (
          <div className="mt-6 mb-4">
            {children}
          </div>
        )}
        
        <div className="mt-4">
          <SecondaryNavigation
            section={currentSection}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        
        {currentSection !== 'library' && children}
      </PageHeader>
    </div>
  );
}

export default EnhancedHeader;
