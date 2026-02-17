import React from 'react';
import { downloadFile } from '@/utils/exportUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface ImportFormatHelpProps {
  trigger?: React.ReactNode;
}

export const ImportFormatHelp: React.FC<ImportFormatHelpProps> = ({ trigger }) => {
  // Example CSV content
  const csvExampleContent = `title,author,isbn,status,completedDate,rating,notes,genre,isPartOfSeries,seriesId,seriesName,volumeNumber,pageCount,publishedDate,addedDate,collectionNames
"The Great Gatsby","F. Scott Fitzgerald","aBcDeFgHiJkL","completed","2025-01-15",4,"A classic tale of wealth and obsession","Fiction","false","","","",180,"1925","2026-02-17",""
"Dune","Frank Herbert","mNoPqRsTuVwX","reading","","","Epic sci-fi adventure","Science Fiction","true","series-123","Dune Chronicles",1,412,"1965","2026-02-17","Science Fiction;Favorites"
"Project Hail Mary","Andy Weir","yZaBcDeFgHiJ","want to read","","","","Science Fiction","false","","","",496,"2021","2026-02-17","Science Fiction"`;

  // Example simple JSON content
  const simpleJsonExampleContent = JSON.stringify([
    {
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn": "aBcDeFgHiJkL",
      "status": "completed",
      "completedDate": "2025-01-15T00:00:00.000Z",
      "rating": 4,
      "notes": "A classic tale of wealth and obsession",
      "genre": ["Fiction"],
      "isPartOfSeries": false,
      "pageCount": 180,
      "publishedDate": "1925",
      "addedDate": "2026-02-17T00:00:00.000Z"
    },
    {
      "title": "Dune",
      "author": "Frank Herbert",
      "isbn": "mNoPqRsTuVwX",
      "status": "reading",
      "notes": "Epic sci-fi adventure",
      "genre": ["Science Fiction"],
      "isPartOfSeries": true,
      "seriesId": "series-123",
      "seriesName": "Dune Chronicles",
      "volumeNumber": 1,
      "pageCount": 412,
      "publishedDate": "1965",
      "addedDate": "2026-02-17T00:00:00.000Z",
      "collectionNames": ["Science Fiction", "Favorites"]
    },
    {
      "title": "Project Hail Mary",
      "author": "Andy Weir",
      "isbn": "yZaBcDeFgHiJ",
      "status": "want to read",
      "genre": ["Science Fiction"],
      "isPartOfSeries": false,
      "pageCount": 496,
      "publishedDate": "2021",
      "addedDate": "2026-02-17T00:00:00.000Z",
      "collectionNames": ["Science Fiction"]
    }
  ], null, 2);

  // Example enhanced JSON content
  const enhancedJsonExampleContent = JSON.stringify({
    "version": "1.1.0",
    "timestamp": new Date().toISOString(),
    "books": [
      {
        "id": "b1",
        "title": "Dune",
        "author": "Frank Herbert",
        "isbn": "mNoPqRsTuVwX",
        "status": "reading",
        "notes": "Epic sci-fi adventure",
        "genre": ["Science Fiction"],
        "isPartOfSeries": true,
        "seriesId": "s1",
        "volumeNumber": 1,
        "pageCount": 412,
        "publishedDate": "1965",
        "addedDate": "2026-02-17T00:00:00.000Z",
        "spineColor": 3,
        "collectionIds": ["c1", "c2"]
      },
      {
        "id": "b2",
        "title": "Dune Messiah",
        "author": "Frank Herbert",
        "isbn": "xYzAbCdEfGhI",
        "status": "want-to-read",
        "genre": ["Science Fiction"],
        "isPartOfSeries": true,
        "seriesId": "s1",
        "volumeNumber": 2,
        "pageCount": 331,
        "publishedDate": "1969",
        "addedDate": "2026-02-17T00:00:00.000Z",
        "spineColor": 5,
        "collectionIds": ["c1"]
      }
    ],
    "series": [
      {
        "id": "s1",
        "name": "Dune Chronicles",
        "author": "Frank Herbert",
        "books": ["b1", "b2"],
        "totalBooks": 6,
        "readingOrder": "publication",
        "status": "ongoing",
        "genre": ["Science Fiction"],
        "isTracked": true,
        "hasUpcoming": false,
        "description": "Epic science fiction series set in the distant future"
      }
    ],
    "collections": [
      {
        "id": "c1",
        "name": "Science Fiction",
        "bookIds": ["b1", "b2"],
        "color": "#3b82f6",
        "imageUrl": null,
        "description": "Science fiction books"
      },
      {
        "id": "c2",
        "name": "Favorites",
        "bookIds": ["b1"],
        "color": "#f59e0b",
        "imageUrl": null,
        "description": "My favorite books"
      }
    ]
  }, null, 2);

  // Download handlers
  const handleDownloadCsvExample = () => {
    downloadFile(csvExampleContent, 'book-collection-example.csv', 'text/csv;charset=utf-8');
  };

  const handleDownloadSimpleJsonExample = () => {
    downloadFile(simpleJsonExampleContent, 'book-collection-simple-example.json', 'application/json');
  };

  const handleDownloadEnhancedJsonExample = () => {
    downloadFile(enhancedJsonExampleContent, 'book-collection-enhanced-example.json', 'application/json');
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <HelpCircle className="h-4 w-4" />
            Format Help
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import File Format Guide</DialogTitle>
          <DialogDescription>
            Learn how to format your CSV and JSON files for importing books, series, and collections
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <p className="mb-4 text-muted-foreground">
            At minimum, your import file should contain book titles and either author names or ISBN numbers, 
            along with reading status ("want to read", "reading", or "completed").
            We'll automatically fetch additional details from book APIs based on this information.
          </p>

          <Tabs defaultValue="csv" className="mt-4">
            <TabsList>
              <TabsTrigger value="csv">CSV Format</TabsTrigger>
              <TabsTrigger value="json">JSON Format</TabsTrigger>
              <TabsTrigger value="examples">Example Files</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">CSV Structure</h3>
                <p className="mb-4">
                  Your CSV file should have a header row followed by one row per book.
                </p>

                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><code>title</code> - Book title</li>
                    <li>Either <code>author</code> or <code>isbn</code> - Author name or ISBN number</li>
                    <li><code>status</code> - One of: "want to read", "reading", "completed", "dnf", "on-hold"</li>
                  </ul>

                  <h4 className="font-medium mt-4 mb-2">Optional Fields:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>completedDate</code> - Date finished (YYYY-MM-DD or ISO format)</li>
                      <li><code>rating</code> - Rating from 1-5</li>
                      <li><code>notes</code> - Your notes about the book</li>
                      <li><code>genre</code> - Book genre (can be multiple genres)</li>
                      <li><code>pageCount</code> - Number of pages</li>
                      <li><code>publishedDate</code> - Publication date (YYYY or YYYY-MM-DD)</li>
                      <li><code>addedDate</code> - Date added to library</li>
                    </ul>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>isPartOfSeries</code> - "true" or "false"</li>
                      <li><code>seriesId</code> - ID of the series</li>
                      <li><code>seriesName</code> - Name of the series</li>
                      <li><code>volumeNumber</code> - Position in the series</li>
                      <li><code>collectionNames</code> - Collection names (semicolon-separated)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">CSV Example</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm whitespace-pre-wrap">
                  title,author,status,rating,completedDate,notes,genre{"\n"}
                  "The Great Gatsby","F. Scott Fitzgerald","completed",4,"2025-01-15","A classic tale of wealth and obsession","Fiction"{"\n"}
                  "Dune","Frank Herbert","reading",,"","Epic sci-fi adventure","Science Fiction"{"\n"}
                  "Project Hail Mary","Andy Weir","want to read",,,,"Science Fiction"
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="json" className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">JSON Structure</h3>
                <p className="mb-4">
                  Your JSON file can be in one of two formats:
                </p>
                <ol className="list-decimal pl-5 mb-4 space-y-1">
                  <li><strong>Simple Format</strong>: An array of book objects</li>
                  <li><strong>Enhanced Format</strong>: A complete library export with books, series, and collections</li>
                </ol>
                <p className="mb-4">
                  For the simple format, your JSON file should contain an array of book objects with the following structure:
                </p>

                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><code>title</code> - Book title</li>
                    <li>Either <code>author</code> or <code>isbn</code> - Author name or ISBN number</li>
                    <li><code>status</code> - One of: "want-to-read", "reading", "completed", "dnf", "on-hold"</li>
                  </ul>

                  <h4 className="font-medium mt-4 mb-2">Optional Fields:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>completedDate</code> - Date finished (ISO format)</li>
                      <li><code>rating</code> - Integer from 1-5</li>
                      <li><code>notes</code> - Your notes about the book</li>
                      <li><code>genre</code> - Array of genres</li>
                      <li><code>pageCount</code> - Number of pages</li>
                      <li><code>publishedDate</code> - Publication date</li>
                      <li><code>addedDate</code> - Date added to library (ISO format)</li>
                      <li><code>spineColor</code> - Spine color index (1-8)</li>
                    </ul>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>isPartOfSeries</code> - Boolean (true/false)</li>
                      <li><code>seriesId</code> - ID of the series</li>
                      <li><code>seriesName</code> - Name of the series</li>
                      <li><code>volumeNumber</code> - Position in the series</li>
                      <li><code>collectionIds</code> - Array of collection IDs</li>
                      <li><code>collectionNames</code> - Array of collection names</li>
                      <li><code>id</code> - Unique identifier for the book</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">JSON Example</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`[
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "status": "completed",
    "rating": 4,
    "completedDate": "2025-01-15",
    "notes": "A classic tale of wealth and obsession",
    "genre": "Fiction"
  },
  {
    "title": "Dune",
    "author": "Frank Herbert",
    "status": "reading",
    "genre": "Science Fiction"
  },
  {
    "title": "Project Hail Mary",
    "author": "Andy Weir",
    "status": "want to read",
    "genre": "Science Fiction"
  }
]`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Enhanced JSON Format</h3>
                <p className="mb-4">
                  The enhanced JSON format includes complete library data with books, series, and collections:
                </p>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`{
  "version": "1.1.0",
  "timestamp": "2026-02-17T15:34:56.446Z",
  "books": [
    {
      "id": "book-uuid-1",
      "title": "Dune",
      "author": "Frank Herbert",
      "isbn": "mNoPqRsTuVwX",
      "status": "reading",
      "genre": ["Science Fiction"],
      "isPartOfSeries": true,
      "seriesId": "series-uuid-1",
      "volumeNumber": 1,
      "pageCount": 412,
      "publishedDate": "1965",
      "addedDate": "2026-02-17T00:00:00.000Z",
      "spineColor": 3,
      "collectionIds": ["collection-uuid-1"]
    }
  ],
  "series": [
    {
      "id": "series-uuid-1",
      "name": "Dune Chronicles",
      "author": "Frank Herbert",
      "books": ["book-uuid-1"],
      "totalBooks": 6,
      "readingOrder": "publication",
      "status": "ongoing",
      "genre": ["Science Fiction"],
      "isTracked": true,
      "hasUpcoming": false,
      "description": "Epic science fiction series"
    }
  ],
  "collections": [
    {
      "id": "collection-uuid-1",
      "name": "Science Fiction",
      "bookIds": ["book-uuid-1"],
      "color": "#3b82f6",
      "imageUrl": null,
      "description": "Science fiction books"
    }
  ]
}`}
                </pre>
                <p className="mt-2 text-sm text-muted-foreground">
                  The enhanced format preserves all relationships between books, series, and collections, making it ideal for complete library transfers.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="examples" className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Download Example Files</h3>
                <p className="mb-4">
                  You can download these example files to get started with your own imports:
                </p>

                <div className="flex flex-col gap-4">
                  <Button 
                    variant="outline" 
                    className="flex gap-2 items-center"
                    onClick={handleDownloadCsvExample}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download CSV Example
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex gap-2 items-center"
                    onClick={handleDownloadSimpleJsonExample}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Simple JSON Example
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex gap-2 items-center"
                    onClick={handleDownloadEnhancedJsonExample}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Enhanced JSON Example
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Post-Import Processing</h3>
                <p className="mb-4">
                  After importing your file, Book Collection App will:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Validate the data format</li>
                  <li>Fetch additional book details from Google Books API</li>
                  <li>If Google Books doesn't have the book, try Open Library API</li>
                  <li>Merge any existing information with the imported data</li>
                  <li>Reconstruct series and collection relationships</li>
                  <li>Resolve any conflicts between existing and imported series/collections</li>
                  <li>Display a summary of successfully imported books, series, and collections</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
