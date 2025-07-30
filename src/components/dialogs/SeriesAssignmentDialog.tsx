import React, { useState, useEffect } from 'react';
import { Book } from '@/types/book';
import { Series } from '@/types/series';
import { SeriesDetectionResult } from '@/services/api/SeriesApiService';
import { seriesService } from '@/services/SeriesService';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  BookOpen, 
  Library, 
  AlertCircle, 
  Plus, 
  Check, 
  X,
  CircleSlash,
  Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SeriesAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book;
  existingBooks: Book[];
  detectedSeries?: SeriesDetectionResult | null;
  onAssignSeries: (book: Book, seriesId: string, volumeNumber?: number) => void;
  onCreateNewSeries: (seriesData: Partial<Series>, book: Book, volumeNumber?: number) => void;
  mode?: 'add' | 'change';
  currentBookSeriesId?: string;
}

export function SeriesAssignmentDialog({
  open,
  onOpenChange,
  book,
  existingBooks,
  detectedSeries,
  onAssignSeries,
  onCreateNewSeries,
  mode = 'add',
  currentBookSeriesId
}: SeriesAssignmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [existingSeries, setExistingSeries] = useState<Series[]>([]);
  const [selectedAction, setSelectedAction] = useState<'detected' | 'existing' | 'new' | 'none'>('detected');
  const [volumeNumber, setVolumeNumber] = useState<number | undefined>(undefined);
  const [selectedExistingSeriesId, setSelectedExistingSeriesId] = useState<string>('');
  
  // New series form state
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesAuthor, setNewSeriesAuthor] = useState(book.author || '');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [newSeriesGenre, setNewSeriesGenre] = useState<string[]>([]);
  
  // Initialize with appropriate data based on mode and available info
  useEffect(() => {
    if (open) {
      if (mode === 'change' && currentBookSeriesId) {
        // When changing series for a book already in a series
        setSelectedAction('existing');
        setSelectedExistingSeriesId(currentBookSeriesId);
        setVolumeNumber(book.volumeNumber);
      } else if (detectedSeries?.series) {
        // When adding a new book with detected series
        setSelectedAction('detected');
        setNewSeriesName(detectedSeries.series.name || '');
        setNewSeriesAuthor(detectedSeries.series.author || book.author || '');
        setNewSeriesDescription(detectedSeries.series.description || '');
        
        // Try to extract volume number from title
        const volumeMatch = book.title.match(/(?:book|volume|#|\()\s*(\d+)/i);
        if (volumeMatch) {
          setVolumeNumber(parseInt(volumeMatch[1]));
        } else if (book.volumeNumber) {
          setVolumeNumber(book.volumeNumber);
        }
      } else {
        // Default state - no series detected or not changing
        setSelectedAction(mode === 'change' ? 'existing' : 'none');
        setVolumeNumber(book.volumeNumber);
      }

      // Always reset these fields when dialog opens
      if (!currentBookSeriesId) {
        setSelectedExistingSeriesId('');
      }
      
      if (mode === 'add') {
        setNewSeriesName('');
        setNewSeriesAuthor(book.author || '');
        setNewSeriesDescription('');
        setNewSeriesGenre([]);
      }
      
      // Load existing series
      loadExistingSeries();
    }
  }, [open, detectedSeries, book, mode, currentBookSeriesId]);
  
  const loadExistingSeries = async () => {
    try {
      setIsLoading(true);
      const series = await seriesService.getAllSeries();
      setExistingSeries(series);
      
      // If we have detected series, check if it matches any existing series
      if (detectedSeries?.series?.name) {
        const match = series.find(s => 
          s.name.toLowerCase() === detectedSeries.series.name?.toLowerCase() &&
          (!detectedSeries.series.author || s.author === detectedSeries.series.author)
        );
        
        if (match) {
          setSelectedAction('existing');
          setSelectedExistingSeriesId(match.id);
        }
      }
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = () => {
    switch (selectedAction) {
      case 'detected':
        // Create new series based on detected data
        if (detectedSeries?.series) {
          onCreateNewSeries(detectedSeries.series, book, volumeNumber);
        }
        break;
        
      case 'existing':
        // Add to existing series
        if (selectedExistingSeriesId) {
          onAssignSeries(book, selectedExistingSeriesId, volumeNumber);
        }
        break;
        
      case 'new':
        // Create new series with custom data
        onCreateNewSeries({
          name: newSeriesName,
          author: newSeriesAuthor,
          description: newSeriesDescription,
          genre: newSeriesGenre.length > 0 ? newSeriesGenre : undefined
        }, book, volumeNumber);
        break;
        
      case 'none':
        // Don't add to any series
        onOpenChange(false);
        break;
    }
  };
  
  // Extract and deduplicate genres from the existing books
  const availableGenres = Array.from(new Set(
    existingBooks
      .map(b => b.genre)
      .filter(Boolean)
      .flat()
  )) as string[];
  
  const renderConfidenceIndicator = (confidence: number) => {
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Detection confidence</span>
          <span className="text-xs font-medium">{confidence}%</span>
        </div>
        <Progress 
          value={confidence} 
          className={`h-2 ${
            confidence > 70 ? 'bg-green-500/20' : 
            confidence > 40 ? 'bg-amber-500/20' : 'bg-red-500/20'
          }`} 
        />
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            {mode === 'add' ? 'Add to Series' : 'Change Series'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? `Choose how you want to add `
              : `Choose a new series for `
            }
            <span className="font-semibold">{book.title}</span>
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Loading series information...</p>
          </div>
        ) : (
          <>
            {/* Series Options */}
            <div className="grid gap-6 py-4">
              {/* Detected Series Option */}
              {detectedSeries && (
                <div className={`border rounded-lg p-4 ${
                  selectedAction === 'detected' ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}>
                  <div className="flex items-start">
                    <input 
                      type="radio"
                      id="detected-series"
                      name="series-action"
                      checked={selectedAction === 'detected'}
                      onChange={() => setSelectedAction('detected')}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <label htmlFor="detected-series" className="flex items-center gap-2 font-medium mb-1">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Series detected automatically
                      </label>
                      
                      <div className="border rounded-md p-3 bg-muted/30 my-3">
                        <div className="flex items-center gap-3">
                          {detectedSeries.series.coverImage && (
                            <img 
                              src={detectedSeries.series.coverImage} 
                              alt={detectedSeries.series.name} 
                              className="h-16 w-12 object-cover rounded-sm"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{detectedSeries.series.name}</h4>
                            {detectedSeries.series.author && (
                              <p className="text-sm text-muted-foreground">{detectedSeries.series.author}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {detectedSeries.series.status && (
                                <Badge variant="outline">
                                  {detectedSeries.series.status}
                                </Badge>
                              )}
                              
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {detectedSeries.series.totalBooks || '?'} Books
                              </Badge>
                              
                              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-700">
                                {detectedSeries.source === 'google' ? 'From Google Books' : 
                                 detectedSeries.source === 'openlib' ? 'From Open Library' :
                                 detectedSeries.source === 'title' ? 'From Title Pattern' :
                                 'From Your Collection'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {detectedSeries.series.description && (
                          <p className="text-sm mt-3 text-muted-foreground line-clamp-3">
                            {detectedSeries.series.description}
                          </p>
                        )}
                        
                        {renderConfidenceIndicator(detectedSeries.confidence)}
                        
                        {/* Matched books from collection */}
                        {detectedSeries.matchedBooks && detectedSeries.matchedBooks.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Similar books in your collection:</p>
                            <div className="space-y-2">
                              {detectedSeries.matchedBooks.slice(0, 3).map(matchedBook => (
                                <div key={matchedBook.id} className="flex items-center gap-2 text-sm">
                                  {matchedBook.thumbnail && (
                                    <img 
                                      src={matchedBook.thumbnail}
                                      alt={matchedBook.title}
                                      className="h-8 w-6 object-cover rounded"
                                    />
                                  )}
                                  <span className="flex-1">{matchedBook.title}</span>
                                </div>
                              ))}
                              {detectedSeries.matchedBooks.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{detectedSeries.matchedBooks.length - 3} more books
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Volume number input for detected series */}
                      <div className="mt-4">
                        <Label htmlFor="detected-volume">Volume in series</Label>
                        <Input
                          id="detected-volume"
                          type="number"
                          min="1"
                          value={volumeNumber || ''}
                          onChange={(e) => setVolumeNumber(parseInt(e.target.value) || undefined)}
                          className="mt-1 w-32"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Existing Series Option */}
              <div className={`border rounded-lg p-4 ${
                selectedAction === 'existing' ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}>
                <div className="flex items-start">
                  <input 
                    type="radio"
                    id="existing-series"
                    name="series-action"
                    checked={selectedAction === 'existing'}
                    onChange={() => setSelectedAction('existing')}
                    className="mt-1 mr-3"
                    disabled={existingSeries.length === 0}
                  />
                  <div className="flex-1">
                    <label htmlFor="existing-series" className="font-medium mb-1 block">
                      Add to an existing series
                    </label>
                    
                    {existingSeries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        You don't have any series created yet
                      </p>
                    ) : (
                      <div className="mt-3 space-y-4">
                        <Select
                          value={selectedExistingSeriesId}
                          onValueChange={setSelectedExistingSeriesId}
                          disabled={selectedAction !== 'existing'}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a series" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Your series</SelectLabel>
                              {existingSeries.map(series => (
                                <SelectItem key={series.id} value={series.id}>
                                  {series.name} {series.author && `(${series.author})`}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        
                        {/* Show series details if selected */}
                        {selectedAction === 'existing' && selectedExistingSeriesId && (
                          <div>
                            {(() => {
                              const selectedSeries = existingSeries.find(s => s.id === selectedExistingSeriesId);
                              if (!selectedSeries) return null;
                              
                              return (
                                <div className="border rounded-md p-3 bg-muted/30">
                                  <div className="flex items-center gap-3">
                                    {selectedSeries.coverImage && (
                                      <img 
                                        src={selectedSeries.coverImage} 
                                        alt={selectedSeries.name} 
                                        className="h-16 w-12 object-cover rounded-sm"
                                      />
                                    )}
                                    <div>
                                      <h4 className="font-medium">{selectedSeries.name}</h4>
                                      {selectedSeries.author && (
                                        <p className="text-sm text-muted-foreground">{selectedSeries.author}</p>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedSeries.status && (
                                          <Badge variant="outline">
                                            {selectedSeries.status}
                                          </Badge>
                                        )}
                                        
                                        <Badge variant="secondary">
                                          {selectedSeries.books.length} Books
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        {/* Volume number input for existing series */}
                        {selectedAction === 'existing' && selectedExistingSeriesId && (
                          <div className="mt-2">
                            <Label htmlFor="existing-volume">Volume in series</Label>
                            <Input
                              id="existing-volume"
                              type="number"
                              min="1"
                              value={volumeNumber || ''}
                              onChange={(e) => setVolumeNumber(parseInt(e.target.value) || undefined)}
                              className="mt-1 w-32"
                              placeholder="Optional"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Create New Series Option */}
              <div className={`border rounded-lg p-4 ${
                selectedAction === 'new' ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}>
                <div className="flex items-start">
                  <input 
                    type="radio"
                    id="new-series"
                    name="series-action"
                    checked={selectedAction === 'new'}
                    onChange={() => setSelectedAction('new')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <label htmlFor="new-series" className="flex items-center gap-2 font-medium mb-1">
                      <Plus className="h-4 w-4 text-primary" />
                      Create a new series
                    </label>
                    
                    {selectedAction === 'new' && (
                      <div className="mt-3 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="series-name">Series Name</Label>
                          <Input
                            id="series-name"
                            value={newSeriesName}
                            onChange={(e) => setNewSeriesName(e.target.value)}
                            placeholder="Enter series name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="series-author">Author</Label>
                          <Input
                            id="series-author"
                            value={newSeriesAuthor}
                            onChange={(e) => setNewSeriesAuthor(e.target.value)}
                            placeholder="Series author"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="series-description">Description</Label>
                          <Textarea
                            id="series-description"
                            value={newSeriesDescription}
                            onChange={(e) => setNewSeriesDescription(e.target.value)}
                            placeholder="Brief description of the series"
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Genre</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {availableGenres.map(genre => (
                              <Badge 
                                key={genre}
                                variant={newSeriesGenre.includes(genre) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  if (newSeriesGenre.includes(genre)) {
                                    setNewSeriesGenre(newSeriesGenre.filter(g => g !== genre));
                                  } else {
                                    setNewSeriesGenre([...newSeriesGenre, genre]);
                                  }
                                }}
                              >
                                {genre}
                              </Badge>
                            ))}
                            {availableGenres.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                No genres available from your books
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="new-volume">Volume in series</Label>
                          <Input
                            id="new-volume"
                            type="number"
                            min="1"
                            value={volumeNumber || ''}
                            onChange={(e) => setVolumeNumber(parseInt(e.target.value) || undefined)}
                            className="w-32"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Don't Add to Series Option */}
              <div className={`border rounded-lg p-4 ${
                selectedAction === 'none' ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}>
                <div className="flex items-start">
                  <input 
                    type="radio"
                    id="no-series"
                    name="series-action"
                    checked={selectedAction === 'none'}
                    onChange={() => setSelectedAction('none')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <label htmlFor="no-series" className="flex items-center gap-2 font-medium">
                      <CircleSlash className="h-4 w-4 text-muted-foreground" />
                      Don't add to any series
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <Button onClick={handleSubmit} disabled={isLoading}>
            {selectedAction === 'none' ? (
              <>Skip</>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {selectedAction === 'detected' ? 
                  (mode === 'add' ? 'Add to Detected Series' : 'Change to Detected Series') : 
                 selectedAction === 'existing' ? 
                  (mode === 'add' ? 'Add to Selected Series' : 'Change to Selected Series') : 
                 (mode === 'add' ? 'Create New Series' : 'Change to New Series')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
