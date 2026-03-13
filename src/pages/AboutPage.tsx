import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen, Bug, Shield, Heart, ExternalLink, Sparkles } from 'lucide-react';

const TABS = ['changelog', 'known-issues', 'privacy', 'roadmap', 'about'] as const;
type TabValue = typeof TABS[number];

const AboutPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = (searchParams.get('tab') as TabValue) || 'changelog';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Back to Library button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Library
        </Button>

        <h1 className="text-3xl font-bold mb-2">About This App</h1>
        <p className="text-muted-foreground mb-8">
          Information, updates, and policies for your book collection manager.
        </p>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="changelog" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5 hidden sm:inline" />
              Changelog
            </TabsTrigger>
            <TabsTrigger value="known-issues" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Bug className="h-3.5 w-3.5 hidden sm:inline" />
              Known Issues
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5 hidden sm:inline" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 hidden sm:inline" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Heart className="h-3.5 w-3.5 hidden sm:inline" />
              About
            </TabsTrigger>
          </TabsList>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-elegant space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">v2.0.0</span>
                  <span className="text-sm text-muted-foreground">Latest</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Authenticated Library Release</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This release moves the app from a browser-only library manager to an authenticated app with MongoDB-backed storage and Vercel API functions.
                </p>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Completed</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Added account registration, login, logout, and authenticated session restore</li>
                      <li>Added protected Vercel API routes backed by MongoDB</li>
                      <li>Moved books, series, collections, upcoming releases, notifications, and user settings to per-user remote storage</li>
                      <li>Added ownership enforcement so one user cannot access another user&apos;s records</li>
                      <li>Added one-time legacy IndexedDB import with migration summary, retry flow, and duplicate protection</li>
                      <li>Added delete library, reset library, clear local cache, and delete account actions for authenticated users</li>
                      <li>Updated destructive-action confirmations to reflect actual account and storage scope</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Still To Be Completed</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Admin and troubleshooting audit for remote-versus-local assumptions</li>
                      <li>Import and export UX updates that clearly distinguish remote data, local cache, and legacy migration</li>
                      <li>Final cleanup of delete-library wording and operational boundaries</li>
                      <li>Expanded test coverage for auth, migration, and destructive actions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">v1.2.2</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Bug Fix — Book Editing</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li>Fixed an Out of Memory crash when saving edits to any book</li>
                  <li>Resolved infinite loop in search index rebuild during book updates</li>
                  <li>Improved data handling between UI and database layers</li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">v1.2.1</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">About This App</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li>Added About page with Changelog, Known Issues, Roadmap, Privacy, and About tabs</li>
                  <li>Footer navigation links on every page</li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">v1.2.0</span>
                </div>
                <h3 className="text-lg font-semibold mb-4">Full-Featured Library Manager</h3>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Library & Book Management</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Three view modes: bookshelf, list, and cover grid</li>
                      <li>Search and add books via Google Books API or Open Library API</li>
                      <li>Automatic fallback between API providers if one is unavailable</li>
                      <li>Manual book entry for books not found online</li>
                      <li>Edit book details including title, author, genre, page count, and description</li>
                      <li>Reading status tracking: To Read, Reading, and Completed</li>
                      <li>Star ratings and personal notes</li>
                      <li>Book cover images from API or custom uploads</li>
                      <li>Advanced search with fuzzy matching across all fields</li>
                      <li>Sort and filter books by status, genre, author, and more</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Series</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Dedicated Series page to organize books into series</li>
                      <li>Series auto-detection from Google Books and Open Library metadata</li>
                      <li>Manual series creation and book assignment</li>
                      <li>Series detail view with reading order tracking</li>
                      <li>Filter series by genre, author, and reading status</li>
                      <li>Grid and list views for series</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Collections</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Create custom collections to group books however you like</li>
                      <li>Assign books to multiple collections</li>
                      <li>Collection detail view with book list</li>
                      <li>Custom colors and descriptions for each collection</li>
                      <li>Collections are preserved when deleting your library</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Reading Insights</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Dedicated Insights page with reading statistics and visualizations</li>
                      <li>Reading goal tracker with monthly progress</li>
                      <li>Books completed over time</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Import & Export</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Import books from CSV files (supports YYYY-MM-DD and MM/DD/YYYY date formats)</li>
                      <li>Import books from JSON files with full metadata</li>
                      <li>Enhanced backup format preserving books, series, and collections</li>
                      <li>Restore from backup with automatic series and collection reconstruction</li>
                      <li>Import and export available from every page via Settings</li>
                      <li>Page auto-refreshes after import, restore, delete, or reset</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">API Providers</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Google Books API — search, metadata, and cover images</li>
                      <li>Open Library API — search, metadata, cover images, and series detection</li>
                      <li>Configurable default provider in Settings</li>
                      <li>Built-in rate limiting, retry logic, and response caching</li>
                      <li>Automatic provider fallback if the active provider is unavailable</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Personalization & Settings</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Dark and light theme support</li>
                      <li>Personalized library name with your preferred name</li>
                      <li>Configurable default view mode</li>
                      <li>Birthday celebration feature</li>
                      <li>Unified Settings modal accessible from all pages</li>
                      <li>Delete library (preserves collections) or full reset</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Data & Storage</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                      <li>Local-first IndexedDB storage with no server or account requirement</li>
                      <li>Database preloading for fast startup</li>
                      <li>Database repair utility for troubleshooting</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">v1.0.0</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Initial Release</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li>Core book library with shelf view</li>
                  <li>Google Books API integration</li>
                  <li>Basic reading status tracking</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Known Issues Tab */}
          <TabsContent value="known-issues" className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-elegant space-y-6">
              <p className="text-sm text-muted-foreground">
                We're actively working on improving the app. Here are some known issues:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-yellow-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">Large library performance</h4>
                  <p className="text-sm text-muted-foreground">
                    Libraries with 500+ books may experience slower load times on the shelf view. Try list or cover view for better performance.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">CSV import date formats</h4>
                  <p className="text-sm text-muted-foreground">
                    Some date formats in CSV files may not be parsed correctly. Use YYYY-MM-DD or MM/DD/YYYY for best results.
                    For the most reliable experience, <strong>JSON export and import is the recommended method</strong> as it preserves all metadata including dates, series, and collections.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">Series auto-detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Series detection from Google Books and Open Library may not always find the correct series or may miss some series entirely. You can always manually create series and assign books to them.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                Found a bug? Please report it via the project's GitHub Issues page.
              </p>
            </div>
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-elegant space-y-6">
              <p className="text-sm text-muted-foreground">
                Remaining v2 work and upcoming improvements:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">Admin and diagnostics cleanup</h4>
                  <p className="text-sm text-muted-foreground">
                    Separate remote account diagnostics from local cache diagnostics, and update admin/debug tools that still assume IndexedDB is the source of truth.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">Import and export clarity</h4>
                  <p className="text-sm text-muted-foreground">
                    Make export and import explicit about whether they operate on remote MongoDB data, local cache data, or legacy browser migration data.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">Testing and hardening</h4>
                  <p className="text-sm text-muted-foreground">
                    Add automated coverage for auth, ownership enforcement, migration, and destructive actions, then complete full manual QA for the authenticated app.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-1">
                  <h4 className="font-medium text-sm">Future product work</h4>
                  <p className="text-sm text-muted-foreground">
                    Continue improving series detection, release tracking, and other reading-management features once the v2 platform migration is fully stabilized.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                Have a feature request? Let us know via the project's GitHub Issues page.
              </p>
            </div>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-elegant space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Account-Based Storage</h3>
                <p className="text-sm text-muted-foreground">
                  This app now stores account and library data on a remote MongoDB database through Vercel-hosted API functions.
                  An account is required to use the authenticated app experience.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">What We Store</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>Account data</strong> — email address, password hash, timestamps, and optional preferred name</li>
                  <li><strong>Books</strong> — title, author, status, dates, ratings, notes, and cover images</li>
                  <li><strong>Series</strong> — series names, reading order, and book assignments</li>
                  <li><strong>Collections</strong> — collection names, descriptions, and book assignments</li>
                  <li><strong>Upcoming releases and notifications</strong> — tracked release data and in-app notification state</li>
                  <li><strong>Settings</strong> — your display preferences, reading goals, and migration status metadata</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Local Browser Storage</h3>
                <p className="text-sm text-muted-foreground">
                  The app may also use local browser storage such as IndexedDB or localStorage for legacy migration support,
                  short-lived cache behavior, and troubleshooting utilities on a specific device. Local browser storage is not the primary source of truth for authenticated accounts.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">External Services</h3>
                <p className="text-sm text-muted-foreground">
                  The app connects to two external APIs when you search for or add a book:
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside mt-2">
                  <li><strong>Google Books API</strong> — search, book metadata, and cover images</li>
                  <li><strong>Open Library API</strong> — search, book metadata, cover images, and series detection</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Search queries and book lookup requests may be sent to those providers when you use related features.
                  Your account password is not sent to those services. You can choose your preferred provider in Settings.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Data Portability</h3>
                <p className="text-sm text-muted-foreground">
                  You can export library data via Settings. Backup and export behavior is being updated as part of v2 so the app can more clearly distinguish remote account data, local browser cache data, and legacy migration data.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Deleting Your Data</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>Delete Library</strong> removes books while preserving series and collection structures</li>
                  <li><strong>Reset Library</strong> removes library records for the signed-in account</li>
                  <li><strong>Clear Local Cache</strong> removes browser-only data on the current device without changing remote account data</li>
                  <li><strong>Delete Account</strong> removes the user account and all associated remote data</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Deleted data cannot be recovered unless you have an export or backup.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-elegant space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">How It Started</h3>
                <p className="text-sm text-muted-foreground">
                  This app was born from a friend's dream. They described their perfect book tracking app to me:
                </p>
                <blockquote className="mt-3 border-l-4 border-primary/30 pl-4 py-2 text-sm text-muted-foreground italic space-y-2">
                  <p>
                    "I can type in a book or author and using an API, it will auto fill some basic info about it —
                    title, author, genre — and then have fields I can fill out like completed date, rating, short notes,
                    if it's a series, the next book in that series, and when it's expected."
                  </p>
                  <p>
                    "Once I add a book, I want it in a list I can filter and search by any of those things.
                    Which is why I was using Excel, because I can do that minus the API connection."
                  </p>
                  <p>
                    "I also want every time I add a book, it adds that book to a virtual bookshelf with randomized
                    colors that fit within a color scheme, so all you see is the spine with the title. And I could
                    scroll down and see a 'shelf' displaying all the books I've read."
                  </p>
                </blockquote>
                <p className="text-sm text-muted-foreground mt-3">
                  So that&apos;s exactly what we built. The app started as a local-only bookshelf and is now evolving into an authenticated reading tracker with account-backed storage and migration support.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">About the Creator</h3>
                <p className="text-sm text-muted-foreground">
                  I'm a software developer who loves to take the dreams of friends and make them real.
                  This is a hobby project, hobby hosted from my own pocket, built with care for a friend who loves reading and shared with others who also love to read.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Built With</h3>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Tailwind CSS', 'Radix UI', 'Vite', 'Vercel Functions', 'MongoDB', 'IndexedDB'].map((tech) => (
                    <span
                      key={tech}
                      className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Support section - uncomment when ready
              <div>
                <h3 className="text-lg font-semibold mb-2">Support</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  There is absolutely no need to donate. This app is free and always will be.
                  But if you like what you see and want to help keep this app up and running — and you have
                  the disposable income to do so — a small contribution goes a long way.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://ko-fi.com/lamia3" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Ko-fi
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://github.com/LaMia-3/book-collection-app" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      GitHub
                    </a>
                  </Button>
                </div>
              </div>
              */}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                <p>Made with ❤️ because a friend had a dream, and I had the code.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AboutPage;
