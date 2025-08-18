import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle } from 'lucide-react';
import { Book } from '@/types/book';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { seriesService } from '@/services/SeriesService';
import googleBooksProvider from '@/services/api/GoogleBooksProvider';
import openLibraryProvider from '@/services/api/OpenLibraryProvider';
import { Badge } from '@/components/ui/badge';

// Books to search for by API provider
const GOOGLE_BOOK_SEARCHES = [
  // Lord of the Rings series
  { query: 'The Fellowship of the Ring Tolkien', type: 'title' },
  { query: 'The Two Towers Tolkien', type: 'title' },
  { query: 'The Return of the King Tolkien', type: 'title' },
  { query: 'The Hobbit Tolkien', type: 'title' },
  { query: 'The Silmarillion Tolkien', type: 'title' },
  // Mistborn series
  { query: 'The Final Empire Sanderson', type: 'title' },
  { query: 'The Well of Ascension Sanderson', type: 'title' },
  { query: 'The Hero of Ages Sanderson', type: 'title' },
  // Stormlight Archive series
  { query: 'The Way of Kings Sanderson', type: 'title' },
  { query: 'Words of Radiance Sanderson', type: 'title' },
  { query: 'Oathbringer Sanderson', type: 'title' },
  { query: 'Rhythm of War Sanderson', type: 'title' },
  // Foundation series
  { query: 'Foundation Isaac Asimov', type: 'title' },
  { query: 'Foundation and Empire Asimov', type: 'title' },
  { query: 'Second Foundation Asimov', type: 'title' },
  // Dune series
  { query: 'Dune Frank Herbert', type: 'title' },
  { query: 'Dune Messiah Frank Herbert', type: 'title' },
  { query: 'Children of Dune Herbert', type: 'title' },
  // Classics
  { query: '1984 George Orwell', type: 'title' },
  { query: 'Brave New World Huxley', type: 'title' },
  { query: 'The Great Gatsby Fitzgerald', type: 'title' },
  { query: 'To Kill a Mockingbird Lee', type: 'title' },
  { query: 'Moby Dick Melville', type: 'title' },
  // Science Fiction Classics
  { query: 'Neuromancer William Gibson', type: 'title' },
  { query: 'Hyperion Dan Simmons', type: 'title' },
  { query: 'Ender\'s Game Orson Scott Card', type: 'title' },
  { query: 'The Forever War Joe Haldeman', type: 'title' },
  { query: 'The Left Hand of Darkness Ursula K. Le Guin', type: 'title' },
  { query: 'The Dispossessed Ursula K. Le Guin', type: 'title' },
  { query: 'Ringworld Larry Niven', type: 'title' },
  { query: 'The Stars My Destination Alfred Bester', type: 'title' },
  { query: 'Rendezvous with Rama Arthur C. Clarke', type: 'title' },
  { query: '2001: A Space Odyssey Clarke', type: 'title' },
  // Fantasy Books
  { query: 'The Name of the Wind Patrick Rothfuss', type: 'title' },
  { query: 'The Wise Man\'s Fear Rothfuss', type: 'title' },
  { query: 'The Lies of Locke Lamora Scott Lynch', type: 'title' },
  { query: 'The Blade Itself Joe Abercrombie', type: 'title' },
  { query: 'The Black Company Glen Cook', type: 'title' },
  { query: 'Gardens of the Moon Steven Erikson', type: 'title' },
  { query: 'Assassin\'s Apprentice Robin Hobb', type: 'title' },
  { query: 'The Fifth Season N.K. Jemisin', type: 'title' },
  { query: 'Jonathan Strange & Mr Norrell Susanna Clarke', type: 'title' },
  { query: 'The Priory of the Orange Tree Samantha Shannon', type: 'title' },
  // More Classics
  { query: 'Pride and Prejudice Jane Austen', type: 'title' },
  { query: 'Crime and Punishment Dostoevsky', type: 'title' },
  { query: 'Anna Karenina Tolstoy', type: 'title' },
  { query: 'The Picture of Dorian Gray Oscar Wilde', type: 'title' },
  { query: 'Great Expectations Charles Dickens', type: 'title' },
  { query: 'One Hundred Years of Solitude Gabriel García Márquez', type: 'title' },
  { query: 'The Catcher in the Rye Salinger', type: 'title' },
  { query: 'Fahrenheit 451 Ray Bradbury', type: 'title' },
  { query: 'Dracula Bram Stoker', type: 'title' },
  { query: 'Frankenstein Mary Shelley', type: 'title' },
  // Contemporary Fiction
  { query: 'The Road Cormac McCarthy', type: 'title' },
  { query: 'Station Eleven Emily St. John Mandel', type: 'title' },
  { query: 'Circe Madeline Miller', type: 'title' },
  { query: 'Never Let Me Go Kazuo Ishiguro', type: 'title' },
  { query: 'A Gentleman in Moscow Amor Towles', type: 'title' },
  { query: 'The Goldfinch Donna Tartt', type: 'title' },
  { query: 'The Overstory Richard Powers', type: 'title' },
  { query: 'Normal People Sally Rooney', type: 'title' },
  { query: 'Where the Crawdads Sing Delia Owens', type: 'title' },
  { query: 'All the Light We Cannot See Anthony Doerr', type: 'title' },
  // Mystery and Thriller
  { query: 'Gone Girl Gillian Flynn', type: 'title' },
  { query: 'The Girl with the Dragon Tattoo Stieg Larsson', type: 'title' },
  { query: 'The Silent Patient Alex Michaelides', type: 'title' },
  { query: 'The Da Vinci Code Dan Brown', type: 'title' },
  { query: 'The Girl on the Train Paula Hawkins', type: 'title' },
  { query: 'And Then There Were None Agatha Christie', type: 'title' },
  { query: 'Murder on the Orient Express Christie', type: 'title' },
  { query: 'The Maltese Falcon Dashiell Hammett', type: 'title' },
  { query: 'The Big Sleep Raymond Chandler', type: 'title' },
  { query: 'In Cold Blood Truman Capote', type: 'title' },
  { query: 'Rebecca Daphne du Maurier', type: 'title' },
  { query: 'Shutter Island Dennis Lehane', type: 'title' },
  { query: 'The Silence of the Lambs Thomas Harris', type: 'title' },
  { query: 'The Talented Mr. Ripley Patricia Highsmith', type: 'title' },
  { query: 'The Woman in White Wilkie Collins', type: 'title' },
  // Horror
  { query: 'The Shining Stephen King', type: 'title' },
  { query: 'It Stephen King', type: 'title' },
  { query: 'Pet Sematary Stephen King', type: 'title' },
  { query: 'The Stand Stephen King', type: 'title' },
  { query: 'House of Leaves Mark Z. Danielewski', type: 'title' },
  { query: 'The Haunting of Hill House Shirley Jackson', type: 'title' },
  { query: 'Something Wicked This Way Comes Ray Bradbury', type: 'title' },
  { query: 'The Exorcist William Peter Blatty', type: 'title' },
  { query: 'Bird Box Josh Malerman', type: 'title' },
  { query: 'Mexican Gothic Silvia Moreno-Garcia', type: 'title' },
  // Young Adult Fiction
  { query: 'The Hunger Games Suzanne Collins', type: 'title' },
  { query: 'Catching Fire Suzanne Collins', type: 'title' },
  { query: 'Mockingjay Suzanne Collins', type: 'title' },
  { query: 'Divergent Veronica Roth', type: 'title' },
  { query: 'The Fault in Our Stars John Green', type: 'title' },
  { query: 'The Hate U Give Angie Thomas', type: 'title' },
  { query: 'The Perks of Being a Wallflower Stephen Chbosky', type: 'title' },
  { query: 'The Giver Lois Lowry', type: 'title' },
  { query: 'Speak Laurie Halse Anderson', type: 'title' },
  { query: 'Eleanor & Park Rainbow Rowell', type: 'title' },
  // Memoir and Biography
  { query: 'Born a Crime Trevor Noah', type: 'title' },
  { query: 'Wild Cheryl Strayed', type: 'title' },
  { query: 'The Glass Castle Jeannette Walls', type: 'title' },
  { query: 'Hillbilly Elegy J.D. Vance', type: 'title' },
  { query: 'Just Kids Patti Smith', type: 'title' },
  { query: 'I Know Why the Caged Bird Sings Maya Angelou', type: 'title' },
  { query: 'When Breath Becomes Air Paul Kalanithi', type: 'title' },
  { query: 'Kitchen Confidential Anthony Bourdain', type: 'title' },
  { query: 'Into the Wild Jon Krakauer', type: 'title' },
  { query: 'Night Elie Wiesel', type: 'title' },
  { query: 'The Diary of a Young Girl Anne Frank', type: 'title' },
  { query: 'Man\'s Search for Meaning Viktor E. Frankl', type: 'title' },
  { query: 'Unbroken Laura Hillenbrand', type: 'title' },
  // Poetry
  { query: 'Leaves of Grass Walt Whitman', type: 'title' },
  { query: 'Milk and Honey Rupi Kaur', type: 'title' },
  { query: 'The Waste Land T.S. Eliot', type: 'title' },
  { query: 'Howl Allen Ginsberg', type: 'title' },
  { query: 'The Sun and Her Flowers Rupi Kaur', type: 'title' },
  { query: 'The Prophet Kahlil Gibran', type: 'title' },
  { query: 'The Collected Poems of Emily Dickinson', type: 'title' },
  { query: 'The Complete Poetry of Edgar Allan Poe', type: 'title' },
  { query: 'Twenty Love Poems Pablo Neruda', type: 'title' },
];

const OPEN_LIBRARY_BOOK_SEARCHES = [
  // Harry Potter series
  { query: 'Harry Potter and the Philosopher\'s Stone Rowling', type: 'title' },
  { query: 'Harry Potter and the Chamber of Secrets Rowling', type: 'title' },
  { query: 'Harry Potter and the Prisoner of Azkaban Rowling', type: 'title' },
  { query: 'Harry Potter and the Goblet of Fire Rowling', type: 'title' },
  { query: 'Harry Potter and the Order of the Phoenix Rowling', type: 'title' },
  { query: 'Harry Potter and the Half-Blood Prince Rowling', type: 'title' },
  { query: 'Harry Potter and the Deathly Hallows Rowling', type: 'title' },
  // Wheel of Time series
  { query: 'The Eye of the World Robert Jordan', type: 'title' },
  { query: 'The Great Hunt Robert Jordan', type: 'title' },
  { query: 'The Dragon Reborn Robert Jordan', type: 'title' },
  { query: 'The Shadow Rising Robert Jordan', type: 'title' },
  { query: 'The Fires of Heaven Robert Jordan', type: 'title' },
  { query: 'Lord of Chaos Robert Jordan', type: 'title' },
  { query: 'A Crown of Swords Robert Jordan', type: 'title' },
  { query: 'The Path of Daggers Robert Jordan', type: 'title' },
  { query: 'Winter\'s Heart Robert Jordan', type: 'title' },
  { query: 'Crossroads of Twilight Robert Jordan', type: 'title' },
  { query: 'Knife of Dreams Robert Jordan', type: 'title' },
  { query: 'The Gathering Storm Robert Jordan', type: 'title' },
  { query: 'Towers of Midnight Robert Jordan', type: 'title' },
  { query: 'A Memory of Light Robert Jordan', type: 'title' },
  // Chronicles of Narnia
  { query: 'The Lion, the Witch and the Wardrobe Lewis', type: 'title' },
  { query: 'Prince Caspian C.S. Lewis', type: 'title' },
  { query: 'The Voyage of the Dawn Treader Lewis', type: 'title' },
  { query: 'The Silver Chair C.S. Lewis', type: 'title' },
  { query: 'The Horse and His Boy C.S. Lewis', type: 'title' },
  { query: 'The Magician\'s Nephew C.S. Lewis', type: 'title' },
  { query: 'The Last Battle C.S. Lewis', type: 'title' },
  // Game of Thrones
  { query: 'A Game of Thrones Martin', type: 'title' },
  { query: 'A Clash of Kings Martin', type: 'title' },
  { query: 'A Storm of Swords Martin', type: 'title' },
  { query: 'A Feast for Crows Martin', type: 'title' },
  { query: 'A Dance with Dragons Martin', type: 'title' },
  // Classic Literature
  { query: 'Pride and Prejudice Jane Austen', type: 'title' },
  { query: 'Jane Eyre Charlotte Bronte', type: 'title' },
  { query: 'Wuthering Heights Emily Bronte', type: 'title' },
  { query: 'The Count of Monte Cristo Dumas', type: 'title' },
  { query: 'War and Peace Tolstoy', type: 'title' },
  // More Classics
  { query: 'David Copperfield Charles Dickens', type: 'title' },
  { query: 'Oliver Twist Charles Dickens', type: 'title' },
  { query: 'A Tale of Two Cities Charles Dickens', type: 'title' },
  { query: 'Les Misérables Victor Hugo', type: 'title' },
  { query: 'The Iliad Homer', type: 'title' },
  { query: 'The Odyssey Homer', type: 'title' },
  { query: 'Don Quixote Miguel de Cervantes', type: 'title' },
  { query: 'The Divine Comedy Dante Alighieri', type: 'title' },
  { query: 'The Brothers Karamazov Dostoevsky', type: 'title' },
  { query: 'Madame Bovary Gustave Flaubert', type: 'title' },
  // Historical Fiction
  { query: 'The Book Thief Markus Zusak', type: 'title' },
  { query: 'All the Light We Cannot See Anthony Doerr', type: 'title' },
  { query: 'The Nightingale Kristin Hannah', type: 'title' },
  { query: 'Pachinko Min Jin Lee', type: 'title' },
  { query: 'Wolf Hall Hilary Mantel', type: 'title' },
  { query: 'The Pillars of the Earth Ken Follett', type: 'title' },
  { query: 'Outlander Diana Gabaldon', type: 'title' },
  { query: 'Beloved Toni Morrison', type: 'title' },
  { query: 'The Color Purple Alice Walker', type: 'title' },
  { query: 'The Underground Railroad Colson Whitehead', type: 'title' },
  { query: 'A Thousand Splendid Suns Khaled Hosseini', type: 'title' },
  { query: 'The Kite Runner Khaled Hosseini', type: 'title' },
  { query: 'The Help Kathryn Stockett', type: 'title' },
  { query: 'Memoirs of a Geisha Arthur Golden', type: 'title' },
  // Science Fiction
  { query: 'The Hitchhiker\'s Guide to the Galaxy Douglas Adams', type: 'title' },
  { query: 'Ready Player One Ernest Cline', type: 'title' },
  { query: 'The Martian Andy Weir', type: 'title' },
  { query: 'Project Hail Mary Andy Weir', type: 'title' },
  { query: 'Snow Crash Neal Stephenson', type: 'title' },
  { query: 'Leviathan Wakes James S.A. Corey', type: 'title' },
  { query: 'Ancillary Justice Ann Leckie', type: 'title' },
  { query: 'The Three-Body Problem Cixin Liu', type: 'title' },
  { query: 'Childhood\'s End Arthur C. Clarke', type: 'title' },
  { query: 'The Time Machine H.G. Wells', type: 'title' },
  { query: 'The War of the Worlds H.G. Wells', type: 'title' },
  { query: 'Slaughterhouse-Five Kurt Vonnegut', type: 'title' },
  { query: 'Do Androids Dream of Electric Sheep? Philip K. Dick', type: 'title' },
  { query: 'Ubik Philip K. Dick', type: 'title' },
  { query: 'Solaris Stanisław Lem', type: 'title' },
  // Philosophy and Non-Fiction
  { query: 'Sapiens Yuval Noah Harari', type: 'title' },
  { query: 'Thinking, Fast and Slow Daniel Kahneman', type: 'title' },
  { query: 'The Power of Habit Charles Duhigg', type: 'title' },
  { query: 'Educated Tara Westover', type: 'title' },
  { query: 'Becoming Michelle Obama', type: 'title' },
  { query: 'The Immortal Life of Henrietta Lacks Rebecca Skloot', type: 'title' },
  { query: 'The Art of War Sun Tzu', type: 'title' },
  { query: 'A Brief History of Time Stephen Hawking', type: 'title' },
  { query: 'Cosmos Carl Sagan', type: 'title' },
  { query: 'Silent Spring Rachel Carson', type: 'title' },
  // Modern Fantasy
  { query: 'American Gods Neil Gaiman', type: 'title' },
  { query: 'Neverwhere Neil Gaiman', type: 'title' },
  { query: 'The Ocean at the End of the Lane Neil Gaiman', type: 'title' },
  { query: 'Uprooted Naomi Novik', type: 'title' },
  { query: 'The Night Circus Erin Morgenstern', type: 'title' },
  { query: 'The Invisible Life of Addie LaRue V.E. Schwab', type: 'title' },
  { query: 'The Magicians Lev Grossman', type: 'title' },
  { query: 'The City & the City China Miéville', type: 'title' },
  { query: 'The Grace of Kings Ken Liu', type: 'title' },
  { query: 'The Poppy War R.F. Kuang', type: 'title' },
  // Classic Literary Fiction
  { query: 'Lolita Vladimir Nabokov', type: 'title' },
  { query: 'The Sound and the Fury William Faulkner', type: 'title' },
  { query: 'The Grapes of Wrath John Steinbeck', type: 'title' },
  { query: 'As I Lay Dying Faulkner', type: 'title' },
  { query: 'Their Eyes Were Watching God Zora Neale Hurston', type: 'title' },
  { query: 'Heart of Darkness Joseph Conrad', type: 'title' },
  { query: 'A Portrait of the Artist as a Young Man Joyce', type: 'title' },
  { query: 'Invisible Man Ralph Ellison', type: 'title' },
  { query: 'The Stranger Albert Camus', type: 'title' },
  { query: 'Catch-22 Joseph Heller', type: 'title' },
  // Short Story Collections
  { query: 'Interpreter of Maladies Jhumpa Lahiri', type: 'title' },
  { query: 'What We Talk About When We Talk About Love Raymond Carver', type: 'title' },
  { query: 'Dubliners James Joyce', type: 'title' },
  { query: 'Nine Stories J.D. Salinger', type: 'title' },
  { query: 'Tenth of December George Saunders', type: 'title' },
  { query: 'The Things They Carried Tim O\'Brien', type: 'title' },
  // Mystery Series
  { query: 'The Adventures of Sherlock Holmes Arthur Conan Doyle', type: 'title' },
  { query: 'The Hound of the Baskervilles Arthur Conan Doyle', type: 'title' },
  { query: 'The Sign of Four Arthur Conan Doyle', type: 'title' },
  { query: 'A Study in Scarlet Arthur Conan Doyle', type: 'title' },
  { query: 'The Maltese Falcon Dashiell Hammett', type: 'title' },
  { query: 'The Cuckoo\'s Calling Robert Galbraith', type: 'title' },
  { query: 'The Silkworm Robert Galbraith', type: 'title' },
  // Award Winners
  { query: 'The Goldfinch Donna Tartt', type: 'title' },
  { query: 'The Sympathizer Viet Thanh Nguyen', type: 'title' },
  { query: 'Less Andrew Sean Greer', type: 'title' },
  { query: 'The Nickel Boys Colson Whitehead', type: 'title' },
  { query: 'Hamnet Maggie O\'Farrell', type: 'title' },
  { query: 'Shuggie Bain Douglas Stuart', type: 'title' },
];

// Helper to generate random completion date within past 2 years
const getRandomCompletionDate = (): string => {
  const now = new Date();
  // Random date between now and 2 years ago
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  const randomTimestamp = twoYearsAgo.getTime() + 
    Math.random() * (now.getTime() - twoYearsAgo.getTime());
  
  const randomDate = new Date(randomTimestamp);
  
  // Ensure date is valid and formatted correctly for IndexedDB
  // Strip milliseconds to ensure consistent format
  const isoString = randomDate.toISOString();
  return isoString;
};

// Series definitions to create
const SERIES_DEFINITIONS = [
  {
    name: 'The Lord of the Rings',
    author: 'J.R.R. Tolkien',
    description: 'Epic high-fantasy novels set in the world of Middle-earth',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Fellowship of the Ring', 'Two Towers', 'Return of the King', 'Hobbit', 'Silmarillion']
  },
  {
    name: 'Mistborn',
    author: 'Brandon Sanderson',
    description: 'Fantasy series set in a world where ash falls from the sky',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Final Empire', 'Well of Ascension', 'Hero of Ages']
  },
  {
    name: 'Stormlight Archive',
    author: 'Brandon Sanderson',
    description: 'Epic fantasy series set on the world of Roshar',
    genre: ['fantasy'],
    status: 'ongoing',
    searchTerms: ['Way of Kings', 'Words of Radiance', 'Oathbringer', 'Rhythm of War']
  },
  {
    name: 'Foundation',
    author: 'Isaac Asimov',
    description: 'Science fiction series chronicling the decline and rebirth of a galactic empire',
    genre: ['science fiction'],
    status: 'completed',
    searchTerms: ['Foundation']
  },
  {
    name: 'Dune',
    author: 'Frank Herbert',
    description: 'Science fiction epic set in a distant future amid a feudal interstellar society',
    genre: ['science fiction'],
    status: 'completed',
    searchTerms: ['Dune']
  },
  {
    name: 'Harry Potter',
    author: 'J.K. Rowling',
    description: 'Fantasy series about a young wizard and his adventures',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Harry Potter']
  },
  {
    name: 'The Wheel of Time',
    author: 'Robert Jordan',
    description: 'Epic fantasy series spanning fourteen books',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Eye of the World', 'Great Hunt', 'Dragon Reborn', 'Shadow Rising', 'Fires of Heaven']
  },
  {
    name: 'The Chronicles of Narnia',
    author: 'C.S. Lewis',
    description: 'Fantasy series following the adventures of children in the magical world of Narnia',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Narnia', 'Lion, the Witch and the Wardrobe', 'Prince Caspian', 'Dawn Treader']
  },
  {
    name: 'A Song of Ice and Fire',
    author: 'George R.R. Martin',
    description: 'Epic fantasy series in a medieval setting with political intrigue and warfare',
    genre: ['fantasy'],
    status: 'ongoing',
    searchTerms: ['Game of Thrones', 'Clash of Kings', 'Storm of Swords']
  }
];

interface TestResult {
  step: string;
  success: boolean;
  message: string;
}

/**
 * Workflow Tester Component
 * Tests multiple workflows by adding books from different API providers and creating series
 */
export function WorkflowTester() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [seriesMap, setSeriesMap] = useState<Record<string, string[]>>({});

  // Helper to add test result
  const addResult = (step: string, success: boolean, message: string) => {
    setResults(prev => [...prev, { step, success, message }]);
  };

  // Add books from Google Books API - distributing the reading status appropriately
  async function addBooksFromGoogleAPI() {
    addResult("Google Books API", true, "Adding books from Google Books API...");
    const books: Book[] = [];
    
    // Fallback queries to try if the original query fails
    const fallbackQueries = [
      "Harry Potter", "The Hunger Games", "Dune", "Pride and Prejudice",
      "1984", "To Kill a Mockingbird", "The Great Gatsby", "Lord of the Rings",
      "Brave New World", "The Hobbit", "Jane Eyre", "Moby Dick"
    ];
    
    for (let i = 0; i < GOOGLE_BOOK_SEARCHES.length; i++) {
      try {
        const { query, type } = GOOGLE_BOOK_SEARCHES[i];
        let foundBook = false;
        let attempt = 0;
        let currentQuery = query;
        let searchResult;
        
        // Try original query and fallbacks if needed
        while (!foundBook && attempt < 3) {
          try {
            // Search for the book
            searchResult = await googleBooksProvider.searchBooks({
              query: currentQuery, 
              type: type as any,
              limit: 1
            });
            
            if (searchResult.books.length > 0) {
              foundBook = true;
              break;
            }
            
            // Try a fallback query if available
            attempt++;
            if (attempt < 3) {
              // Use a fallback query
              currentQuery = `${fallbackQueries[i % fallbackQueries.length]} ${attempt === 1 ? 'book' : 'novel'}`;
              console.log(`Trying fallback query for ${query}: ${currentQuery}`);
            }
          } catch (err) {
            console.error(`Search attempt ${attempt + 1} failed for ${currentQuery}:`, err);
            attempt++;
            // Try a different fallback on error
            if (attempt < 3) {
              currentQuery = `${fallbackQueries[(i + attempt) % fallbackQueries.length]}`;
            }
          }
        }
        
        if (!foundBook || !searchResult || searchResult.books.length === 0) {
          addResult(`Google Book ${i + 1}`, false, `No results found for "${query}" or fallbacks`);
          continue;
        }
        
        // Get the first book's details
        const bookItem = searchResult.books[0];
        const bookDetails = await googleBooksProvider.getBookDetails(bookItem.id);
        
        // Mark as part of series if applicable
        bookDetails.isPartOfSeries = SERIES_DEFINITIONS.some(series => 
          series.searchTerms.some(term => 
            bookDetails.title.toLowerCase().includes(term.toLowerCase())
          )
        );
      
        // Assign reading status based on index (for 300 books total - 5 reading, 270 completed, 25 want-to-read)
        // First 3 books as reading (3 out of 5 total reading books)
        // Last 15 as want-to-read (15 out of 25 total want-to-read books)
        // All others as completed
        let status: 'reading' | 'completed' | 'want-to-read' = 'completed';
        
        if (i < 3) {
          status = 'reading';
        } else if (i >= GOOGLE_BOOK_SEARCHES.length - 15) {
          status = 'want-to-read';
        }
        
        const completedDate = status === 'completed' ? getRandomCompletionDate() : undefined;
        let rating: number | undefined;
        
        if (status === 'completed') {
          rating = Math.floor(Math.random() * 5) + 1;
        } else if (status === 'reading') {
          if (Math.random() > 0.5) {
            rating = Math.floor(Math.random() * 5) + 1;
          }
        }

        // Ensure required fields are set with correct types
        const bookToSave = {
          ...bookDetails,
          status,
          completedDate,
          rating,
          isPartOfSeries: bookDetails.isPartOfSeries || false,
          spineColor: bookDetails.spineColor || Math.floor(Math.random() * 8) + 1,
          addedDate: bookDetails.addedDate || new Date().toISOString()
        };
        
        // Save to IndexedDB
        const bookId = await enhancedStorageService.saveBook(bookToSave);
        const addedBook = { ...bookToSave, id: bookId };
        books.push(addedBook);
        
        addResult(`Google Book ${i + 1}`, true, `Added "${addedBook.title}" by ${addedBook.author}`);
        
        // Update progress
        setProgress(5 + (i + 1) * (45 / GOOGLE_BOOK_SEARCHES.length));
        
      } catch (error) {
        console.error(`Error adding Google book ${i + 1}:`, error);
        addResult(`Google Book ${i + 1}`, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    setAllBooks(prev => [...prev, ...books]);
    return books;
  }

  // Add books from Open Library API with reading status distribution
  async function addBooksFromOpenLibrary() {
    addResult("Open Library API", true, "Adding books from Open Library API...");
    const books: Book[] = [];
    
    // Fallback queries to try if the original query fails
    const fallbackQueries = [
      "Crime and Punishment", "Anna Karenina", "Don Quixote", "The Odyssey",
      "Les Misérables", "The Brothers Karamazov", "Wuthering Heights", "Catch-22",
      "The Catcher in the Rye", "The Great Expectations", "Frankenstein", "Dracula"
    ];
    
    for (let i = 0; i < OPEN_LIBRARY_BOOK_SEARCHES.length; i++) {
      try {
        const { query, type } = OPEN_LIBRARY_BOOK_SEARCHES[i];
        let foundBook = false;
        let attempt = 0;
        let currentQuery = query;
        let searchResult;
        
        // Try original query and fallbacks if needed
        while (!foundBook && attempt < 3) {
          try {
            // Search for the book
            searchResult = await openLibraryProvider.searchBooks({
              query: currentQuery,
              type: type as any,
              limit: 1
            });
            
            if (searchResult.books.length > 0) {
              foundBook = true;
              break;
            }
            
            // Try a fallback query if available
            attempt++;
            if (attempt < 3) {
              // Use a fallback query
              currentQuery = `${fallbackQueries[i % fallbackQueries.length]} ${attempt === 1 ? 'book' : 'novel'}`;
              console.log(`Trying fallback query for ${query}: ${currentQuery}`);
            }
          } catch (err) {
            console.error(`Search attempt ${attempt + 1} failed for ${currentQuery}:`, err);
            attempt++;
            // Try a different fallback on error
            if (attempt < 3) {
              currentQuery = `${fallbackQueries[(i + attempt) % fallbackQueries.length]}`;
            }
          }
        }
        
        if (!foundBook || !searchResult || searchResult.books.length === 0) {
          addResult(`Open Library Book ${i + 1}`, false, `No results found for "${query}" or fallbacks`);
          continue;
        }
        
        // Get the first book's details
        const bookItem = searchResult.books[0];
        const bookDetails = await openLibraryProvider.getBookDetails(bookItem.id);
        
        // Mark as part of series if applicable
        bookDetails.isPartOfSeries = SERIES_DEFINITIONS.some(series => 
          series.searchTerms.some(term => 
            bookDetails.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        
        // Assign reading status based on index (for 300 books total - 5 reading, 270 completed, 25 want-to-read)
        // Next 2 books as reading (2 out of 5 total reading books, with 3 from Google Books)
        // Last 10 as want-to-read (10 out of 25 total want-to-read books, with 15 from Google Books)
        // All others as completed
        let status: 'reading' | 'completed' | 'want-to-read' = 'completed';
        
        if (i < 2) {
          status = 'reading';
        } else if (i >= OPEN_LIBRARY_BOOK_SEARCHES.length - 10) {
          status = 'want-to-read';
        }
        
        const completedDate = status === 'completed' ? getRandomCompletionDate() : undefined;
        let rating: number | undefined;
        
        if (status === 'completed') {
          rating = Math.floor(Math.random() * 5) + 1;
        } else if (status === 'reading') {
          if (Math.random() > 0.5) {
            rating = Math.floor(Math.random() * 5) + 1;
          }
        }

        // Ensure required fields are set with correct types
        const bookToSave = {
          ...bookDetails,
          status,
          completedDate,
          rating,
          isPartOfSeries: bookDetails.isPartOfSeries || false,
          spineColor: bookDetails.spineColor || Math.floor(Math.random() * 8) + 1,
          addedDate: bookDetails.addedDate || new Date().toISOString()
        };
        
        // Save to IndexedDB
        const bookId = await enhancedStorageService.saveBook(bookToSave);
        const addedBook = { ...bookToSave, id: bookId };
        books.push(addedBook);
        
        addResult(`Open Library Book ${i + 1}`, true, `Added "${addedBook.title}" by ${addedBook.author}`);
        
        // Update progress
        setProgress(50 + (i + 1) * (40 / OPEN_LIBRARY_BOOK_SEARCHES.length));
        
      } catch (error) {
        console.error(`Error adding Open Library book ${i + 1}:`, error);
        addResult(`Open Library Book ${i + 1}`, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    setAllBooks(prev => [...prev, ...books]);
    return books;
  }

  // Create series and assign books to them
  async function createAndAssignSeries() {
    addResult("Series Creation", true, "Creating series and assigning books...");
    const allBooks = await enhancedStorageService.getBooks();
    const newSeriesMap: Record<string, string[]> = {};
    
    for (const seriesDef of SERIES_DEFINITIONS) {
      try {
        // Find books that belong to this series
        const seriesBooks = allBooks.filter(book => 
          seriesDef.searchTerms.some(term => 
            book.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        
        if (seriesBooks.length === 0) {
          addResult(`Series: ${seriesDef.name}`, false, `No books found for series "${seriesDef.name}"`);
          continue;
        }
        
        // Create the series
        const newSeries = await seriesService.createSeries({
          name: seriesDef.name,
          author: seriesDef.author,
          description: seriesDef.description,
          books: seriesBooks.map(book => book.id),
          genre: seriesDef.genre,
          status: seriesDef.status as any,
          readingOrder: 'publication',
          totalBooks: seriesBooks.length,
          coverImage: seriesBooks[0].thumbnail,
          isTracked: true,
          hasUpcoming: false
        });
        
        newSeriesMap[newSeries.id] = seriesBooks.map(book => book.id);
        
        // Update the books to reference the series
        for (const book of seriesBooks) {
          await enhancedStorageService.saveBook({
            ...book,
            isPartOfSeries: true
          });
        }
        
        addResult(`Series: ${seriesDef.name}`, true, `Created series "${seriesDef.name}" with ${seriesBooks.length} books`);
        
      } catch (error) {
        console.error(`Error creating series ${seriesDef.name}:`, error);
        addResult(`Series: ${seriesDef.name}`, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    setSeriesMap(newSeriesMap);
  }

  // Verify data consistency
  async function verifyData() {
    try {
      // Check that all books are in the database
      const books = await enhancedStorageService.getBooks();
      const series = await seriesService.getAllSeries();
      
      addResult("Data Verification", true, 
        `Successfully verified data: ${books.length} books and ${series.length} series in the database`);
    } catch (error) {
      addResult("Data Verification", false, 
        `Data verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Run the complete workflow test
  async function runWorkflowTest() {
    setRunning(true);
    setResults([]);
    setProgress(0);
    
    try {
      // Clear previous data
      addResult("Database Reset", true, "Clearing previous test data...");
      await enhancedStorageService.initialize();
      
      // Clear all books
      const existingBooks = await enhancedStorageService.getBooks();
      for (const book of existingBooks) {
        if (book.id) {
          await enhancedStorageService.deleteBook(book.id);
        }
      }
      
      // Clear all series
      const existingSeries = await seriesService.getAllSeries();
      for (const series of existingSeries) {
        await seriesService.deleteSeries(series.id);
      }
      
      // Initialize storage
      addResult("Initialization", true, "Starting workflow test...");
      
      // Step 1: Add books from Google Books API
      setProgress(5);
      await addBooksFromGoogleAPI();
      
      // Step 2: Add books from Open Library API
      setProgress(50);
      await addBooksFromOpenLibrary();
      
      // Step 3: Create series and assign books
      setProgress(90);
      await createAndAssignSeries();
      
      // Final step: Verify data
      setProgress(95);
      await verifyData();
      
      setProgress(100);
      addResult("Complete", true, "Workflow test completed successfully!");
      
    } catch (error) {
      console.error("Workflow test failed:", error);
      addResult("Error", false, `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  // Add UI rendering code
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Workflow Tester</h1>
      <p className="mb-4 text-muted-foreground">
        Tests the complete workflow of adding books, creating series, and verifying data.
      </p>
      
      <Button 
        onClick={runWorkflowTest} 
        disabled={running}
        className="mb-4"
      >
        {running ? 'Running...' : 'Run Workflow Test'}
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
                <Alert key={index} variant={result.success ? "default" : "destructive"}>
                  <div className="flex items-start gap-2">
                    {result.success ? <Check className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5" />}
                    <div>
                      <AlertTitle className="flex items-center gap-2">
                        {result.step}
                        {result.success ? 
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge> : 
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>
                        }
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
  );
}

export default WorkflowTester;
