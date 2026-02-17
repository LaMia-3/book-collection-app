import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImportExportView } from './ImportExportView';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Palette, Trophy, BookOpen, ArrowUp, ArrowDown, ListOrdered, Wrench, Sun, Moon, Monitor } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/components/ui-common/ThemeProvider';
import { PaletteSelector } from '@/components/PaletteSelector';
import { GoalsTab } from '@/components/GoalsTab';
import { indexedDBService } from '@/services/storage/IndexedDBService';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  books: any[]; // Will be properly typed with Book[] later
  onImportCSV?: (file: File) => Promise<void>;
  onImportJSON?: (file: File) => Promise<void>;
  onCreateBackup?: () => Promise<void>;
  onRestoreBackup?: (file: File) => Promise<void>;
  onDeleteLibrary?: () => Promise<void>;
  onResetLibrary?: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  books,
  onImportCSV,
  onImportJSON,
  onCreateBackup,
  onRestoreBackup,
  onDeleteLibrary,
  onResetLibrary
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'delete' | 'reset'>('delete');
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState<{success: boolean; message: string} | null>(null);
  const { settings, updateSettings, isLoading } = useSettings();
  const { colorMode, setColorMode } = useTheme();
  
  // Local form state for settings
  const [preferredName, setPreferredName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [celebrateBirthday, setCelebrateBirthday] = useState(true);
  const [defaultView, setDefaultView] = useState<string>('shelf');
  const [defaultApi, setDefaultApi] = useState<string>('google');
  const [defaultStatus, setDefaultStatus] = useState<string>('want-to-read');
  const [groupSpecialStatuses, setGroupSpecialStatuses] = useState(false);
  const [disableHoverEffect, setDisableHoverEffect] = useState(false);
  const [shelfOrder, setShelfOrder] = useState<string[]>(['reading', 'want-to-read', 'completed', 'on-hold', 'dnf']);
  
  // Initialize form state from settings
  useEffect(() => {
    if (!isLoading && settings) {
      setPreferredName(settings.preferredName || '');
      setBirthday(settings.birthday || '');
      setCelebrateBirthday(settings.celebrateBirthday ?? true);
      setDefaultView(settings.defaultView || 'shelf');
      setDefaultApi(settings.defaultApi || 'google');
      setDefaultStatus(settings.defaultStatus || 'want-to-read');
      setGroupSpecialStatuses(settings.displayOptions?.groupSpecialStatuses ?? false);
      setDisableHoverEffect(settings.displayOptions?.disableHoverEffect ?? false);
      
      // Initialize shelf order from settings or use default
      const defaultOrder = ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf'];
      setShelfOrder(settings.displayOptions?.shelfOrder || defaultOrder);
    }
  }, [isLoading, settings]);
  
  // Handle form changes
  const handlePreferredNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreferredName(e.target.value);
    updateSettings({ preferredName: e.target.value });
  };
  
  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthday(e.target.value);
    updateSettings({ birthday: e.target.value });
  };
  
  const handleCelebrateBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCelebrateBirthday(e.target.checked);
    updateSettings({ celebrateBirthday: e.target.checked });
  };
  
  const handleDefaultViewChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDefaultView(e.target.value);
    updateSettings({ defaultView: e.target.value as any });
  };
  
  const handleDefaultApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDefaultApi(e.target.value);
    updateSettings({ defaultApi: e.target.value as any });
  };
  
  const handleDefaultStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDefaultStatus(e.target.value);
    updateSettings({ defaultStatus: e.target.value as any });
  };

  const handleGroupSpecialStatusesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroupSpecialStatuses(e.target.checked);
    updateSettings({ 
      displayOptions: {
        ...settings.displayOptions,
        groupSpecialStatuses: e.target.checked 
      }
    });
  };

  const handleDisableHoverEffectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisableHoverEffect(e.target.checked);
    updateSettings({ 
      displayOptions: {
        ...settings.displayOptions,
        disableHoverEffect: e.target.checked 
      }
    });
  };
  
  const moveShelf = useCallback((index: number, direction: 'up' | 'down') => {
    setShelfOrder(prevOrder => {
      const newOrder = [...prevOrder];
      if (direction === 'up' && index > 0) {
        // Swap with previous item
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
        // Swap with next item
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      
      // Save the new order to settings
      updateSettings({
        displayOptions: {
          ...settings.displayOptions,
          shelfOrder: newOrder
        }
      });
      
      return newOrder;
    });
  }, [settings.displayOptions, updateSettings]);
  
  // Function to get display name for shelf status
  const getShelfDisplayName = (status: string) => {
    switch(status) {
      case 'reading': return 'Currently Reading';
      case 'want-to-read': return 'Want to Read';
      case 'completed': return 'Completed';
      case 'on-hold': return 'On Hold';
      case 'dnf': return 'Did Not Finish';
      default: return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your preferences and book collection
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-6">
          <div className="flex items-start">
            <TabsList className="flex-col space-y-1 mr-6 h-auto bg-transparent">
              <TabsTrigger 
                value="general" 
                className="justify-start w-40 data-[state=active]:bg-muted"
              >
                General
              </TabsTrigger>
              <TabsTrigger 
                value="bookshelf-view" 
                className="justify-start w-40 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Bookshelf View
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="goals" 
                className="justify-start w-40 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Goals
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="justify-start w-40 data-[state=active]:bg-muted"
              >
                Appearance
              </TabsTrigger>
              <TabsTrigger 
                value="import-export" 
                className="justify-start w-40 data-[state=active]:bg-muted"
              >
                Import & Export
              </TabsTrigger>
              <TabsTrigger 
                value="troubleshooting" 
                className="justify-start w-40 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  Troubleshooting
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="delete-library" 
                className="justify-start w-40 data-[state=active]:bg-destructive/10 text-destructive font-medium"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Library
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 border-l pl-6">
              <TabsContent value="general" className="mt-0">
                <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Customize your reading experience and personalize the application.
                </p>
                
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-md font-medium mb-3">Personal Information</h4>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label htmlFor="preferred-name" className="text-sm font-medium">Preferred Name</label>
                        <input
                          id="preferred-name"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Your name"
                          value={preferredName}
                          onChange={handlePreferredNameChange}
                        />
                        <p className="text-xs text-muted-foreground">Used to personalize your library: "[Name]'s Personal Library"</p>
                      </div>

                      <div>
                        <label htmlFor="birthday" className="text-sm font-medium">Birthday</label>
                        <div className="flex gap-2 items-center mt-2">
                          <input
                            id="birthday"
                            type="date"
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={birthday}
                            onChange={handleBirthdayChange}
                          />
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="celebrate"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              checked={celebrateBirthday}
                              onChange={handleCelebrateBirthdayChange}
                            />
                            <label htmlFor="celebrate" className="text-sm font-medium">Celebrate?</label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">We'll wish you a happy birthday when the day comes!</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />

                  {/* Default Preferences */}
                  <div>
                    <h4 className="text-md font-medium mb-3">Default Preferences</h4>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label htmlFor="default-view" className="text-sm font-medium">Default View</label>
                        <select
                          id="default-view"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={defaultView}
                          onChange={handleDefaultViewChange}
                        >
                          <option value="shelf">Bookshelf</option>
                          <option value="list">List</option>
                          <option value="cover">Cover Grid</option>
                        </select>
                        <p className="text-xs text-muted-foreground">Default view when you open the application</p>
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="default-api" className="text-sm font-medium">Default API for Book Search</label>
                        <select
                          id="default-api"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={defaultApi}
                          onChange={handleDefaultApiChange}
                        >
                          <option value="google">Google Books</option>
                          <option value="openlibrary">Open Library</option>
                        </select>
                        <p className="text-xs text-muted-foreground">API to prioritize when searching for books</p>
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="default-status" className="text-sm font-medium">Default Status for New Books</label>
                        <select
                          id="default-status"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={defaultStatus}
                          onChange={handleDefaultStatusChange}
                        >
                          <option value="want-to-read">Want to Read</option>
                          <option value="reading">Currently Reading</option>
                          <option value="completed">Completed</option>
                        </select>
                        <p className="text-xs text-muted-foreground">Status assigned to newly added books</p>
                      </div>

                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="bookshelf-view" className="mt-0">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Bookshelf View Settings
                </h3>
                <p className="text-muted-foreground mb-6">
                  Customize how your bookshelf is displayed and organized.
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium mb-3">Bookshelf View Organization</h4>
                    <div className="space-y-4">
                      <div className="grid gap-2 mb-5">
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="checkbox"
                            id="group-special-statuses"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={groupSpecialStatuses}
                            onChange={handleGroupSpecialStatusesChange}
                          />
                          <label htmlFor="group-special-statuses" className="text-sm">Group "Did Not Finish" and "On Hold" books with Completed books</label>
                        </div>
                        <p className="text-xs text-muted-foreground">When enabled, DNF and On Hold books appear on the same shelf as Completed books</p>
                      </div>
                      
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2 mb-1">
                          <ListOrdered className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Shelf Order</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">Use the up and down arrows to arrange bookshelves in your preferred order</p>
                        
                        <div className="space-y-2">
                          {shelfOrder.map((shelf, index) => {
                            // If groupSpecialStatuses is enabled, don't show on-hold and dnf in the list
                            if (groupSpecialStatuses && (shelf === 'on-hold' || shelf === 'dnf')) {
                              return null;
                            }
                            
                            return (
                              <div 
                                key={shelf}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-md border shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{getShelfDisplayName(shelf)}</span>
                                  
                                  {/* Show note for completed if grouping is enabled */}
                                  {shelf === 'completed' && groupSpecialStatuses && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (includes DNF and On Hold)
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => moveShelf(index, 'up')}
                                    className="p-1 rounded-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
                                    aria-label="Move up"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === (shelfOrder.filter(s => !groupSpecialStatuses || (s !== 'on-hold' && s !== 'dnf')).length - 1)}
                                    onClick={() => moveShelf(index, 'down')}
                                    className="p-1 rounded-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
                                    aria-label="Move down"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Changes to shelf order are saved automatically
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-md font-medium mb-3">Interactive Features</h4>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="checkbox"
                            id="disable-hover-effect"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={disableHoverEffect}
                            onChange={handleDisableHoverEffectChange}
                          />
                          <label htmlFor="disable-hover-effect" className="text-sm">Disable book hover animation effects</label>
                        </div>
                        <p className="text-xs text-muted-foreground">When enabled, books will not pop out when hovered over</p>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </TabsContent>

              <TabsContent value="goals" className="mt-0">
                <GoalsTab />
              </TabsContent>

              <TabsContent value="appearance" className="mt-0">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Appearance
                </h3>
                <p className="text-muted-foreground mb-6">
                  Customize how the application looks.
                </p>
                
                <div className="space-y-6">
                  <div className="border-b pb-6">
                    <h4 className="text-base font-medium mb-2">Theme</h4>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div 
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all ${colorMode === 'light' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setColorMode('light')}
                      >
                        <Sun className="h-8 w-8 text-purple-500 mb-2" />
                        <span className="text-center font-medium">Light</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all ${colorMode === 'dark' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setColorMode('dark')}
                      >
                        <Moon className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-center font-medium">Dark</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all ${colorMode === 'system' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setColorMode('system')}
                      >
                        <Monitor className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-center font-medium">System</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-b pb-6">
                    <h4 className="text-base font-medium mb-2">Book Spine Colors</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose a color palette based on your favorite book cover to customize the appearance of your bookshelf.
                    </p>
                    <PaletteSelector />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="import-export" className="mt-0">
                <ImportExportView 
                  books={books}
                  onImportCSV={onImportCSV}
                  onImportJSON={onImportJSON}
                  onCreateBackup={onCreateBackup}
                  onRestoreBackup={onRestoreBackup}
                />
              </TabsContent>
              
              <TabsContent value="troubleshooting" className="mt-0">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-500" />
                  Troubleshooting
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Tools to help resolve issues with the application and database.
                </p>
                
                <Card className="p-6 mb-6">
                  <h4 className="font-medium mb-4">Database Repair</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you're experiencing issues with your book collection, such as missing data or errors when adding books, 
                    you can try repairing the database. This will check for and fix common database issues.
                  </p>
                  
                  {repairStatus && (
                    <div className={`p-4 mb-4 rounded-md ${repairStatus.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                      <p className="text-sm font-medium">{repairStatus.message}</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={async () => {
                      setIsRepairing(true);
                      setRepairStatus(null);
                      try {
                        const result = await indexedDBService.checkAndRepairDatabase();
                        if (result) {
                          setRepairStatus({
                            success: true,
                            message: "Database repair completed successfully. You may need to refresh the page to see changes."
                          });
                        } else {
                          setRepairStatus({
                            success: false,
                            message: "Database repair failed. Please try again or contact support."
                          });
                        }
                      } catch (error) {
                        setRepairStatus({
                          success: false,
                          message: `Database repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                        });
                      } finally {
                        setIsRepairing(false);
                      }
                    }}
                    disabled={isRepairing}
                  >
                    {isRepairing ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Repairing...
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4" />
                        Repair Database
                      </>
                    )}
                  </Button>
                  
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p className="font-medium">What this does:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Checks for missing database stores</li>
                      <li>Recreates any corrupted database structures</li>
                      <li>Ensures proper database schema</li>
                    </ul>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="delete-library" className="mt-0">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Library
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Choose an option below to either delete your books or completely reset your library.
                </p>
                
                <div className="space-y-6">
                  <Card className="border-destructive/20 bg-destructive/5 p-6">
                    <h4 className="font-medium mb-2">Delete Library</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      This will remove all books and remove all books from collections, but keep your series and collection structures intact.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                      <li>All books will be deleted</li>
                      <li>Books will be removed from collections</li>
                      <li>Series and collection structures will be preserved</li>
                    </ul>
                    
                    <Button 
                      variant="destructive" 
                      className="mt-2 flex items-center gap-2"
                      onClick={() => {
                        setDeleteMode('delete');
                        setShowDeleteConfirmation(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Library
                    </Button>
                  </Card>
                  
                  <Card className="border-destructive/20 bg-destructive/5 p-6">
                    <h4 className="font-medium mb-2">Reset Library</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      This will completely reset your library by removing all books, series, and collections.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                      <li>All books will be deleted</li>
                      <li>All series will be deleted</li>
                      <li>All collections will be deleted</li>
                      <li>You will start with a completely empty library</li>
                    </ul>
                    
                    <Button 
                      variant="destructive" 
                      className="mt-2 flex items-center gap-2"
                      onClick={() => {
                        setDeleteMode('reset');
                        setShowDeleteConfirmation(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Reset Library
                    </Button>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>


        
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirmation && (
          <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> 
                  {deleteMode === 'delete' ? 'Delete Library?' : 'Reset Library?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteMode === 'delete' ? (
                    <>
                      <p className="mb-2">Are you sure you want to delete all books from your library? This action <strong>cannot be undone</strong>.</p>
                      <p className="mb-4">All your books will be removed, but your series and collection structures will remain intact.</p>
                    </>
                  ) : (
                    <>
                      <p className="mb-2">Are you sure you want to completely reset your library? This action <strong>cannot be undone</strong>.</p>
                      <p className="mb-4">All your books, series, and collections will be permanently deleted.</p>
                    </>
                  )}
                  <p className="text-sm font-medium">We recommend exporting a backup before proceeding.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteMode === 'delete' && onDeleteLibrary) {
                      onDeleteLibrary();
                    } else if (deleteMode === 'reset' && onResetLibrary) {
                      onResetLibrary();
                    }
                    setShowDeleteConfirmation(false);
                  }}
                >
                  {deleteMode === 'delete' ? 'Yes, Delete Library' : 'Yes, Reset Library'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
