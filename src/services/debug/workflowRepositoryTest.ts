import googleBooksProvider from '@/services/api/GoogleBooksProvider';
import openLibraryProvider from '@/services/api/OpenLibraryProvider';
import type { BookSearchItem } from '@/types/api/BookApiProvider';
import type { Book } from '@/types/book';
import type { Series } from '@/types/series';

type ResultReporter = (step: string, success: boolean, message: string) => void;
type ProgressReporter = (value: number) => void;

type RunRepositoryWorkflowTestInput = {
  addResult: ResultReporter;
  setProgress: ProgressReporter;
};

type RepositorySet = {
  bookRepository: {
    create: (book: Book) => Promise<Book>;
    delete: (id: string) => Promise<void>;
    getAll: () => Promise<Book[]>;
    getById: (id: string) => Promise<Book | null>;
    update: (id: string, updates: Partial<Book>) => Promise<Book>;
  };
  collectionRepository: {
    delete: (id: string) => Promise<boolean>;
    getAll: () => Promise<Array<{ id: string }>>;
  };
  seriesRepository: {
    add: (series: Series) => Promise<Series>;
    delete: (id: string) => Promise<boolean>;
    getAll: () => Promise<Series[]>;
    getById: (id: string) => Promise<Series | null>;
    update: (id: string, updates: Partial<Series>) => Promise<Series | null>;
  };
};

type ProviderId = 'google' | 'openlib';

type WorkflowQueryPlan = {
  genre: string;
  query: string;
};

const WORKFLOW_TEST_PREFIX = 'workflow-test';
const BOOKS_PER_PROVIDER = 100;
const GOOGLE_SERIES_COUNT = 5;
const OPEN_LIBRARY_SERIES_COUNT = 4;
const SEARCH_BATCH_SIZE = 10;
const STATUS_CYCLE: Array<Book['status']> = [
  'reading',
  'completed',
  'want-to-read',
  'on-hold',
  'completed',
];

const GOOGLE_QUERY_PLANS: WorkflowQueryPlan[] = [
  { query: 'epic fantasy novels', genre: 'Fantasy' },
  { query: 'science fiction novels', genre: 'Science Fiction' },
  { query: 'historical fiction novels', genre: 'Historical Fiction' },
  { query: 'mystery novels', genre: 'Mystery' },
  { query: 'thriller novels', genre: 'Thriller' },
  { query: 'horror novels', genre: 'Horror' },
  { query: 'romance novels', genre: 'Romance' },
  { query: 'biography books', genre: 'Biography' },
  { query: 'classic literature', genre: 'Classics' },
  { query: 'young adult fantasy', genre: 'Young Adult' },
  { query: 'space opera books', genre: 'Space Opera' },
  { query: 'literary fiction books', genre: 'Literary Fiction' },
  { query: 'adventure novels', genre: 'Adventure' },
  { query: 'memoir books', genre: 'Memoir' },
  { query: 'crime fiction books', genre: 'Crime Fiction' },
];

const OPEN_LIBRARY_QUERY_PLANS: WorkflowQueryPlan[] = [
  { query: 'epic fantasy', genre: 'Fantasy' },
  { query: 'science fiction', genre: 'Science Fiction' },
  { query: 'historical fiction', genre: 'Historical Fiction' },
  { query: 'mystery', genre: 'Mystery' },
  { query: 'thriller', genre: 'Thriller' },
  { query: 'horror', genre: 'Horror' },
  { query: 'romance', genre: 'Romance' },
  { query: 'biography', genre: 'Biography' },
  { query: 'classic literature', genre: 'Classics' },
  { query: 'young adult fantasy', genre: 'Young Adult' },
  { query: 'space opera', genre: 'Space Opera' },
  { query: 'literary fiction', genre: 'Literary Fiction' },
  { query: 'adventure', genre: 'Adventure' },
  { query: 'memoir', genre: 'Memoir' },
  { query: 'crime fiction', genre: 'Crime Fiction' },
];

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const normalizeAuthor = (author: string | string[] | undefined): string => {
  if (Array.isArray(author)) {
    return author[0] || 'Unknown Author';
  }

  return author || 'Unknown Author';
};

const buildBookId = (provider: ProviderId, sourceId: string): string =>
  `${WORKFLOW_TEST_PREFIX}-book-${provider}-${slugify(sourceId)}`;

const buildSeriesId = (provider: ProviderId, index: number): string =>
  `${WORKFLOW_TEST_PREFIX}-series-${provider}-${index + 1}`;

const getProviderLabel = (provider: ProviderId): string =>
  provider === 'google' ? 'Google Books' : 'Open Library';

const completedDateForIndex = (index: number): string => {
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - (index + 1) * 7);
  return timestamp.toISOString();
};

const loadRepositories = async (): Promise<RepositorySet> => {
  const { bookRepository } = await import('@/repositories/BookRepository');
  const { seriesRepository } = await import('@/repositories/SeriesRepository');
  const { collectionRepository } = await import('@/repositories/CollectionRepository');

  return {
    bookRepository,
    seriesRepository,
    collectionRepository,
  };
};

const upsertBook = async (repositories: RepositorySet, book: Book): Promise<Book> => {
  const existingBook = await repositories.bookRepository.getById(book.id);

  return existingBook
    ? repositories.bookRepository.update(book.id, book)
    : repositories.bookRepository.create(book);
};

const upsertSeries = async (repositories: RepositorySet, series: Series): Promise<Series> => {
  const existingSeries = await repositories.seriesRepository.getById(series.id);

  return existingSeries
    ? ((await repositories.seriesRepository.update(series.id, series)) || series)
    : repositories.seriesRepository.add(series);
};

const cleanupWorkflowRecords = async (repositories: RepositorySet) => {
  const [books, series, collections] = await Promise.all([
    repositories.bookRepository.getAll(),
    repositories.seriesRepository.getAll(),
    repositories.collectionRepository.getAll(),
  ]);

  for (const collection of collections.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX))) {
    await repositories.collectionRepository.delete(collection.id);
  }

  for (const series of series.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX))) {
    await repositories.seriesRepository.delete(series.id);
  }

  for (const book of books.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX))) {
    await repositories.bookRepository.delete(book.id);
  }
};

const buildWorkflowBook = (
  item: BookSearchItem,
  provider: ProviderId,
  genre: string,
  index: number,
): Book => {
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length] || 'want-to-read';
  const sourceId = item.id;

  return {
    id: buildBookId(provider, sourceId),
    title: item.title || `Workflow ${getProviderLabel(provider)} Book ${index + 1}`,
    author: normalizeAuthor(item.author),
    genre: [genre],
    description: `Workflow-seeded from ${getProviderLabel(provider)} search results for Mongo repository testing.`,
    publishedDate: item.publishedDate,
    thumbnail: item.thumbnail,
    sourceId,
    sourceType: provider,
    googleBooksId: provider === 'google' ? sourceId : undefined,
    openLibraryId: provider === 'openlib' ? sourceId : undefined,
    status,
    rating: status === 'completed' ? ((index % 3) + 3) : undefined,
    completedDate: status === 'completed' ? completedDateForIndex(index) : undefined,
    progress: status === 'reading' ? 0.35 + ((index % 4) * 0.1) : undefined,
    spineColor: (index % 8) + 1,
    addedDate: new Date().toISOString(),
    collectionIds: [],
  };
};

const seedProviderBooks = async ({
  addResult,
  planSet,
  progressEnd,
  progressStart,
  provider,
  repositories,
  setProgress,
}: {
  addResult: ResultReporter;
  planSet: WorkflowQueryPlan[];
  progressEnd: number;
  progressStart: number;
  provider: ProviderId;
  repositories: RepositorySet;
  setProgress: ProgressReporter;
}): Promise<Book[]> => {
  const providerApi = provider === 'google' ? googleBooksProvider : openLibraryProvider;
  const providerLabel = getProviderLabel(provider);
  const books = new Map<string, Book>();

  for (const [planIndex, plan] of planSet.entries()) {
    if (books.size >= BOOKS_PER_PROVIDER) {
      break;
    }

    const searchResult = await providerApi.searchBooks({
      query: plan.query,
      type: 'all',
      limit: SEARCH_BATCH_SIZE,
      page: 1,
    });

    let insertedCount = 0;

    for (const item of searchResult.books) {
      const workflowBookId = buildBookId(provider, item.id);
      if (books.has(workflowBookId)) {
        continue;
      }

      const book = buildWorkflowBook(item, provider, plan.genre, books.size);
      const persistedBook = await upsertBook(repositories, book);
      books.set(persistedBook.id, persistedBook);
      insertedCount += 1;

      if (books.size >= BOOKS_PER_PROVIDER) {
        break;
      }
    }

    addResult(
      `${providerLabel} Query ${planIndex + 1}`,
      insertedCount > 0,
      insertedCount > 0
        ? `Saved ${insertedCount} books from "${plan.query}" (${books.size}/${BOOKS_PER_PROVIDER}).`
        : `No unique books were saved from "${plan.query}".`,
    );

    const queryProgress = (planIndex + 1) / planSet.length;
    setProgress(progressStart + queryProgress * (progressEnd - progressStart));
  }

  if (books.size < BOOKS_PER_PROVIDER) {
    throw new Error(
      `${providerLabel} only produced ${books.size} unique books. The workflow requires ${BOOKS_PER_PROVIDER}.`,
    );
  }

  return Array.from(books.values()).slice(0, BOOKS_PER_PROVIDER);
};

const splitIntoSeriesGroups = (
  books: Book[],
  provider: ProviderId,
  seriesCount: number,
): Array<{ books: Book[]; id: string; name: string }> => {
  const groups: Array<{ books: Book[]; id: string; name: string }> = [];
  const baseSize = Math.floor(books.length / seriesCount);
  const remainder = books.length % seriesCount;
  let cursor = 0;

  for (let index = 0; index < seriesCount; index += 1) {
    const nextSize = baseSize + (index < remainder ? 1 : 0);
    const groupBooks = books.slice(cursor, cursor + nextSize);
    cursor += nextSize;

    groups.push({
      id: buildSeriesId(provider, index),
      name: `Workflow ${getProviderLabel(provider)} Series ${index + 1}`,
      books: groupBooks,
    });
  }

  return groups;
};

const createWorkflowSeries = async ({
  addResult,
  googleBooks,
  openLibraryBooks,
  repositories,
  setProgress,
}: {
  addResult: ResultReporter;
  googleBooks: Book[];
  openLibraryBooks: Book[];
  repositories: RepositorySet;
  setProgress: ProgressReporter;
}) => {
  const seriesGroups = [
    ...splitIntoSeriesGroups(googleBooks, 'google', GOOGLE_SERIES_COUNT),
    ...splitIntoSeriesGroups(openLibraryBooks, 'openlib', OPEN_LIBRARY_SERIES_COUNT),
  ];

  for (const [groupIndex, group] of seriesGroups.entries()) {
    const uniqueGenres = Array.from(
      new Set(
        group.books.flatMap((book) =>
          Array.isArray(book.genre) ? book.genre : book.genre ? [book.genre] : [],
        ),
      ),
    );

    await upsertSeries(repositories, {
      id: group.id,
      name: group.name,
      author: 'Multiple Authors',
      description: `Workflow-generated series seeded from ${group.books.length} repository-backed books.`,
      books: group.books.map((book) => book.id),
      totalBooks: group.books.length,
      readingOrder: 'publication',
      status: 'ongoing',
      genre: uniqueGenres,
      isTracked: false,
      hasUpcoming: false,
      coverImage: group.books[0]?.thumbnail,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const [bookIndex, book] of group.books.entries()) {
      await repositories.bookRepository.update(book.id, {
        isPartOfSeries: true,
        seriesId: group.id,
        seriesPosition: bookIndex + 1,
        volumeNumber: bookIndex + 1,
        _legacySeriesName: group.name,
      });
    }

    addResult(
      `Series ${groupIndex + 1}`,
      true,
      `Saved "${group.name}" with ${group.books.length} books.`,
    );
    setProgress(90 + ((groupIndex + 1) / seriesGroups.length) * 9);
  }
};

const verifyWorkflowDataset = async (
  repositories: RepositorySet,
  addResult: ResultReporter,
) => {
  const [books, series] = await Promise.all([
    repositories.bookRepository.getAll(),
    repositories.seriesRepository.getAll(),
  ]);

  const workflowBookCount = books.filter((book) => book.id.startsWith(WORKFLOW_TEST_PREFIX)).length;
  const workflowSeriesCount = series.filter((item) => item.id.startsWith(WORKFLOW_TEST_PREFIX)).length;

  if (workflowBookCount !== BOOKS_PER_PROVIDER * 2) {
    throw new Error(`Verification failed: expected 200 workflow books, found ${workflowBookCount}.`);
  }

  if (workflowSeriesCount !== GOOGLE_SERIES_COUNT + OPEN_LIBRARY_SERIES_COUNT) {
    throw new Error(`Verification failed: expected 9 workflow series, found ${workflowSeriesCount}.`);
  }

  addResult(
    'Verification',
    true,
    `Verified ${workflowBookCount} Mongo-backed workflow books and ${workflowSeriesCount} workflow series for the current account.`,
  );
};

export const runRepositoryWorkflowTest = async ({
  addResult,
  setProgress,
}: RunRepositoryWorkflowTestInput) => {
  const repositories = await loadRepositories();

  addResult('Initialization', true, 'Clearing previous workflow-test records for the current account.');
  await cleanupWorkflowRecords(repositories);
  setProgress(5);

  const googleBooks = await seedProviderBooks({
    addResult,
    planSet: GOOGLE_QUERY_PLANS,
    progressEnd: 45,
    progressStart: 5,
    provider: 'google',
    repositories,
    setProgress,
  });

  const openLibraryBooks = await seedProviderBooks({
    addResult,
    planSet: OPEN_LIBRARY_QUERY_PLANS,
    progressEnd: 90,
    progressStart: 45,
    provider: 'openlib',
    repositories,
    setProgress,
  });

  await createWorkflowSeries({
    addResult,
    googleBooks,
    openLibraryBooks,
    repositories,
    setProgress,
  });

  await verifyWorkflowDataset(repositories, addResult);
  setProgress(100);
  addResult(
    'Complete',
    true,
    'Repository workflow seed completed: 200 books and 9 series were written for the current account.',
  );
};
