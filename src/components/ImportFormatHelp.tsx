import React from 'react';
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
            Learn how to format your CSV and JSON files for importing books
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
                    <li><code>status</code> - One of: "want to read", "reading", "completed"</li>
                  </ul>

                  <h4 className="font-medium mt-4 mb-2">Optional Fields:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>completedDate</code> - Date finished (YYYY-MM-DD, with or without quotes)</li>
                      <li><code>rating</code> - Rating from 1-5</li>
                      <li><code>notes</code> - Your notes about the book</li>
                    </ul>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>genre</code> - Book genre</li>
                      <li><code>isPartOfSeries</code> - "true" or "false"</li>
                      <li><code>seriesName</code> - Name of the series</li>
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
                  Your JSON file should contain an array of book objects with the following structure:
                </p>

                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><code>title</code> - Book title</li>
                    <li>Either <code>author</code> or <code>isbn</code> - Author name or ISBN number</li>
                    <li><code>status</code> - One of: "want to read", "reading", "completed"</li>
                  </ul>

                  <h4 className="font-medium mt-4 mb-2">Optional Fields:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>completedDate</code> - Date finished (YYYY-MM-DD, with or without quotes)</li>
                      <li><code>rating</code> - Integer from 1-5</li>
                      <li><code>notes</code> - Your notes about the book</li>
                    </ul>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>genre</code> - Book genre</li>
                      <li><code>isPartOfSeries</code> - Boolean (true/false)</li>
                      <li><code>seriesName</code> - Name of the series</li>
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
            </TabsContent>

            <TabsContent value="examples" className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Download Example Files</h3>
                <p className="mb-4">
                  You can download these example files to get started with your own imports:
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="flex gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download CSV Example
                  </Button>
                  <Button variant="outline" className="flex gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download JSON Example
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Post-Import Processing</h3>
                <p className="mb-4">
                  After importing your file, Mira Book Collection App will:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Validate the data format</li>
                  <li>Fetch additional book details from Google Books API</li>
                  <li>If Google Books doesn't have the book, try Open Library API</li>
                  <li>Merge any existing information with the imported data</li>
                  <li>Display a summary of successfully imported books</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
