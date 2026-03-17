import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, HardDrive, RefreshCw, UserCircle, Wrench } from "lucide-react";
import { PageHeader } from '@/components/ui/page-header';
import { DatabaseRepairUtility } from '@/components/debug/DatabaseRepairUtility';
import { SessionDiagnostics } from '@/components/debug/SessionDiagnostics';
import { MigrationDiagnostics } from '@/components/debug/MigrationDiagnostics';

import { IndexedDBViewer } from '@/components/debug/IndexedDBViewer';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
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
  const { settings } = useSettings();
  const { isAuthenticated } = useAuth();

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
                    <div key={user.id} className="rounded-lg border p-4">
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
    </div>
  );
}
