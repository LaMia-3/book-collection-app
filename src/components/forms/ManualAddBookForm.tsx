import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Book } from '@/types/book';
import { ImageUploader } from '../ImageUploader';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

// Define the form schema with Zod
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().optional().default(''),
  pageCount: z.coerce.number().positive().optional().nullable(),
  publishedDate: z.date().optional().nullable(),
  publisher: z.string().optional().default(''),
  description: z.string().optional().default(''),
  genre: z.string().optional().default(''),
  status: z.enum(['want-to-read', 'reading', 'completed', 'dnf']).default('want-to-read'),
  notes: z.string().optional().default(''),
  completedDate: z.date().optional().nullable(),
});

// Extract the inferred type from the schema
type FormSchema = z.infer<typeof formSchema>;

interface ManualAddBookFormProps {
  onSave: (book: Book) => void;
  onCancel?: () => void;
}

export const ManualAddBookForm: React.FC<ManualAddBookFormProps> = ({ onSave, onCancel }) => {
  const [coverImage, setCoverImage] = useState<string>('');

  // Initialize the form with react-hook-form
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema) as any, // Type assertion to avoid resolver compatibility issues
    defaultValues: {
      title: '',
      author: '',
      isbn: '',
      description: '',
      publisher: '',
      genre: '',
      status: 'want-to-read' as const,
      notes: '',
      pageCount: null,
      publishedDate: null,
      completedDate: null,
    },
  });

  // Handle form submission
  const onSubmit: SubmitHandler<FormSchema> = (values) => {
    // Convert form values to Book object
    const newBook: Book = {
      id: uuidv4(),
      title: values.title,
      author: values.author,
      isbn10: values.isbn ? [values.isbn] : [],
      isbn13: values.isbn ? [values.isbn] : [],
      pageCount: values.pageCount || 0,
      publishedDate: values.publishedDate?.toISOString() || '',
      description: values.description || '',
      // Split comma-separated genre string into an array of genres
      genre: values.genre ? values.genre.split(',').map(g => g.trim()).filter(Boolean) : [],
      // Map 'dnf' status to 'want-to-read' as 'dnf' is not in Book type
      status: values.status === 'dnf' ? 'want-to-read' : values.status,
      notes: values.notes || '',
      thumbnail: coverImage || undefined,
      addedDate: new Date().toISOString(),
      completedDate: values.completedDate?.toISOString() || '',
      spineColor: Math.floor(Math.random() * 5) + 1, // Random spine color 1-5
      isPartOfSeries: false,
      sourceType: 'manual' // Mark as manually added
    };

    onSave(newBook);
  };
  
  const handleImageChange = (image: string) => {
    setCoverImage(image);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Cover Image Upload */}
            <div className="mt-6 flex justify-center">
              <ImageUploader
                initialImage={coverImage}
                onImageChange={handleImageChange}
              />
            </div>
            
            {/* Left column form fields */}
            <FormField
              control={form.control as any}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Book title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author *</FormLabel>
                  <FormControl>
                    <Input placeholder="Author name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN</FormLabel>
                  <FormControl>
                    <Input placeholder="ISBN-10 or ISBN-13" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pageCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Count</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Number of pages" 
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseInt(value, 10));
                      }}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publishedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Published Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          type="button"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          <div className="space-y-4">
            {/* Right column form fields */}
            <FormField
              control={form.control}
              name="publisher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher</FormLabel>
                  <FormControl>
                    <Input placeholder="Publisher name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre</FormLabel>
                  <FormControl>
                    <Input placeholder="Fiction, Fantasy, Mystery (comma-separated)" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">Enter multiple genres separated by commas</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reading Status *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset completedDate if status is not completed
                      if (value !== 'completed') {
                        form.setValue('completedDate', null);
                      } else if (!form.getValues('completedDate')) {
                        // Set default completedDate to today if status becomes completed
                        form.setValue('completedDate', new Date());
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reading status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="want-to-read">Want to Read</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="dnf">Did Not Finish</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Conditionally show completion date field */}
            {form.watch('status') === 'completed' && (
              <FormField
                control={form.control}
                name="completedDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Completion Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            type="button"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Book description" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Your notes about the book" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>


        {/* Submit buttons */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="submit">Save Book</Button>
        </div>
      </form>
    </Form>
  );
};
