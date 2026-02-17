import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, Wrench, Zap, UserCircle, AlertCircle } from "lucide-react";
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';
import { DatabaseRepairUtility } from '@/components/debug/DatabaseRepairUtility';

// Import components and utilities
import { IndexedDBViewer } from '@/components/debug/IndexedDBViewer';
import WorkflowTester from '@/components/debug/WorkflowTester';
import { useSettings } from '@/contexts/SettingsContext';

// Import services
import { databaseService } from '@/services/DatabaseService';
import { seriesService } from '@/services/SeriesService';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';
import { notificationService } from '@/services/NotificationService';
import { readingOrderService } from '@/services/ReadingOrderService';

/**
 * Admin Page
 * 
 * A unified admin interface that combines:
 * 1. Database Viewer - View and inspect IndexedDB data
 * 2. Database Repair - Diagnose and fix database issues
 * 3. User Settings - View user settings
 * 4. Workflow Test - Test library workflows
 */
export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Get tab from URL query parameter if available
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabParam || 'viewer');
  const { settings } = useSettings();
  

  return (
    <div className="container py-8 max-w-7xl">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage your database and storage"
        backTo="/"
        backAriaLabel="Back to Library"
        className="mb-8"
      >
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full mb-8">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Database Viewer</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span>User Settings</span>
          </TabsTrigger>
          <TabsTrigger value="repair" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>Database Repair</span>
          </TabsTrigger>
          <TabsTrigger value="workflow-test" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Workflow Test</span>
          </TabsTrigger>
        </TabsList>

        {/* Database Viewer Tab */}
        <TabsContent value="viewer">
          <Card>
            <CardHeader>
              <CardTitle>Database Viewer</CardTitle>
              <CardDescription>
                View and inspect your IndexedDB data stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IndexedDBViewer />
            </CardContent>
          </Card>
        </TabsContent>



        {/* User Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2" />
                User Settings
              </CardTitle>
              <CardDescription>
                View and manage user settings, including birthday information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                  <AlertTitle>Birthday Information</AlertTitle>
                  <AlertDescription>
                    The birthday is stored in user settings and is used to display the birthday celebration. 
                    The current format is: {settings.birthday ? `"${settings.birthday}"` : 'Not set'}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Test Tab */}
        <TabsContent value="workflow-test">
          <Card>
            <CardHeader>
              <CardTitle>Library Workflow Tester</CardTitle>
              <CardDescription>
                Add sample books from Google Books and Open Library APIs and organize them into series
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowTester />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Repair Tab */}
        <TabsContent value="repair">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Database Repair Utility
              </CardTitle>
              <CardDescription>
                Diagnose and fix database issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DatabaseRepairUtility />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Test is now the last tab */}
      </Tabs>
      </PageHeader>
    </div>
  );
}
