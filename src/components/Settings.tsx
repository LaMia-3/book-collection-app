import React, { useState, useEffect } from 'react';
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
import { ImportExportView } from './ImportExportView';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Palette, Trophy } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { PaletteSelector } from '@/components/PaletteSelector';
import { GoalsTab } from '@/components/GoalsTab';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  books: any[]; // Will be properly typed with Book[] later
  onImportCSV?: (file: File) => Promise<void>;
  onImportJSON?: (file: File) => Promise<void>;
  onCreateBackup?: () => Promise<void>;
  onRestoreBackup?: (file: File) => Promise<void>;
  onDeleteLibrary?: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  books,
  onImportCSV,
  onImportJSON,
  onCreateBackup,
  onRestoreBackup,
  onDeleteLibrary
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { settings, updateSettings, isLoading } = useSettings();
  
  // Local form state for settings
  const [preferredName, setPreferredName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [celebrateBirthday, setCelebrateBirthday] = useState(true);
  const [defaultView, setDefaultView] = useState<string>('shelf');
  const [defaultApi, setDefaultApi] = useState<string>('google');
  const [defaultStatus, setDefaultStatus] = useState<string>('want-to-read');
  
  // Initialize form state from settings
  useEffect(() => {
    if (!isLoading && settings) {
      setPreferredName(settings.preferredName || '');
      setBirthday(settings.birthday || '');
      setCelebrateBirthday(settings.celebrateBirthday ?? true);
      setDefaultView(settings.defaultView || 'shelf');
      setDefaultApi(settings.defaultApi || 'google');
      setDefaultStatus(settings.defaultStatus || 'want-to-read');
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
                          <option value="insights">Insights</option>
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
              
              <TabsContent value="delete-library" className="mt-0">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Library
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  This will permanently delete your entire book collection. This action cannot be undone.
                </p>
                
                <Card className="border-destructive/20 bg-destructive/5 p-6 mb-6">
                  <h4 className="font-medium mb-4">Before deleting your library:</h4>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                    <li>Consider exporting your collection as a backup</li>
                    <li>All your books, ratings, notes, and reading statuses will be permanently lost</li>
                    <li>This action affects all views and cannot be reversed</li>
                  </ul>
                  
                  <Button 
                    variant="destructive" 
                    className="mt-2 flex items-center gap-2"
                    onClick={() => setShowDeleteConfirmation(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Entire Library
                  </Button>
                </Card>
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
                  <AlertTriangle className="h-5 w-5" /> Delete Entire Library?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <p className="mb-2">Are you sure you want to delete your entire book collection? This action <strong>cannot be undone</strong>.</p>
                  <p className="mb-4">All your books, ratings, notes, and reading statuses will be permanently lost.</p>
                  <p className="text-sm font-medium">We recommend exporting a backup before deletion.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (onDeleteLibrary) {
                      onDeleteLibrary();
                    }
                    setShowDeleteConfirmation(false);
                  }}
                >
                  Yes, Delete Everything
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
