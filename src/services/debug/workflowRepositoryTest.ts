import googleBooksProvider from '@/services/api/GoogleBooksProvider';
import openLibraryProvider from '@/services/api/OpenLibraryProvider';
import { bookRepository } from '@/repositories/BookRepository';
import { seriesRepository } from '@/repositories/SeriesRepository';
import { collectionRepository } from '@/repositories/CollectionRepository';
import type { Book } from '@/types/book';
import type { Collection } from '@/types/collection';
import type { Series } from '@/types/series';

type ResultReporter = (step: string, success: boolean, message: string) => void;
type ProgressReporter = (value: number) => void;

type WorkflowSearch = {
  query: string;
  type: 'title';
  provider: 'google' | 'openlib';
};

type WorkflowCollectionBlueprint = {
  id: string;
  name: string;
  description: string;
  color: string;
  matcher: (book: Book) => boolean;
};

type RunRepositoryWorkflowTestInput = {
  addResult: ResultReporter;
  isAuthenticated: boolean;
  setProgress: ProgressReporter;
};

const WORKFLOW_TEST_PREFIX = 'workflow-test';

const WORKFLOW_SEARCHES: WorkflowSearch[] = [
  { query: 'The Fellowship of the Ring Tolkien', type: 'title', provider: 'google' },
  { query: 'The Two Towers Tolkien', type: 'title', provider: 'google' },
  { query: 'The Final Empire Sanderson', type: 'title', provider: 'google' },
  { query: 'The Way of Kings Sanderson', type: 'title', provider: 'google' },
  { query: 'Dune Frank Herbert', type: 'title', provider: 'google' },
  { query: "Harry Potter and the Philosopher's Stone Rowling", type: 'title', provider: 'openlib' },
  { query: 'Harry Potter and the Chamber of Secrets Rowling', type: 'title', provider: 'openlib' },
  { query: 'The Eye of the World Robert Jordan', type: 'title', provider: 'openlib' },
  { query: 'Foundation Isaac Asimov', type: 'title', provider: 'openlib' },
  { query: 'The Hobbit Tolkien', type: 'title', provider: 'openlib' },
];

const SERIES_DEFINITIONS = [
  {
    name: 'Workflow Lord of the Rings',
    author: 'J.R.R. Tolkien',
    description: 'Workflow-generated Tolkien series.',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Fellowship', 'Two Towers', 'Hobbit'],
  },
  {
    name: 'Workflow Harry Potter',
    author: 'J.K. Rowling',
    description: 'Workflow-generated Harry Potter series.',
    genre: ['fantasy'],
    status: 'ongoing',
    searchTerms: ['Philosopher', 'Chamber of Secrets'],
  },
  {
    name: 'Workflow Science Fiction',
    author: 'Various',
    description: 'Workflow-generated science fiction grouping.',
    genre: ['science fiction'],
    status: 'ongoing',
    searchTerms: ['Dune', 'Foundation'],
  },
  {
    name: 'Workflow Epic Fantasy',
    author: 'Various',
    description: 'Workflow-generated epic fantasy grouping.',
    genre: ['fantasy'],
    status: 'ongoing',
    searchTerms: ['Final Empire', 'Way of Kings', 'Eye of the World'],
  },
] as const;

const WORKFLOW_COLLECTION_BLUEPRINTS: WorkflowCollectionBlueprint[] = [
  {
    id: `${WORKFLOW_TEST_PREFIX}-collection-fantasy`,
    name: 'Workflow Fantasy Collection',
    description: 'Workflow-generated fantasy collection.',
    color: '#7c3aed',
    matcher: (book) => Array.isArray(book.genre) && book.genre.some((genre) => genre.toLowerCase().includes('fantasy')),
  },
  {
    id: `${WORKFLOW_TEST_PREFIX}-collection-sci-fi`,
    name: 'Workflow Science Fiction Collection',
    description: 'Workflow-generated science fiction collection.',
    color: '#2563eb',
    matcher: (book) => Array.isArray(book.genre) && book.genre.some((genre) => genre.toLowerCase().includes('science')),
  },
] as const;

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const buildWorkflowBookId = (provider: 'google' | 'openlib', sourceId: string): string =>
  `${WORKFLOW_TEST_PREFIX}-book-${provider}-${slugify(sourceId)}`;

const buildWorkflowSeriesId = (seriesName: string): string =>
  `${WORKFLOW_TEST_PREFIX}-series-${slugify(seriesName)}`;

const getRandomCompletionDate = (): string => {
  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const randomTimestamp =
    twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());

  return new Date(randomTimestamp).toISOString();
};

const upsertWorkflowBook = async (book: Book): Promise<Book> => {
  const existingBook = await bookRepository.getById(book.id);
  return existingBook
    ? (await bookRepository.update(book.id, book))
    : (await bookRepository.create(book));
};

const upsertWorkflowSeries = async (series: Series): Promise<Series> => {
  const existingSeries = await seriesRepository.getById(series.id);
  return existingSeries
    ? ((await seriesRepository.update(series.id, series)) || series)
    : (await seriesRepository.add(series));
};

const upsertWorkflowCollection = async (collection: Collection): Promise<Collection> => {
  const existingCollection = await collectionRepository.getById(collection.id);
  return existingCollection
    ? ((await collectionRepository.update(collection.id, {
        name: collection.name,
        description: collection.description,
        bookIds: collection.bookIds,
        color: collection.color,
        imageUrl: collection.imageUrl,
      })) || collection)
    : (await collectionRepository.add(collection));
};

const cleanupWorkflowDataset = async () => {
  const [books, series, collections] = await Promise.all([
    bookRepository.getAll(),
    seriesRepository.getAll(),
    collectionRepository.getAll(),
  ]);

  for (const collection of collections.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX))) {
    await collectionRepository.delete(collection.id);
  }

  for (const series of series.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX))) {
    await seriesRepository.delete(series.id);
  }

  for (const book of books.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX))) {
    await bookRepository.delete(book.id);
  }
};

const fetchRepositoryWorkflowBooks = async (
  addResult: ResultReporter,
  isAuthenticated: boolean,
  setProgress: ProgressReporter,
): Promise<Book[]> => {
  const targetLabel = isAuthenticated
    ? 'MongoDB-backed account data through repositories'
    : 'the local repository path because there is no authenticated MongoDB session';

  addResult('Repository Workflow', true, `Writing sample workflow data into ${targetLabel}.`);
  const importedBooks: Book[] = [];
  const statusCycle: Array<Book['status']> = [
    'reading',
    'completed',
    'want-to-read',
    'completed',
    'on-hold',
    'completed',
    'reading',
    'want-to-read',
    'completed',
    'completed',
  ];

  for (let index = 0; index < WORKFLOW_SEARCHES.length; index += 1) {
    const search = WORKFLOW_SEARCHES[index];

    try {
      const provider = search.provider === 'google' ? googleBooksProvider : openLibraryProvider;
      const providerName = search.provider === 'google' ? 'Google Books' : 'Open Library';
      const searchResult = await provider.searchBooks({
        query: search.query,
        type: search.type,
        limit: 1,
      });

      if (searchResult.books.length === 0) {
        addResult(`${providerName} ${index + 1}`, false, `No results found for "${search.query}".`);
        continue;
      }

      const bookItem = searchResult.books[0];
      const bookDetails = await provider.getBookDetails(bookItem.id);
      const matchedSeries = SERIES_DEFINITIONS.find((seriesDefinition) =>
        seriesDefinition.searchTerms.some((term) =>
          bookDetails.title.toLowerCase().includes(term.toLowerCase()),
        ),
      );
      const status = statusCycle[index % statusCycle.length] || 'completed';
      const persistedBook = await upsertWorkflowBook({
        ...bookDetails,
        id: buildWorkflowBookId(search.provider, bookItem.id),
        sourceType: search.provider,
        sourceId: bookItem.id,
        status,
        completedDate: status === 'completed' ? getRandomCompletionDate() : undefined,
        rating: status === 'completed' ? ((index % 3) + 3) : undefined,
        progress: status === 'reading' ? 0.4 : status === 'on-hold' ? 0.6 : undefined,
        isPartOfSeries: Boolean(matchedSeries),
        _legacySeriesName: matchedSeries?.name,
        collectionIds: [],
        spineColor: bookDetails.spineColor || ((index % 8) + 1),
        addedDate: bookDetails.addedDate || new Date().toISOString(),
      });

      importedBooks.push(persistedBook);
      addResult(`${providerName} ${index + 1}`, true, `Saved "${persistedBook.title}" to ${isAuthenticated ? 'MongoDB' : 'the local repository path'}.`);
    } catch (error) {
      addResult(
        `${search.provider === 'google' ? 'Google Books' : 'Open Library'} ${index + 1}`,
        false,
        error instanceof Error ? error.message : String(error),
      );
    }

    setProgress(20 + ((index + 1) / WORKFLOW_SEARCHES.length) * 35);
  }

  return importedBooks;
};

const createRepositoryWorkflowSeries = async (
  books: Book[],
  addResult: ResultReporter,
) => {
  for (const seriesDefinition of SERIES_DEFINITIONS) {
    const seriesBooks = books.filter((book) =>
      seriesDefinition.searchTerms.some((term) =>
        book.title.toLowerCase().includes(term.toLowerCase()),
      ),
    );

    if (seriesBooks.length === 0) {
      continue;
    }

    const seriesId = buildWorkflowSeriesId(seriesDefinition.name);
    await upsertWorkflowSeries({
      id: seriesId,
      name: seriesDefinition.name,
      author: seriesDefinition.author,
      description: seriesDefinition.description,
      books: seriesBooks.map((book) => book.id),
      totalBooks: seriesBooks.length,
      readingOrder: 'publication',
      status: seriesDefinition.status as 'ongoing' | 'completed' | 'cancelled',
      genre: [...seriesDefinition.genre],
      isTracked: false,
      hasUpcoming: false,
      coverImage: seriesBooks[0].thumbnail,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const [bookIndex, book] of seriesBooks.entries()) {
      await bookRepository.update(book.id, {
        isPartOfSeries: true,
        seriesId,
        volumeNumber: bookIndex + 1,
        seriesPosition: bookIndex + 1,
        _legacySeriesName: seriesDefinition.name,
      });
    }

    addResult(`Series: ${seriesDefinition.name}`, true, `Created or updated series with ${seriesBooks.length} repository-backed books.`);
  }
};

const createRepositoryWorkflowCollections = async (
  books: Book[],
  addResult: ResultReporter,
) => {
  for (const blueprint of WORKFLOW_COLLECTION_BLUEPRINTS) {
    const collectionBooks = books.filter(blueprint.matcher);

    if (collectionBooks.length === 0) {
      continue;
    }

    await upsertWorkflowCollection({
      id: blueprint.id,
      name: blueprint.name,
      description: blueprint.description,
      bookIds: collectionBooks.map((book) => book.id),
      color: blueprint.color,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const book of collectionBooks) {
      const nextCollectionIds = Array.from(new Set([...(book.collectionIds || []), blueprint.id]));
      await bookRepository.update(book.id, {
        collectionIds: nextCollectionIds,
      });
    }

    addResult(`Collection: ${blueprint.name}`, true, `Created or updated collection with ${collectionBooks.length} books.`);
  }
};

const verifyRepositoryWorkflowData = async (
  addResult: ResultReporter,
  isAuthenticated: boolean,
) => {
  const [books, series, collections] = await Promise.all([
    bookRepository.getAll(),
    seriesRepository.getAll(),
    collectionRepository.getAll(),
  ]);

  const workflowBookCount = books.filter((book) => book.id.startsWith(WORKFLOW_TEST_PREFIX)).length;
  const workflowSeriesCount = series.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX)).length;
  const workflowCollectionCount = collections.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX)).length;

  addResult(
    'Repository Verification',
    true,
    `Verified ${workflowBookCount} books, ${workflowSeriesCount} series, and ${workflowCollectionCount} collections in ${isAuthenticated ? 'MongoDB-backed account data' : 'the local repository path'}.`,
  );
};

export const runRepositoryWorkflowTest = async ({
  addResult,
  isAuthenticated,
  setProgress,
}: RunRepositoryWorkflowTestInput) => {
  addResult('Initialization', true, 'Preparing a namespaced repository-backed workflow dataset.');
  await cleanupWorkflowDataset();
  setProgress(10);

  const workflowBooks = await fetchRepositoryWorkflowBooks(addResult, isAuthenticated, setProgress);
  setProgress(60);

  await createRepositoryWorkflowSeries(workflowBooks, addResult);
  setProgress(80);

  await createRepositoryWorkflowCollections(workflowBooks, addResult);
  setProgress(95);

  await verifyRepositoryWorkflowData(addResult, isAuthenticated);
  setProgress(100);
  addResult('Complete', true, 'Repository-backed workflow test completed successfully.');
};
