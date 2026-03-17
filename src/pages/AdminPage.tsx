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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Database, FileText, HardDrive, KeyRound, Megaphone, RefreshCw, Trash2, UserCircle, Wrench } from "lucide-react";
import { PageHeader } from '@/components/ui/page-header';
import { DatabaseRepairUtility } from '@/components/debug/DatabaseRepairUtility';
import { SessionDiagnostics } from '@/components/debug/SessionDiagnostics';
import { MigrationDiagnostics } from '@/components/debug/MigrationDiagnostics';

import { IndexedDBViewer } from '@/components/debug/IndexedDBViewer';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  AdminAuditLogRecord,
  AdminSystemAnnouncementRecord,
  ApiClientError,
  authApi,
} from '@/lib/apiClient';
import type { AuthUser } from '@/lib/auth-storage';

type AnnouncementFormState = {
  title: string;
  announcementBody: string;
  kind: 'release' | 'maintenance' | 'warning' | 'feature';
  severity: 'info' | 'success' | 'warning' | 'critical';
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  minAppVersion: string;
  maxAppVersion: string;
  environment: 'all' | 'preview' | 'production';
  ctaLabel: string;
  ctaUrl: string;
};

const createEmptyAnnouncementForm = (): AnnouncementFormState => ({
  title: '',
  announcementBody: '',
  kind: 'feature',
  severity: 'info',
  isActive: true,
  startsAt: '',
  endsAt: '',
  minAppVersion: '',
  maxAppVersion: '',
  environment: 'all',
  ctaLabel: '',
  ctaUrl: '',
});

const toDatetimeLocalValue = (value?: string): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const toAnnouncementFormState = (
  announcement: AdminSystemAnnouncementRecord,
): AnnouncementFormState => ({
  title: announcement.title,
  announcementBody: announcement.body,
  kind: announcement.kind,
  severity: announcement.severity,
  isActive: announcement.isActive,
  startsAt: toDatetimeLocalValue(announcement.startsAt),
  endsAt: toDatetimeLocalValue(announcement.endsAt),
  minAppVersion: announcement.minAppVersion || '',
  maxAppVersion: announcement.maxAppVersion || '',
  environment: announcement.environment,
  ctaLabel: announcement.ctaLabel || '',
  ctaUrl: announcement.ctaUrl || '',
});

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
  const [userFilterQuery, setUserFilterQuery] = useState('');
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
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AdminSystemAnnouncementRecord[]>([]);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(
    createEmptyAnnouncementForm(),
  );
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [showDeleteAnnouncementConfirmation, setShowDeleteAnnouncementConfirmation] = useState(false);
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

  useEffect(() => {
    if (activeTab !== 'audit-logs') {
      return;
    }

    const loadAuditLogs = async () => {
      try {
        setIsLoadingAuditLogs(true);
        setAuditLogsError(null);
        const nextLogs = await authApi.getAdminAuditLogs();
        setAuditLogs(nextLogs);
      } catch (error) {
        setAuditLogsError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to load admin audit logs.',
        );
      } finally {
        setIsLoadingAuditLogs(false);
      }
    };

    void loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'announcements') {
      return;
    }

    const loadAnnouncements = async () => {
      try {
        setIsLoadingAnnouncements(true);
        setAnnouncementsError(null);
        const nextAnnouncements = await authApi.getAdminSystemAnnouncements();
        setAnnouncements(nextAnnouncements);
      } catch (error) {
        setAnnouncementsError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to load system announcements.',
        );
      } finally {
        setIsLoadingAnnouncements(false);
      }
    };

    void loadAnnouncements();
  }, [activeTab]);

  const selectedUserIsCurrentAdmin = selectedUserDetail?.user.id === user?.id;
  const resetConfirmationMatches =
    resetPasswordConfirmationValue.trim().toLowerCase() ===
    (selectedUserDetail?.user.email || '').trim().toLowerCase();
  const deleteConfirmationMatches =
    deleteConfirmationValue.trim().toLowerCase() ===
    (selectedUserDetail?.user.email || '').trim().toLowerCase();
  const normalizedUserFilterQuery = userFilterQuery.trim().toLowerCase();
  const filteredUsers = users.filter((listedUser) => {
    if (!normalizedUserFilterQuery) {
      return true;
    }

    return [
      listedUser.email,
      listedUser.preferredName || '',
      listedUser.role,
    ].some((value) => value.toLowerCase().includes(normalizedUserFilterQuery));
  });
  const selectedAnnouncement = announcements.find(
    (announcement) => announcement.id === selectedAnnouncementId,
  ) || null;

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

  const handleSelectAnnouncement = (announcement: AdminSystemAnnouncementRecord) => {
    setSelectedAnnouncementId(announcement.id);
    setAnnouncementForm(toAnnouncementFormState(announcement));
  };

  const handleAnnouncementFormChange = (
    field: keyof AnnouncementFormState,
    value: string | boolean,
  ) => {
    setAnnouncementForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const resetAnnouncementEditor = () => {
    setSelectedAnnouncementId(null);
    setAnnouncementForm(createEmptyAnnouncementForm());
  };

  const refreshAnnouncements = async () => {
    const nextAnnouncements = await authApi.getAdminSystemAnnouncements();
    setAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  };

  const handleSaveAnnouncement = async () => {
    try {
      setIsSavingAnnouncement(true);

      const payload = {
        title: announcementForm.title,
        announcementBody: announcementForm.announcementBody,
        kind: announcementForm.kind,
        severity: announcementForm.severity,
        isActive: announcementForm.isActive,
        startsAt: announcementForm.startsAt || undefined,
        endsAt: announcementForm.endsAt || undefined,
        minAppVersion: announcementForm.minAppVersion || undefined,
        maxAppVersion: announcementForm.maxAppVersion || undefined,
        environment: announcementForm.environment,
        ctaLabel: announcementForm.ctaLabel || undefined,
        ctaUrl: announcementForm.ctaUrl || undefined,
      };

      if (selectedAnnouncementId) {
        const updatedAnnouncement = await authApi.updateAdminSystemAnnouncement({
          announcementId: selectedAnnouncementId,
          ...payload,
        });
        const nextAnnouncements = await refreshAnnouncements();

        setSelectedAnnouncementId(updatedAnnouncement.id);
        const selectedFromList =
          nextAnnouncements.find(
            (announcement) => announcement.id === updatedAnnouncement.id,
          ) || null;

        if (selectedFromList) {
          setAnnouncementForm(toAnnouncementFormState(selectedFromList));
        }

        toast({
          title: "Announcement updated",
          description: `${updatedAnnouncement.title} was updated.`,
        });
      } else {
        const createdAnnouncement = await authApi.createAdminSystemAnnouncement(payload);
        const nextAnnouncements = await refreshAnnouncements();
        const selectedFromList =
          nextAnnouncements.find(
            (announcement) => announcement.id === createdAnnouncement.id,
          ) || null;

        setSelectedAnnouncementId(createdAnnouncement.id);
        setAnnouncementForm(
          selectedFromList
            ? toAnnouncementFormState(selectedFromList)
            : toAnnouncementFormState({
                ...createdAnnouncement,
                seenCount: 0,
                dismissedCount: 0,
              }),
        );

        toast({
          title: "Announcement created",
          description: `${createdAnnouncement.title} is ready.`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Announcement save failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : 'Failed to save the announcement.',
      });
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleToggleAnnouncementActive = async (
    announcement: AdminSystemAnnouncementRecord,
  ) => {
    try {
      const updatedAnnouncement = await authApi.updateAdminSystemAnnouncement({
        announcementId: announcement.id,
        isActive: !announcement.isActive,
      });
      const nextAnnouncements = await refreshAnnouncements();

      if (selectedAnnouncementId === updatedAnnouncement.id) {
        const selectedFromList =
          nextAnnouncements.find(
            (nextAnnouncement) => nextAnnouncement.id === updatedAnnouncement.id,
          ) || null;

        if (selectedFromList) {
          setAnnouncementForm(toAnnouncementFormState(selectedFromList));
        }
      }

      toast({
        title: updatedAnnouncement.isActive ? 'Announcement activated' : 'Announcement deactivated',
        description: `${updatedAnnouncement.title} is now ${updatedAnnouncement.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Announcement update failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : 'Failed to update the announcement.',
      });
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) {
      return;
    }

    try {
      await authApi.deleteAdminSystemAnnouncement(selectedAnnouncement.id);
      await refreshAnnouncements();
      setShowDeleteAnnouncementConfirmation(false);
      resetAnnouncementEditor();

      toast({
        title: "Announcement deleted",
        description: `${selectedAnnouncement.title} was deleted.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Announcement delete failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : 'Failed to delete the announcement.',
      });
    }
  };

  const getAuditLogActionLabel = (action: AdminAuditLogRecord['action']): string => {
    switch (action) {
      case 'admin.user.promoted':
        return 'User Promoted';
      case 'admin.user.demoted':
        return 'Admin Access Removed';
      case 'admin.user.password_reset':
        return 'Password Reset';
      case 'admin.user.deleted':
        return 'Account Deleted';
      case 'admin.announcement.created':
        return 'Announcement Created';
      case 'admin.announcement.updated':
        return 'Announcement Updated';
      case 'admin.announcement.deleted':
        return 'Announcement Deleted';
      case 'admin.announcement.activated':
        return 'Announcement Activated';
      case 'admin.announcement.deactivated':
        return 'Announcement Deactivated';
      default:
        return action;
    }
  };

  const renderAuditLogDetails = (log: AdminAuditLogRecord): string | null => {
    if (log.action === 'admin.user.promoted' || log.action === 'admin.user.demoted') {
      const previousRole = typeof log.details?.previousRole === 'string' ? log.details.previousRole : undefined;
      const nextRole = typeof log.details?.nextRole === 'string' ? log.details.nextRole : undefined;

      if (previousRole && nextRole) {
        return `${previousRole} -> ${nextRole}`;
      }
    }

    if (log.action === 'admin.user.password_reset') {
      return 'Existing sessions invalidated.';
    }

    if (log.action === 'admin.user.deleted') {
      const summary = log.details?.summary;

      if (summary && typeof summary === 'object') {
        const typedSummary = summary as Record<string, unknown>;

        return `${typedSummary.books ?? 0} books, ${typedSummary.series ?? 0} series, ${typedSummary.collections ?? 0} collections, ${typedSummary.upcomingReleases ?? 0} upcoming releases, ${typedSummary.notifications ?? 0} notifications, ${typedSummary.userSettings ?? 0} user settings`;
      }
    }

    if (
      log.action === 'admin.announcement.created' ||
      log.action === 'admin.announcement.updated' ||
      log.action === 'admin.announcement.activated' ||
      log.action === 'admin.announcement.deactivated' ||
      log.action === 'admin.announcement.deleted'
    ) {
      const environment = typeof log.details?.environment === 'string' ? log.details.environment : undefined;
      const severity = typeof log.details?.severity === 'string' ? log.details.severity : undefined;
      const isActive = typeof log.details?.isActive === 'boolean' ? log.details.isActive : undefined;

      return [environment, severity, isActive === undefined ? undefined : isActive ? 'active' : 'inactive']
        .filter(Boolean)
        .join(' · ');
    }

    return null;
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
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span>Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Audit Logs</span>
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
                  <Input
                    value={userFilterQuery}
                    onChange={(event) => setUserFilterQuery(event.target.value)}
                    placeholder="Filter by email, preferred name, or role"
                    aria-label="Filter users"
                  />

                  {filteredUsers.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No users match this filter.
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
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
                    ))
                  )}
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

        <TabsContent value="announcements" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  {selectedAnnouncementId ? 'Edit Announcement' : 'Create Announcement'}
                </CardTitle>
                <CardDescription>
                  Manage in-app product updates without mixing them into release notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="announcement-title">Title</Label>
                    <Input
                      id="announcement-title"
                      value={announcementForm.title}
                      onChange={(event) => handleAnnouncementFormChange('title', event.target.value)}
                      placeholder="What changed?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-environment">Environment</Label>
                    <Select
                      value={announcementForm.environment}
                      onValueChange={(value: AnnouncementFormState['environment']) =>
                        handleAnnouncementFormChange('environment', value)
                      }
                    >
                      <SelectTrigger id="announcement-environment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="preview">Preview</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-kind">Kind</Label>
                    <Select
                      value={announcementForm.kind}
                      onValueChange={(value: AnnouncementFormState['kind']) =>
                        handleAnnouncementFormChange('kind', value)
                      }
                    >
                      <SelectTrigger id="announcement-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="release">Release</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-severity">Severity</Label>
                    <Select
                      value={announcementForm.severity}
                      onValueChange={(value: AnnouncementFormState['severity']) =>
                        handleAnnouncementFormChange('severity', value)
                      }
                    >
                      <SelectTrigger id="announcement-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="announcement-body">Body</Label>
                  <Textarea
                    id="announcement-body"
                    value={announcementForm.announcementBody}
                    onChange={(event) => handleAnnouncementFormChange('announcementBody', event.target.value)}
                    placeholder="Describe the update, maintenance note, or product message."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="announcement-starts-at">Starts At</Label>
                    <Input
                      id="announcement-starts-at"
                      type="datetime-local"
                      value={announcementForm.startsAt}
                      onChange={(event) => handleAnnouncementFormChange('startsAt', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-ends-at">Ends At</Label>
                    <Input
                      id="announcement-ends-at"
                      type="datetime-local"
                      value={announcementForm.endsAt}
                      onChange={(event) => handleAnnouncementFormChange('endsAt', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-min-version">Minimum App Version</Label>
                    <Input
                      id="announcement-min-version"
                      value={announcementForm.minAppVersion}
                      onChange={(event) => handleAnnouncementFormChange('minAppVersion', event.target.value)}
                      placeholder="2.0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-max-version">Maximum App Version</Label>
                    <Input
                      id="announcement-max-version"
                      value={announcementForm.maxAppVersion}
                      onChange={(event) => handleAnnouncementFormChange('maxAppVersion', event.target.value)}
                      placeholder="2.1.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-cta-label">CTA Label</Label>
                    <Input
                      id="announcement-cta-label"
                      value={announcementForm.ctaLabel}
                      onChange={(event) => handleAnnouncementFormChange('ctaLabel', event.target.value)}
                      placeholder="Read details"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-cta-url">CTA URL</Label>
                    <Input
                      id="announcement-cta-url"
                      value={announcementForm.ctaUrl}
                      onChange={(event) => handleAnnouncementFormChange('ctaUrl', event.target.value)}
                      placeholder="https://example.com/release-notes"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={announcementForm.isActive}
                    onChange={(event) => handleAnnouncementFormChange('isActive', event.target.checked)}
                  />
                  Active
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveAnnouncement()}
                    disabled={isSavingAnnouncement}
                  >
                    {isSavingAnnouncement
                      ? 'Saving…'
                      : selectedAnnouncementId
                        ? 'Update Announcement'
                        : 'Create Announcement'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAnnouncementEditor}
                    disabled={isSavingAnnouncement}
                  >
                    New Announcement
                  </Button>
                  {selectedAnnouncement ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteAnnouncementConfirmation(true)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Announcement List
                </CardTitle>
                <CardDescription>
                  Active and inactive announcements with seen and dismissed counts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {announcementsError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Announcement Error</AlertTitle>
                    <AlertDescription>{announcementsError}</AlertDescription>
                  </Alert>
                ) : isLoadingAnnouncements ? (
                  <p className="text-sm text-muted-foreground">Loading announcements…</p>
                ) : announcements.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No system announcements exist yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`rounded-lg border p-4 ${
                          selectedAnnouncementId === announcement.id
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">{announcement.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {announcement.kind} · {announcement.severity} · {announcement.environment} · {announcement.isActive ? 'active' : 'inactive'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAnnouncement(announcement)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleToggleAnnouncementActive(announcement)}
                              >
                                {announcement.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{announcement.body}</p>
                          <div className="text-sm text-muted-foreground">
                            <p>Seen: {announcement.seenCount}</p>
                            <p>Dismissed: {announcement.dismissedCount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Admin Audit Logs
              </CardTitle>
              <CardDescription>
                Persistent records of privileged admin actions, including role changes, password resets, and account deletions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogsError ? (
                <Alert variant="destructive">
                  <AlertTitle>Audit Log Error</AlertTitle>
                  <AlertDescription>{auditLogsError}</AlertDescription>
                </Alert>
              ) : isLoadingAuditLogs ? (
                <p className="text-sm text-muted-foreground">Loading audit logs…</p>
              ) : auditLogs.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No admin audit logs recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{getAuditLogActionLabel(log.action)}</p>
                          <p className="text-sm text-muted-foreground">
                            Actor: {log.actorEmail}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.action.startsWith('admin.announcement.')
                              ? `Announcement: ${log.targetUserEmail || 'None'}`
                              : `Target: ${log.targetUserEmail || 'None'}`}
                          </p>
                          {renderAuditLogDetails(log) ? (
                            <p className="text-sm text-muted-foreground">
                              Details: {renderAuditLogDetails(log)}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      </PageHeader>

      <AlertDialog
        open={showDeleteAnnouncementConfirmation}
        onOpenChange={setShowDeleteAnnouncementConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Announcement
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the selected system announcement permanently. Dismissed or seen state tied to this announcement will become orphaned history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAnnouncement();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Announcement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
