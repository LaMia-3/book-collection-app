import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { generateTestCollections, deleteTestCollections } from './CollectionTestGenerator';
import { AlertCircle, CheckCircle, Database, Loader2 } from 'lucide-react';
import { Collection } from '@/types/collection';

interface CollectionTestUIProps {
  onComplete?: (collections: Collection[]) => void;
}

export const CollectionTestUI: React.FC<CollectionTestUIProps> = ({ onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedCollections, setGeneratedCollections] = useState<Collection[]>([]);

  const handleGenerateCollections = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setStatusMessage('Preparing to generate collections...');

    try {
      const collections = await generateTestCollections((message, progressValue) => {
        setStatusMessage(message);
        setProgress(progressValue);
      });

      setGeneratedCollections(collections);
      setSuccess(`Successfully created ${collections.length} collections!`);
      
      if (onComplete) {
        onComplete(collections);
      }
    } catch (err) {
      setError(`Failed to generate collections: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCollections = async () => {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setStatusMessage('Preparing to delete test collections...');

    try {
      await deleteTestCollections((message, progressValue) => {
        setStatusMessage(message);
        setProgress(progressValue);
      });

      setGeneratedCollections([]);
      setSuccess('Successfully deleted all test collections!');
    } catch (err) {
      setError(`Failed to delete collections: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Collection Test Generator
        </CardTitle>
        <CardDescription>
          Generate 10 test collections with 5-40 books each for testing purposes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(isGenerating || isDeleting) && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>{statusMessage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start gap-2 mb-4">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-start gap-2 mb-4">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        {generatedCollections.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Generated Collections:</h4>
            <ul className="space-y-1 text-sm">
              {generatedCollections.map(collection => (
                <li key={collection.id} className="flex items-center justify-between">
                  <span>{collection.name}</span>
                  <span className="text-muted-foreground">{collection.bookIds.length} books</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleDeleteCollections}
          disabled={isGenerating || isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete Test Collections'
          )}
        </Button>
        <Button
          onClick={handleGenerateCollections}
          disabled={isGenerating || isDeleting}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Collections'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
