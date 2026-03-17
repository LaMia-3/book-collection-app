import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Database, HardDrive, KeyRound, RefreshCw, Trash2, UserCircle, Wrench } from "lucide-react";
import { PageHeader } from '@/components/ui/page-header';
import { DatabaseRepairUtility } from '@/components/debug/DatabaseRepairUtility';
import { SessionDiagnostics } from '@/components/debug/SessionDiagnostics';
import { MigrationDiagnostics } from '@/components/debug/MigrationDiagnostics';

import { IndexedDBViewer } from '@/components/debug/IndexedDBViewer';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiClientError, authApi } from '@/lib/apiClient';
import type { AuthUser } from '@/lib/auth-storage';

/**
 * Admin Page
 * 
 * A unified admin interface that combines:
 * 1. Database Viewer - View and inspect IndexedDB data
 * 2. Database Repair - Diagnose and fix database issues
 * 3. User Settings - View user settings
 */
export default function AdminPage() {
  // Get tab from URL query parameter if available
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabParam || 'account');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<{
    user: AuthUser;
    counts: {
      books: number;
      series: number;
      collections: number;
      upcomingReleases: number;
      notifications: number;
    };
    hasUserSettings: boolean;
  } | null>(null);
  const [selectedUserError, setSelectedUserError] = useState<string | null>(null);
  const [isLoadingSelectedUser, setIsLoadingSelectedUser] = useState(false);
  const [isUpdatingSelectedUserRole, setIsUpdatingSelectedUserRole] = useState(false);
  const [showResetPasswordConfirmation, setShowResetPasswordConfirmation] = useState(false);
  const [resetPasswordConfirmationValue, setResetPasswordConfirmationValue] = useState('');
  const [isResettingSelectedUserPassword, setIsResettingSelectedUserPassword] = useState(false);
  const [generatedTemporaryPassword, setGeneratedTemporaryPassword] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState('');
  const [isDeletingSelectedUser, setIsDeletingSelectedUser] = useState(false);
  const { settings } = useSettings();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        setUsersError(null);
        const nextUsers = await authApi.getAdminUsers();
        setUsers(nextUsers);
      } catch (error) {
        setUsersError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to load users.',
        );
      } finally {
        setIsLoadingUsers(false);
      }
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserDetail(null);
      setSelectedUserError(null);
      setGeneratedTemporaryPassword(null);
      return;
    }

    setGeneratedTemporaryPassword(null);

    const loadSelectedUser = async () => {
      try {
        setIsLoadingSelectedUser(true);
        setSelectedUserError(null);
        const nextDetail = await authApi.getAdminUserDetail(selectedUserId);
        setSelectedUserDetail(nextDetail);
      } catch (error) {
        setSelectedUserDetail(null);
        setSelectedUserError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to load user detail.',
        );
      } finally {
        setIsLoadingSelectedUser(false);
      }
    };

    void loadSelectedUser();
  }, [selectedUserId]);

  const selectedUserIsCurrentAdmin = selectedUserDetail?.user.id === user?.id;
  const resetConfirmationMatches =
    resetPasswordConfirmationValue.trim().toLowerCase() ===
    (selectedUserDetail?.user.email || '').trim().toLowerCase();
  const deleteConfirmationMatches =
    deleteConfirmationValue.trim().toLowerCase() ===
    (selectedUserDetail?.user.email || '').trim().toLowerCase();

  const handleSelectedUserRoleChange = async (role: 'user' | 'admin') => {
    if (!selectedUserDetail) {
      return;
    }

    try {
      setIsUpdatingSelectedUserRole(true);

      const result = await authApi.adminSetRole({
        userId: selectedUserDetail.user.id,
        role,
      });

      setUsers((currentUsers) =>
        currentUsers.map((listedUser) =>
          listedUser.id === result.user.id ? result.user : listedUser,
        ),
      );
      setSelectedUserDetail((currentDetail) =>
        currentDetail
          ? {
              ...currentDetail,
              user: result.user,
            }
          : currentDetail,
      );

      toast({
        title: role === 'admin' ? 'Admin access granted' : 'Admin access removed',
        description:
          role === 'admin'
            ? `${result.user.email} is now an admin.`
            : `${result.user.email} no longer has admin access.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Role update failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : 'Failed to update the selected user role.',
      });
    } finally {
      setIsUpdatingSelectedUserRole(false);
    }
  };

  const handleDeleteSelectedUser = async () => {
    if (!selectedUserDetail) {
      return;
    }

    try {
      setIsDeletingSelectedUser(true);

      const result = await authApi.adminDeleteAccount({
        userId: selectedUserDetail.user.id,
      });

      setUsers((currentUsers) =>
        currentUsers.filter((listedUser) => listedUser.id !== selectedUserDetail.user.id),
      );
      setSelectedUserId(null);
      setSelectedUserDetail(null);
      setSelectedUserError(null);
      setDeleteConfirmationValue('');
      setShowDeleteConfirmation(false);

      toast({
        title: "Account deleted",
        description: `${result.deletedUser.email} was permanently deleted. Removed ${result.summary.books} books, ${result.summary.series} series, ${result.summary.collections} collections, ${result.summary.upcomingReleases} upcoming releases, ${result.summary.notifications} notifications, and ${result.summary.userSettings} user settings documents.`,
      });
    } catch (error) {
      const description =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to delete the selected account.';

      toast({
        variant: "destructive",
        title: "Delete account failed",
        description,
      });
    } finally {
      setIsDeletingSelectedUser(false);
    }
  };

  const handleResetSelectedUserPassword = async () => {
    if (!selectedUserDetail) {
      return;
    }

    try {
      setIsResettingSelectedUserPassword(true);

      const result = await authApi.adminResetPassword({
        userId: selectedUserDetail.user.id,
      });

      setGeneratedTemporaryPassword(result.temporaryPassword);
      setResetPasswordConfirmationValue('');
      setShowResetPasswordConfirmation(false);

      toast({
        title: "Temporary password generated",
        description: `Existing sessions for ${result.user.email} were invalidated.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : 'Failed to reset the selected user password.',
      });
    } finally {
      setIsResettingSelectedUserPassword(false);
    }
  };

  return (
    <div className="container py-8 max-w-7xl">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Inspect account state, migration metadata, and browser cache diagnostics"
        backTo="/"
        backAriaLabel="Back to Library"
        className="mb-8"
      >
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full mb-8">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Migration</span>
          </TabsTrigger>
          <TabsTrigger value="local-cache" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span>Local Cache</span>
          </TabsTrigger>
          <TabsTrigger value="repair" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>Repair</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <SessionDiagnostics />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2" />
                User List
              </CardTitle>
              <CardDescription>
                Basic admin view of signed-up users. This is the first read-only slice before user management actions are added.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersError ? (
                <Alert variant="destructive">
                  <AlertTitle>User List Error</AlertTitle>
                  <AlertDescription>{usersError}</AlertDescription>
                </Alert>
              ) : isLoadingUsers ? (
                <p className="text-sm text-muted-foreground">Loading users…</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selectedUserId === user.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.preferredName || 'No preferred name'}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><span className="font-medium">Role:</span> {user.role}</p>
                          <p><span className="font-medium">Created:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
                          <p><span className="font-medium">Last Login:</span> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Not recorded'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2" />
                Selected User Detail
              </CardTitle>
              <CardDescription>
                Inspection context for a chosen user account. This is read-only and does not impersonate the user session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedUserError ? (
                <Alert variant="destructive">
                  <AlertTitle>User Detail Error</AlertTitle>
                  <AlertDescription>{selectedUserError}</AlertDescription>
                </Alert>
              ) : !selectedUserId ? (
                <p className="text-sm text-muted-foreground">
                  Select a user from the list above to inspect their account and record counts.
                </p>
              ) : isLoadingSelectedUser ? (
                <p className="text-sm text-muted-foreground">Loading selected user…</p>
              ) : selectedUserDetail ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Email:</span> {selectedUserDetail.user.email}</p>
                      <p><span className="font-medium">Role:</span> {selectedUserDetail.user.role}</p>
                      <p><span className="font-medium">Preferred Name:</span> {selectedUserDetail.user.preferredName || 'Not set'}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">User ID:</span> {selectedUserDetail.user.id}</p>
                      <p><span className="font-medium">Created:</span> {new Date(selectedUserDetail.user.createdAt).toLocaleString()}</p>
                      <p><span className="font-medium">Last Login:</span> {selectedUserDetail.user.lastLoginAt ? new Date(selectedUserDetail.user.lastLoginAt).toLocaleString() : 'Not recorded'}</p>
                      <p><span className="font-medium">User Settings:</span> {selectedUserDetail.hasUserSettings ? 'Present' : 'None found'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Books</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedUserDetail.counts.books}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Series</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedUserDetail.counts.series}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Collections</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedUserDetail.counts.collections}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Upcoming Releases</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedUserDetail.counts.upcomingReleases}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Notifications</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedUserDetail.counts.notifications}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Admin Access</h3>
                        <p className="text-sm text-muted-foreground">
                          Promote standard users to admin or remove admin access from other admins. Self-demotion is blocked, and the final remaining admin cannot be demoted.
                        </p>
                        {selectedUserIsCurrentAdmin ? (
                          <p className="text-sm font-medium text-muted-foreground">
                            You cannot change your own admin role from this screen.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedUserDetail.user.role === 'user' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void handleSelectedUserRoleChange('admin')}
                            disabled={selectedUserIsCurrentAdmin || isUpdatingSelectedUserRole}
                          >
                            {isUpdatingSelectedUserRole ? 'Updating…' : 'Promote to Admin'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleSelectedUserRoleChange('user')}
                            disabled={selectedUserIsCurrentAdmin || isUpdatingSelectedUserRole}
                          >
                            {isUpdatingSelectedUserRole ? 'Updating…' : 'Remove Admin Access'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 font-semibold">
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Generate a temporary password for this user. Existing sessions will be invalidated immediately.
                        </p>
                        {selectedUserIsCurrentAdmin ? (
                          <p className="text-sm font-medium text-muted-foreground">
                            Use your own account settings to change your password. This admin reset tool cannot be used on your own account.
                          </p>
                        ) : null}
                        {generatedTemporaryPassword ? (
                          <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            <AlertTitle>Temporary password</AlertTitle>
                            <AlertDescription>
                              <div className="space-y-2">
                                <p>Copy this now. It is only shown here after the reset succeeds.</p>
                                <code className="block rounded bg-background/80 px-3 py-2 font-mono text-sm text-foreground">
                                  {generatedTemporaryPassword}
                                </code>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowResetPasswordConfirmation(true)}
                        disabled={selectedUserIsCurrentAdmin || isResettingSelectedUserPassword}
                      >
                        Reset Password
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 font-semibold text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          This permanently deletes the selected user account and all remote data owned by that user. This action cannot be undone.
                        </p>
                        <div className="text-sm text-muted-foreground">
                          <p>Deletion summary:</p>
                          <p>{selectedUserDetail.counts.books} books, {selectedUserDetail.counts.series} series, {selectedUserDetail.counts.collections} collections</p>
                          <p>{selectedUserDetail.counts.upcomingReleases} upcoming releases, {selectedUserDetail.counts.notifications} notifications, {selectedUserDetail.hasUserSettings ? 1 : 0} user settings documents</p>
                        </div>
                        {selectedUserIsCurrentAdmin ? (
                          <p className="text-sm font-medium text-destructive">
                            Admins cannot delete their own account.
                          </p>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowDeleteConfirmation(true)}
                        disabled={selectedUserIsCurrentAdmin || isDeletingSelectedUser}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2" />
                Settings Snapshot
              </CardTitle>
              <CardDescription>
                Current settings resolved from {isAuthenticated ? 'the authenticated account document' : 'browser-local storage'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="font-medium mb-4">General Settings</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Preferred Name:</span>
                      <span className="col-span-2">{settings.preferredName || 'Not set'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Birthday:</span>
                      <span className="col-span-2">{settings.birthday || 'Not set'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Celebrate Birthday:</span>
                      <span className="col-span-2">{settings.celebrateBirthday ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-4">View & API Preferences</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Default View:</span>
                      <span className="col-span-2">{settings.defaultView || 'shelf'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Default API:</span>
                      <span className="col-span-2">{settings.defaultApi || 'google'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Default Status:</span>
                      <span className="col-span-2">{settings.defaultStatus || 'want-to-read'}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-4">Reading Goals</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Goals Enabled:</span>
                      <span className="col-span-2">{settings.goals?.enabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Monthly Target:</span>
                      <span className="col-span-2">{settings.goals?.monthlyTarget || 0} books</span>
                    </div>
                  </div>
                </Card>

                <Alert className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Operational Note</AlertTitle>
                  <AlertDescription>
                    This tab shows account/session resolution. Browser-local repair and IndexedDB inspection now live under separate admin tabs because they are no longer the primary data layer for authenticated users.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration">
          <MigrationDiagnostics />
        </TabsContent>

        <TabsContent value="local-cache" className="space-y-6">
          <Alert className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Browser Cache Tools Only</AlertTitle>
            <AlertDescription>
              These diagnostics inspect IndexedDB and legacy browser storage on this device only. They do not read MongoDB directly and they do not change remote account records.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Local Cache Inspector
              </CardTitle>
              <CardDescription>
                Inspect IndexedDB object stores and local browser cache content for troubleshooting and migration support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IndexedDBViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repair">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Local Cache Repair
              </CardTitle>
              <CardDescription>
                Diagnose and repair browser-local IndexedDB issues without touching remote account data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DatabaseRepairUtility />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      </PageHeader>

      <AlertDialog
        open={showResetPasswordConfirmation}
        onOpenChange={(open) => {
          setShowResetPasswordConfirmation(open);

          if (!open) {
            setResetPasswordConfirmationValue('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Generate Temporary Password
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  This generates a new temporary password for <span className="font-medium text-foreground">{selectedUserDetail?.user.email}</span> and immediately invalidates their existing sessions.
                </p>
                <div className="space-y-2">
                  <label htmlFor="admin-reset-confirmation" className="font-medium text-foreground">
                    Type the user email to confirm
                  </label>
                  <Input
                    id="admin-reset-confirmation"
                    value={resetPasswordConfirmationValue}
                    onChange={(event) => setResetPasswordConfirmationValue(event.target.value)}
                    placeholder={selectedUserDetail?.user.email || 'user@example.com'}
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingSelectedUserPassword}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleResetSelectedUserPassword();
              }}
              disabled={!resetConfirmationMatches || isResettingSelectedUserPassword || selectedUserIsCurrentAdmin}
            >
              {isResettingSelectedUserPassword ? 'Generating…' : 'Generate Temporary Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteConfirmation}
        onOpenChange={(open) => {
          setShowDeleteConfirmation(open);

          if (!open) {
            setDeleteConfirmationValue('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  This permanently deletes <span className="font-medium text-foreground">{selectedUserDetail?.user.email}</span> and all remote data owned by that account.
                </p>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="font-medium text-foreground">Deletion summary</p>
                  <p>Books: {selectedUserDetail?.counts.books || 0}</p>
                  <p>Series: {selectedUserDetail?.counts.series || 0}</p>
                  <p>Collections: {selectedUserDetail?.counts.collections || 0}</p>
                  <p>Upcoming Releases: {selectedUserDetail?.counts.upcomingReleases || 0}</p>
                  <p>Notifications: {selectedUserDetail?.counts.notifications || 0}</p>
                  <p>User Settings: {selectedUserDetail?.hasUserSettings ? 1 : 0}</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="admin-delete-confirmation" className="font-medium text-foreground">
                    Type the user email to confirm
                  </label>
                  <Input
                    id="admin-delete-confirmation"
                    value={deleteConfirmationValue}
                    onChange={(event) => setDeleteConfirmationValue(event.target.value)}
                    placeholder={selectedUserDetail?.user.email || 'user@example.com'}
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSelectedUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSelectedUser();
              }}
              disabled={!deleteConfirmationMatches || isDeletingSelectedUser || selectedUserIsCurrentAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSelectedUser ? 'Deleting…' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
