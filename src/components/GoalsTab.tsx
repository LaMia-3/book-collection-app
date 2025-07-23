import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export const GoalsTab: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  
  // Local state for goal settings
  const [goalsEnabled, setGoalsEnabled] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState(4);
  
  // Initialize from settings
  useEffect(() => {
    if (settings?.goals) {
      setGoalsEnabled(settings.goals.enabled);
      setMonthlyTarget(settings.goals.monthlyTarget);
    }
  }, [settings]);
  
  // Handle toggle for enabling/disabling goals
  const handleGoalsToggle = (checked: boolean) => {
    setGoalsEnabled(checked);
    updateSettings({
      goals: {
        ...settings.goals,
        enabled: checked
      }
    });
  };
  
  // Handle monthly target changes
  const handleMonthlyTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    // Ensure the value is a positive number and not too large
    if (!isNaN(value) && value > 0 && value <= 100) {
      setMonthlyTarget(value);
      updateSettings({
        goals: {
          ...settings.goals,
          monthlyTarget: value
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Reading Goals
        </h3>
        <p className="text-sm text-muted-foreground">
          Set reading goals to help you track your progress and stay motivated.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Monthly Reading Goal
          </CardTitle>
          <CardDescription>
            Set a target number of books to read each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            {/* Enable/Disable Goals Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="goals-enabled">Enable Reading Goals</Label>
                <p className="text-sm text-muted-foreground">
                  Show progress towards your monthly reading target
                </p>
              </div>
              <Switch
                id="goals-enabled"
                checked={goalsEnabled}
                onCheckedChange={handleGoalsToggle}
              />
            </div>
            
            {/* Monthly Target Input */}
            <div className={`transition-opacity ${goalsEnabled ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="monthly-target">
                  Books per month: <span className="font-medium text-primary">{monthlyTarget}</span>
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="monthly-target"
                    type="number"
                    min="1"
                    max="100"
                    value={monthlyTarget}
                    onChange={handleMonthlyTargetChange}
                    disabled={!goalsEnabled}
                    className="w-20"
                  />
                  <p className="text-sm text-muted-foreground">
                    books per month
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This progress will automatically reset at the beginning of each month
                </p>
              </div>
            </div>
            
            {/* Goal Information */}
            {goalsEnabled && (
              <div className="pt-2 border-t">
                <div className="rounded-lg bg-muted p-3 flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">How It Works</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Books marked as completed during the current month will count toward your goal.
                      Your progress will be displayed on the main library page and will reset
                      automatically at the beginning of each month.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalsTab;
