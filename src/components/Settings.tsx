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
import { PasswordInput } from '@/components/ui/password-input';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ImportExportView } from './ImportExportView';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Palette, Trophy, BookOpen, ArrowUp, ArrowDown, ListOrdered, Sun, Moon, Monitor, Sliders, FileUp, FileDown, LogOut, Shield, Library } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/components/ui-common/ThemeProvider';
import { PaletteSelector } from '@/components/PaletteSelector';
import { GoalsTab } from '@/components/GoalsTab';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/apiClient';
import type { UserSettings } from '@/types/user-settings';
import { useToast } from '@/hooks/use-toast';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  books: unknown[];
  onImportCSV?: (file: File) => Promise<void>;
  onImportJSON?: (file: File) => Promise<void>;
  onCreateBackup?: () => Promise<void>;
  onRestoreBackup?: (file: File) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
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
  onDeleteAccount,
  onDeleteLibrary,
  onResetLibrary
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'delete' | 'reset' | 'account'>('delete');
  const { settings, updateSettings, isLoading } = useSettings();
  const { colorMode, setColorMode } = useTheme();
  const { changeEmail, changePassword, changePreferredName, isAuthenticated, logout, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
  const [accountEmail, setAccountEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState<{error: string | null; success: string | null}>({ error: null, success: null });
  const [passwordStatus, setPasswordStatus] = useState<{error: string | null; success: string | null}>({ error: null, success: null });
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingPreferredName, setIsUpdatingPreferredName] = useState(false);
  
  // Initialize form state from settings
  useEffect(() => {
    if (!isLoading && settings) {
      setPreferredName(user?.preferredName || settings.preferredName || '');
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
  }, [isLoading, settings, user?.preferredName]);

  useEffect(() => {
    setAccountEmail(user?.email || '');
  }, [user?.email]);
  
  // Handle form changes
  const handlePreferredNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreferredName(e.target.value);
  };

  const handlePreferredNameBlur = async () => {
    const nextPreferredName = preferredName.trim();
    const accountPreferredName = user?.preferredName?.trim() || '';
    const settingsPreferredName = settings.preferredName?.trim() || '';

    if (
      nextPreferredName === accountPreferredName &&
      nextPreferredName === settingsPreferredName
    ) {
      return;
    }

    setIsUpdatingPreferredName(true);

    try {
      if (isAuthenticated) {
        await changePreferredName({
          preferredName: nextPreferredName || undefined,
        });
        try {
          await updateSettings({
            preferredName: nextPreferredName || undefined,
          });
        } catch (settingsError) {
          console.warn('Preferred name account update succeeded, but settings sync failed.', settingsError);
        }
      } else {
        await updateSettings({
          preferredName: nextPreferredName || undefined,
        });
      }
    } catch (error) {
      setPreferredName(accountPreferredName || settingsPreferredName);
      toast({
        title: 'Preferred name update failed',
        description:
          error instanceof ApiClientError
            ? error.message
            : 'Preferred name change failed.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPreferredName(false);
    }
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
    const nextDefaultView = e.target.value as NonNullable<UserSettings['defaultView']>;
    setDefaultView(nextDefaultView);
    updateSettings({ defaultView: nextDefaultView });
  };
  
  const handleDefaultApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextDefaultApi = e.target.value as NonNullable<UserSettings['defaultApi']>;
    setDefaultApi(nextDefaultApi);
    updateSettings({ defaultApi: nextDefaultApi });
  };
  
  const handleDefaultStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextDefaultStatus = e.target.value as NonNullable<UserSettings['defaultStatus']>;
    setDefaultStatus(nextDefaultStatus);
    updateSettings({ defaultStatus: nextDefaultStatus });
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

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  const handleEmailChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailStatus({ error: null, success: null });
    setIsUpdatingEmail(true);

    try {
      await changeEmail({
        currentPassword: emailCurrentPassword,
        email: accountEmail,
      });
      setEmailCurrentPassword('');
      setEmailStatus({
        error: null,
        success: 'Email updated. You are still signed in with the refreshed session.',
      });
      toast({
        title: 'Email updated',
        description: 'Your sign-in email was updated successfully.',
      });
    } catch (error) {
      const nextMessage =
        error instanceof ApiClientError &&
        (error.status === 409 || error.message === 'Email is already in use.')
          ? 'Email is being used by another account.'
          : error instanceof ApiClientError
            ? error.message
            : 'Email change failed.';

      setEmailStatus({
        error: nextMessage,
        success: null,
      });
      toast({
        title: 'Email update failed',
        description: nextMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordStatus({ error: null, success: null });

    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({
        error: 'New passwords must match.',
        success: null,
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordCurrentPassword,
        newPassword,
      });
      setPasswordCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordStatus({
        error: null,
        success: 'Password updated. Sign in again with your new password.',
      });
      toast({
        title: 'Password updated',
        description: 'Sign in again with your new password.',
      });
      onClose();
      navigate('/login', {
        replace: true,
        state: {
          message: 'Password updated. Sign in again with your new password.',
        },
      });
    } catch (error) {
      setPasswordStatus({
        error: error instanceof ApiClientError ? error.message : 'Password change failed.',
        success: null,
      });
      toast({
        title: 'Password update failed',
        description: error instanceof ApiClientError ? error.message : 'Password change failed.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
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
                className="justify-start w-48 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-gray-500" />
                  General
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="justify-start w-48 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-500" />
                  Appearance
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="import-export" 
                className="justify-start w-48 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-green-500" />
                  Import & Export
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="library-management" 
                className="justify-start w-48 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-primary" />
                  Library Management
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="account" 
                className="justify-start w-48 data-[state=active]:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Account
                </span>
              </TabsTrigger>
              <Button
                variant="ghost"
                className="justify-start w-48 px-3 text-amber-700 hover:text-amber-800"
                onClick={handleLogout}
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Log Out
                </span>
              </Button>
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
                          onBlur={() => {
                            void handlePreferredNameBlur();
                          }}
                          disabled={isUpdatingPreferredName}
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

                  <Separator />

                  <GoalsTab />
                </div>
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
                        <Sun className="h-8 w-8 text-yellow-500 mb-2" />
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
                    <h4 className="text-base font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Bookshelf View
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Control how your shelves are arranged and how books behave on hover.
                    </p>

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

              <TabsContent value="library-management" className="mt-0">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Library Management
                </h3>
                <p className="text-muted-foreground mb-6">
                  Manage destructive actions that affect your library data without changing your account credentials.
                </p>

                <div className="space-y-6">
                  <Card className="border-destructive/20 bg-destructive/5 p-6">
                    <h4 className="font-medium mb-2">Delete Library</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isAuthenticated
                        ? 'This will delete all books from your MongoDB-backed account library, remove their references from series and collections, delete book-linked notifications, and clear stale browser cache on this device.'
                        : 'This will remove all books from your local library, clear book references from series and collections, and keep those series and collection structures intact.'}
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                      <li>{isAuthenticated ? 'All account-library books will be deleted from the remote source of truth' : 'All local books will be deleted'}</li>
                      <li>Books will be removed from series and collections</li>
                      <li>Series and collection structures will be preserved</li>
                      {isAuthenticated && (
                        <li>This device&apos;s stale local cache will be cleared after the remote deletion completes</li>
                      )}
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
                      This will completely reset your library by removing all books, series, collections, upcoming releases, and notifications.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                      <li>All books will be deleted</li>
                      <li>All series will be deleted</li>
                      <li>All collections will be deleted</li>
                      <li>All upcoming releases and notifications will be deleted</li>
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
              
              <TabsContent value="account" className="mt-0">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Account
                </h3>
                <p className="text-muted-foreground mb-6">
                  Manage the credentials tied to your account and account-level destructive actions.
                </p>

                <div className="space-y-6">
                  <Card className="p-6">
                    <h4 className="font-medium mb-2">Change Email</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your email is your sign-in identity. Email changes take effect immediately in v1 and keep you signed in.
                    </p>

                    <form className="space-y-4" onSubmit={handleEmailChange}>
                      <div className="grid gap-2">
                        <label htmlFor="account-email" className="text-sm font-medium">New Email</label>
                        <input
                          id="account-email"
                          type="email"
                          autoComplete="email"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={accountEmail}
                          onChange={(event) => setAccountEmail(event.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="email-current-password" className="text-sm font-medium">Current Password</label>
                        <PasswordInput
                          id="email-current-password"
                          autoComplete="current-password"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={emailCurrentPassword}
                          onChange={(event) => setEmailCurrentPassword(event.target.value)}
                        />
                      </div>

                      {emailStatus.error && (
                        <p className="text-sm text-destructive">{emailStatus.error}</p>
                      )}

                      {emailStatus.success && (
                        <p className="text-sm text-muted-foreground">{emailStatus.success}</p>
                      )}

                      <Button disabled={isUpdatingEmail} type="submit">
                        {isUpdatingEmail ? 'Updating Email...' : 'Update Email'}
                      </Button>
                    </form>
                  </Card>

                  <Card className="p-6">
                    <h4 className="font-medium mb-2">Change Password</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Password changes sign out the current session and invalidate older sessions. You will need to sign in again afterward.
                    </p>

                    <form className="space-y-4" onSubmit={handlePasswordChange}>
                      <div className="grid gap-2">
                        <label htmlFor="password-current-password" className="text-sm font-medium">Current Password</label>
                        <PasswordInput
                          id="password-current-password"
                          autoComplete="current-password"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={passwordCurrentPassword}
                          onChange={(event) => setPasswordCurrentPassword(event.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="new-password" className="text-sm font-medium">New Password</label>
                        <PasswordInput
                          id="new-password"
                          autoComplete="new-password"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="confirm-new-password" className="text-sm font-medium">Confirm New Password</label>
                        <PasswordInput
                          id="confirm-new-password"
                          autoComplete="new-password"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={confirmNewPassword}
                          onChange={(event) => setConfirmNewPassword(event.target.value)}
                        />
                      </div>

                      {passwordStatus.error && (
                        <p className="text-sm text-destructive">{passwordStatus.error}</p>
                      )}

                      {passwordStatus.success && (
                        <p className="text-sm text-muted-foreground">{passwordStatus.success}</p>
                      )}

                      <Button disabled={isUpdatingPassword} type="submit">
                        {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                      </Button>
                    </form>
                  </Card>

                  {isAuthenticated && (
                    <Card className="border-destructive/20 bg-destructive/10 p-6">
                      <h4 className="font-medium mb-2">Delete Account</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        This will permanently delete your account, your library, your settings, and all account-associated records.
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                        <li>Your user account will be deleted</li>
                        <li>All books, series, collections, upcoming releases, and notifications will be deleted</li>
                        <li>Your account settings and migration metadata will be deleted</li>
                        <li>You will be signed out immediately</li>
                      </ul>

                      <Button
                        variant="destructive"
                        className="mt-2 flex items-center gap-2"
                        onClick={() => {
                          setDeleteMode('account');
                          setShowDeleteConfirmation(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </Button>
                    </Card>
                  )}
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
                  {deleteMode === 'delete'
                    ? 'Delete Library?'
                    : deleteMode === 'reset'
                      ? 'Reset Library?'
                      : 'Delete Account?'}
                </AlertDialogTitle>
                {/* Use a custom description to avoid DOM nesting issues */}
                <div className="text-sm text-muted-foreground">
                  {deleteMode === 'delete' ? (
                    <>
                      <span className="block mb-2">Are you sure you want to delete all books from your {isAuthenticated ? 'remote account library' : 'local library'}? This action <strong>cannot be undone</strong>.</span>
                      <span className="block mb-4">
                        {isAuthenticated
                          ? 'All remote account-library books will be removed, book-linked notifications will be deleted, series and collection structures will remain intact, and this device cache will be cleared afterward.'
                          : 'All books will be removed, but your series and collection structures will remain intact.'}
                      </span>
                    </>
                  ) : deleteMode === 'reset' ? (
                    <>
                      <span className="block mb-2">Are you sure you want to completely reset your {isAuthenticated ? 'account library' : 'local library'}? This action <strong>cannot be undone</strong>.</span>
                      <span className="block mb-4">All books, series, collections, upcoming releases, and notifications will be permanently deleted.</span>
                    </>
                  ) : (
                    <>
                      <span className="block mb-2">Are you sure you want to permanently delete your account? This action <strong>cannot be undone</strong>.</span>
                      <span className="block mb-4">Your account, library, settings, migration history, and all account-associated records will be permanently deleted.</span>
                    </>
                  )}
                  <span className="block text-sm font-medium">We recommend exporting a backup before proceeding.</span>
                </div>
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
                    } else if (deleteMode === 'account' && onDeleteAccount) {
                      onDeleteAccount();
                    }
                    setShowDeleteConfirmation(false);
                  }}
                >
                  {deleteMode === 'delete'
                    ? 'Yes, Delete Library'
                    : deleteMode === 'reset'
                      ? 'Yes, Reset Library'
                      : 'Yes, Delete Account'}
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
