import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Trophy, BookOpen } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface GoalTrackerProps {
  booksCompletedThisMonth: number;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({ 
  booksCompletedThisMonth = 0
}) => {
  const { settings } = useSettings();
  const { goals } = settings;
  
  // Don't render anything if goals are not enabled
  if (!goals?.enabled) {
    return null;
  }
  
  const monthlyTarget = goals.monthlyTarget || 4;
  const progress = Math.min(100, (booksCompletedThisMonth / monthlyTarget) * 100);
  
  // Get current month name
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
  
  // Determine message based on progress
  let message = '';
  if (booksCompletedThisMonth >= monthlyTarget) {
    message = "Congratulations! You've reached your goal for this month!";
  } else if (progress >= 75) {
    message = "Almost there! Just a few more books to reach your goal.";
  } else if (progress >= 50) {
    message = "You're making great progress on your reading goal!";
  } else if (progress >= 25) {
    message = "You're on your way to reaching your monthly reading goal.";
  } else {
    message = "Start reading to reach your monthly goal!";
  }

  return (
    <div className="bg-muted/40 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy className={`h-5 w-5 ${progress >= 100 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <h3 className="font-medium text-sm">
            {currentMonth} Reading Goal
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium">{booksCompletedThisMonth}</span>
          <span className="text-muted-foreground">of</span>
          <span className="font-medium">{monthlyTarget}</span>
          <span className="text-muted-foreground">books</span>
        </div>
      </div>
      
      <Progress 
        value={progress} 
        // Use CSS classes applied directly to the Progress component
        // instead of indicatorClassName which isn't supported
        className={`h-2 ${progress >= 100 ? "[&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-amber-500" : ""}`}
      />
      
      <p className="text-xs text-muted-foreground mt-2">
        {message}
      </p>
    </div>
  );
};

export default GoalTracker;
