import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { Series } from "@/types/series";
import { Button } from "@/components/ui/button";
import { Library, Plus, ArrowLeft, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Series management page component
 */
const SeriesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [series, setSeries] = useState<Series[]>([]);
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  
  // Get the personalized library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Series Collection`
    : "My Series Collection";

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <BookOpen className="h-4 w-4 mr-1" />
              Back to Library
            </Button>
          </div>
          <h1 className="text-2xl font-serif font-semibold mb-1">
            {libraryName}
          </h1>
          <p className="text-muted-foreground">
            {series.length === 0 
              ? "Start organizing your books into series"
              : `${series.length} series in your collection`}
          </p>
        </div>
        
        <Button 
          onClick={() => setIsCreatingNewSeries(true)}
          className="bg-gradient-warm hover:bg-primary-glow"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Series
        </Button>
      </div>
      
      {/* Empty state when no series exist */}
      {series.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <Library className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-medium mb-2">No Series Yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Organize your books into series to track your progress, manage reading order, 
            and get notified about upcoming releases.
          </p>
          <Button 
            onClick={() => setIsCreatingNewSeries(true)}
            className="bg-gradient-warm hover:bg-primary-glow"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Series
          </Button>
        </div>
      )}
      
      {/* Series grid will go here when implemented */}
      {/* Placeholder for future implementation */}
      {series.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Series cards will go here */}
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            Series grid placeholder
          </div>
        </div>
      )}
      
      {/* Create Series Dialog placeholder */}
      {/* Will be implemented in the next step */}
      {isCreatingNewSeries && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-medium mb-4">Create New Series</h2>
            <p className="text-muted-foreground mb-4">
              Series creation dialog will be implemented in the next step.
            </p>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                className="mr-2"
                onClick={() => setIsCreatingNewSeries(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Series creation will be implemented in the next step"
                });
                setIsCreatingNewSeries(false);
              }}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesPage;
