import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Library, LibrarySquare, FolderOpen, BarChart } from 'lucide-react';

interface PrimaryNavigationProps {
  currentPath: string;
}

export function PrimaryNavigation({ currentPath }: PrimaryNavigationProps) {
  const navigate = useNavigate();
  
  // Determine which tab should be active based on the current path
  const getActiveTab = (path: string): string => {
    if (path.startsWith('/series')) return '/series';
    if (path.startsWith('/collections')) return '/collections';
    if (path.startsWith('/insights')) return '/insights';
    return '/'; // Default to library
  };
  
  const activeTab = getActiveTab(currentPath);
  
  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="grid grid-cols-4">
        <TabsTrigger 
          value="/" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Library className="h-4 w-4" />
          <span className="hidden sm:inline">Library</span>
        </TabsTrigger>
        <TabsTrigger 
          value="/series" 
          onClick={() => navigate('/series')}
          className="flex items-center gap-2"
        >
          <LibrarySquare className="h-4 w-4" />
          <span className="hidden sm:inline">Series</span>
        </TabsTrigger>
        <TabsTrigger 
          value="/collections" 
          onClick={() => navigate('/collections')}
          className="flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Collections</span>
        </TabsTrigger>
        <TabsTrigger 
          value="/insights" 
          onClick={() => navigate('/insights')}
          className="flex items-center gap-2"
        >
          <BarChart className="h-4 w-4" />
          <span className="hidden sm:inline">Reading Insights</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default PrimaryNavigation;
