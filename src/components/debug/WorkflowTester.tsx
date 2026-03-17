import React, { useState } from 'react';
import { createLogger } from '@/utils/loggingUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import type { Book } from '@/types/book';
import { useAuth } from '@/hooks/useAuth';
import { CollectionTestUI } from './CollectionTestUI';

type TestResult = {
  step: string;
  success: boolean;
  message: string;
};

const LEGACY_SEED_PREFIX = 'legacy-migration-seed';

const LEGACY_SEED_BOOKS = [
  {
    title: 'The Fellowship of the Ring',
    author: 'J.R.R. Tolkien',
    genre: ['fantasy'],
    status: 'completed',
    rating: 5,
  },
  {
    title: 'The Two Towers',
    author: 'J.R.R. Tolkien',
    genre: ['fantasy'],
    status: 'completed',
    rating: 5,
  },
  {
    title: 'The Return of the King',
    author: 'J.R.R. Tolkien',
    genre: ['fantasy'],
    status: 'want-to-read',
    rating: undefined,
  },
  {
    title: 'The Final Empire',
    author: 'Brandon Sanderson',
    genre: ['fantasy'],
    status: 'completed',
    rating: 5,
  },
  {
    title: 'The Well of Ascension',
    author: 'Brandon Sanderson',
    genre: ['fantasy'],
    status: 'reading',
    rating: undefined,
  },
  {
    title: 'The Hero of Ages',
    author: 'Brandon Sanderson',
    genre: ['fantasy'],
    status: 'want-to-read',
    rating: undefined,
  },
  {
    title: 'Dune',
    author: 'Frank Herbert',
    genre: ['science fiction'],
    status: 'completed',
    rating: 4,
  },
  {
    title: 'Dune Messiah',
    author: 'Frank Herbert',
    genre: ['science fiction'],
    status: 'reading',
    rating: undefined,
  },
  {
    title: 'Foundation',
    author: 'Isaac Asimov',
    genre: ['science fiction'],
    status: 'completed',
    rating: 4,
  },
  {
    title: 'Foundation and Empire',
    author: 'Isaac Asimov',
    genre: ['science fiction'],
    status: 'want-to-read',
    rating: undefined,
  },
] as const;

const LEGACY_SEED_SERIES = [
  {
    id: `${LEGACY_SEED_PREFIX}-series-lotr`,
    name: 'Legacy Seed Lord of the Rings',
    author: 'J.R.R. Tolkien',
    description: 'Legacy browser-only fantasy series.',
    genre: ['fantasy'],
    bookIndexes: [0, 1, 2],
  },
  {
    id: `${LEGACY_SEED_PREFIX}-series-mistborn`,
    name: 'Legacy Seed Mistborn',
    author: 'Brandon Sanderson',
    description: 'Legacy browser-only fantasy trilogy.',
    genre: ['fantasy'],
    bookIndexes: [3, 4, 5],
  },
  {
    id: `${LEGACY_SEED_PREFIX}-series-sci-fi`,
    name: 'Legacy Seed Science Fiction',
    author: 'Various',
    description: 'Legacy browser-only science fiction grouping.',
    genre: ['science fiction'],
    bookIndexes: [6, 7, 8, 9],
  },
] as const;

const LEGACY_SEED_COLLECTIONS = [
  {
    id: `${LEGACY_SEED_PREFIX}-collection-favorites`,
    name: 'Legacy Seed Favorites',
    description: 'Legacy browser collection for migration coverage.',
    color: '#ea580c',
    bookIndexes: [0, 3, 6, 8],
  },
  {
    id: `${LEGACY_SEED_PREFIX}-collection-tbr`,
    name: 'Legacy Seed TBR',
    description: 'Legacy browser collection of unread or in-progress books.',
    color: '#0891b2',
    bookIndexes: [2, 4, 5, 7, 9],
  },
] as const;

export function WorkflowTester() {
  const { isAuthenticated, user } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const log = createLogger('WorkflowTester');

  const addResult = (step: string, success: boolean, message: string) => {
    setResults((prev) => [...prev, { step, success, message }]);
  };

  const cleanupLegacySeedDataset = async () => {
    await enhancedStorageService.initialize();

    const [books, series, collections] = await Promise.all([
      enhancedStorageService.getBooks(),
      enhancedStorageService.getSeries(),
      enhancedStorageService.getCollections(),
    ]);

    for (const collection of collections.filter((item) => item.id.startsWith(LEGACY_SEED_PREFIX))) {
      await enhancedStorageService.deleteCollection(collection.id);
    }

    for (const seriesItem of series.filter((item) => item.id.startsWith(LEGACY_SEED_PREFIX))) {
      await enhancedStorageService.deleteSeries(seriesItem.id);
    }

    for (const book of books.filter((item) => item.id.startsWith(LEGACY_SEED_PREFIX))) {
      await enhancedStorageService.deleteBook(book.id);
    }
  };

  const buildLegacySeedBooks = (): Book[] => {
    return LEGACY_SEED_BOOKS.map((template, index) => {
      const seriesDefinition = LEGACY_SEED_SERIES.find((seriesItem) =>
        seriesItem.bookIndexes.includes(index),
      );
      const collectionIds = LEGACY_SEED_COLLECTIONS
        .filter((collectionItem) => collectionItem.bookIndexes.includes(index))
        .map((collectionItem) => collectionItem.id);

      return {
        id: `${LEGACY_SEED_PREFIX}-book-${index + 1}`,
        title: template.title,
        author: template.author,
        genre: [...template.genre],
        description: `${template.title} was generated directly in IndexedDB for migration testing.`,
        status: template.status,
        rating: template.rating,
        progress: template.status === 'reading' ? 0.45 : undefined,
        isPartOfSeries: Boolean(seriesDefinition),
        seriesId: seriesDefinition?.id,
        seriesPosition: seriesDefinition
          ? seriesDefinition.bookIndexes.indexOf(index) + 1
          : undefined,
        volumeNumber: seriesDefinition
          ? seriesDefinition.bookIndexes.indexOf(index) + 1
          : undefined,
        _legacySeriesName: seriesDefinition?.name,
        collectionIds,
        spineColor: (index % 8) + 1,
        addedDate: new Date(Date.now() - index * 86400000).toISOString(),
      };
    });
  };

  const runLegacyIndexedDbSeedTest = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    try {
      addResult('Legacy Seed', true, 'Writing a migration-only dataset directly into IndexedDB.');
      await cleanupLegacySeedDataset();
      await enhancedStorageService.initialize();
      setProgress(10);

      const seededBooks = buildLegacySeedBooks();
      for (const [index, book] of seededBooks.entries()) {
        await enhancedStorageService.saveBook(book);
        addResult(`Legacy Book ${index + 1}`, true, `Seeded "${book.title}" into IndexedDB.`);
        setProgress(10 + ((index + 1) / seededBooks.length) * 45);
      }

      for (const seriesDefinition of LEGACY_SEED_SERIES) {
        const seriesBooks = seededBooks.filter((_, index) => seriesDefinition.bookIndexes.includes(index));
        await enhancedStorageService.saveSeries({
          id: seriesDefinition.id,
          name: seriesDefinition.name,
          author: seriesDefinition.author,
          description: seriesDefinition.description,
          books: seriesBooks.map((book) => book.id),
          totalBooks: seriesBooks.length,
          readingOrder: 'publication',
          status: 'ongoing',
          genre: [...seriesDefinition.genre],
          isTracked: false,
          hasUpcoming: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          dateAdded: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        });
        addResult(`Legacy Series: ${seriesDefinition.name}`, true, `Seeded local series with ${seriesBooks.length} books.`);
      }

      setProgress(70);

      for (const collectionDefinition of LEGACY_SEED_COLLECTIONS) {
        const collectionBooks = seededBooks.filter((_, index) => collectionDefinition.bookIndexes.includes(index));
        await enhancedStorageService.saveCollection({
          id: collectionDefinition.id,
          name: collectionDefinition.name,
          description: collectionDefinition.description,
          bookIds: collectionBooks.map((book) => book.id),
          color: collectionDefinition.color,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        addResult(`Legacy Collection: ${collectionDefinition.name}`, true, `Seeded local collection with ${collectionBooks.length} books.`);
      }

      setProgress(90);

      const [storedBooks, storedSeries, storedCollections] = await Promise.all([
        enhancedStorageService.getBooks(),
        enhancedStorageService.getSeries(),
        enhancedStorageService.getCollections(),
      ]);
      const legacyBooksCount = storedBooks.filter((book) => book.id.startsWith(LEGACY_SEED_PREFIX)).length;
      const legacySeriesCount = storedSeries.filter((seriesItem) => seriesItem.id.startsWith(LEGACY_SEED_PREFIX)).length;
      const legacyCollectionsCount = storedCollections.filter((collectionItem) => collectionItem.id.startsWith(LEGACY_SEED_PREFIX)).length;

      addResult(
        'Legacy Verification',
        true,
        `Verified ${legacyBooksCount} IndexedDB books, ${legacySeriesCount} IndexedDB series, and ${legacyCollectionsCount} IndexedDB collections for migration testing.`,
      );
      setProgress(100);
      addResult('Complete', true, 'Legacy migration seed completed successfully.');
    } catch (error) {
      addResult('Error', false, `Legacy seed failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  };

  const runWorkflowTest = async () => {
    if (!isAuthenticated) {
      setResults([
        {
          step: 'Authentication Required',
          success: false,
          message: 'The repository workflow seed is disabled until you are signed in. This test now targets MongoDB-backed account data only.',
        },
      ]);
      setProgress(0);
      return;
    }

    setRunning(true);
    setResults([]);
    setProgress(0);

    try {
      const { runRepositoryWorkflowTest } = await import('@/services/debug/workflowRepositoryTest');

      await runRepositoryWorkflowTest({
        addResult,
        setProgress,
      });
    } catch (error) {
      console.error('Workflow test failed:', error);
      log.error('Workflow test failed:', error);
      addResult('Error', false, `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Workflow Tester</h1>
      <p className="mb-4 text-muted-foreground">
        Test various workflows and generate test data for the application.
      </p>

      <Tabs defaultValue="workflow" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="workflow">Repository Workflow</TabsTrigger>
          <TabsTrigger value="legacy-seed">Legacy Migration Seed</TabsTrigger>
          <TabsTrigger value="collections">
            <span className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Collections
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Writes a Mongo-backed workflow dataset for the currently logged-in account only.
            </p>
            <p className="text-sm text-muted-foreground">
              This workflow clears prior `workflow-test-*` records, then adds 200 books total: 100 from Google Books search results, 100 from Open Library search results, plus 9 generated series built from those books.
            </p>
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>Repository Target</AlertTitle>
              <AlertDescription>
                {isAuthenticated
                  ? `Authenticated session detected for ${user?.email || 'the current account'}. This seed will write to that user's MongoDB-backed library.`
                  : 'No authenticated session detected. This workflow is disabled because it no longer falls back to local storage.'}
              </AlertDescription>
            </Alert>

            <Button
              onClick={runWorkflowTest}
              disabled={running || !isAuthenticated}
              className="mb-4"
            >
              {running ? 'Running...' : 'Seed 200 Mongo Books and 9 Series'}
            </Button>

            {running && (
              <div className="mb-4">
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-center">{progress.toFixed(0)}% complete</p>
              </div>
            )}

            {results.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                        <div className="flex items-start gap-2">
                          {result.success ? <Check className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5" />}
                          <div>
                            <AlertTitle className="flex items-center gap-2">
                              {result.step}
                              {result.success ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>
                              )}
                            </AlertTitle>
                            <AlertDescription>{result.message}</AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="legacy-seed">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Writes 10 books plus related series and collections directly into browser IndexedDB for migration testing.
            </p>
            <p className="text-sm text-muted-foreground">
              This path is intentionally local-only. It does not write to MongoDB and is meant to seed legacy browser data that can later be imported.
            </p>

            <Button
              onClick={runLegacyIndexedDbSeedTest}
              disabled={running}
              className="mb-4"
              variant="outline"
            >
              {running ? 'Running...' : 'Seed 10 IndexedDB Records for Migration'}
            </Button>

            {running && (
              <div className="mb-4">
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-center">{progress.toFixed(0)}% complete</p>
              </div>
            )}

            {results.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Legacy Seed Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                        <div className="flex items-start gap-2">
                          {result.success ? <Check className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5" />}
                          <div>
                            <AlertTitle className="flex items-center gap-2">
                              {result.step}
                              {result.success ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>
                              )}
                            </AlertTitle>
                            <AlertDescription>{result.message}</AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Generate test collections with books for testing the collections feature.
            </p>

            <CollectionTestUI
              onComplete={(collections) => {
                console.log('Collections generated:', collections);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WorkflowTester;
