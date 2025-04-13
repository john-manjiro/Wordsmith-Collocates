"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeCollocations } from "@/ai/flows/analyze-collocations";
// Assuming generateExampleSentences is used elsewhere or will be used later
// import { generateExampleSentences } from "@/ai/flows/generate-example-sentences";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast"; // Correctly importing the hook
import { Toaster } from "@/components/ui/toaster"; // For rendering the toasts

// Custom hook for managing state in localStorage
const useLocalStorage = (key: string, initialValue: string[]) => {
  const [storedValue, setStoredValue] = useState<string[]>(initialValue);

  // Effect to load initial value from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure running on the client
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error("Error reading from localStorage:", error);
        // Optionally reset to initialValue if parsing fails
        // setStoredValue(initialValue);
      }
    }
  }, [key]); // Only depends on the key

  // Effect to save value to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure running on the client
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error("Error writing to localStorage:", error);
      }
    }
  }, [key, storedValue]); // Depends on key and value

  return [storedValue, setStoredValue] as const;
};

// The main page component
export default function Home() {
  // --- State Definitions ---
  const [word, setWord] = useState("");
  const [collocations, setCollocations] = useState<
    { collocate: string; frequency: number; exampleSentences: string[] }[]
  >([]);
  const [history, setHistory] = useLocalStorage("searchHistory", []); // Using custom hook
  const [isLoading, setIsLoading] = useState(false);

  // --- Get the toast function from the hook ---
  const { toast } = useToast(); // <<<< CORRECT: Call the hook here

  // Helper function to clear collocations
  const setEmptyCollocations = useCallback(() => {
    setCollocations([]);
  }, []);

  // --- Search Handler ---
  const handleSearch = useCallback(async () => {
    const trimmedWord = word.trim(); // Trim the word once
    if (!trimmedWord) {
      // Use the 'toast' function obtained from the hook
      toast({
        title: "Error",
        description: "Please enter a word to search for.",
        variant: "destructive",
      });
      return; // Stop execution
    }

    setIsLoading(true); // Start loading indicator
    try {
      // Call the analysis function (ensure it exists and handles errors)
      const analysisResult = await analyzeCollocations({ word: trimmedWord });

      // Check if results are valid and not empty
      if (!analysisResult?.collocations || analysisResult.collocations.length === 0) {
        toast({
          title: "No Collocations Found",
          description: `No collocations found for the word "${trimmedWord}".`,
          variant: "default",
        });
        setEmptyCollocations(); // Clear previous results
        // Update history even if no collocations found? Optional. Currently only updated on success.
        // setHistory((prevHistory) => {
        //   const newHistory = [trimmedWord, ...prevHistory.filter((w) => w !== trimmedWord)].slice(0, 5);
        //   return newHistory;
        // });
        return; // Stop execution
      }

      // Set the found collocations
      setCollocations(analysisResult.collocations);

      // Update search history (add new word, remove duplicates, limit size)
      setHistory((prevHistory) => {
        const newHistory = [trimmedWord, ...prevHistory.filter((w) => w !== trimmedWord)].slice(0, 5); // Limit to 5 items
        return newHistory;
      });

      // Success notification
      toast({
        title: "Success",
        description: `Collocations found for "${trimmedWord}".`,
        // variant: "success", // Add if you have a success variant style
      });

    } catch (error: any) {
      // Error handling during the API call or processing
      console.error("Failed to analyze collocations:", error); // Log the actual error
      toast({
        title: "Error",
        description: error.message || "Failed to analyze collocations. Please try again.",
        variant: "destructive",
      });
      setEmptyCollocations(); // Clear results on error

    } finally {
      // Ensure loading indicator is turned off regardless of success or failure
      setIsLoading(false);
    }
  // <<< CORRECT: Add 'toast' to dependency array along with other dependencies >>>
  }, [word, setEmptyCollocations, setHistory, toast]);

  // Handler for clicking on a word in the history list
  const handleHistoryClick = (historicWord: string) => {
    setWord(historicWord);
    // Optional: Automatically trigger search when history item is clicked
    // handleSearch(); // Be mindful of triggering this if handleSearch doesn't depend on 'word' directly in its deps array (it does here, so it's okay but potentially triggers twice if state update is slow)
  };

  // --- JSX Rendering ---
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-12 px-4 bg-background text-foreground">
      <Toaster /> {/* Renders the toasts managed by useToast */}
      <h1 className="text-3xl md:text-5xl font-bold text-primary mb-6 text-center">
        Word Collocation Finder
      </h1>

      {/* Input and Search Button Area */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-lg mb-8">
        <Input
          type="text"
          placeholder="Enter a word (e.g., 'strong')"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="flex-grow" // Takes available space
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // Allow Enter key to search
        />
        <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? "Analyzing..." : "Find Collocations"}
        </Button>
      </div>

      {/* Results Area */}
      <div className="w-full max-w-4xl mb-8">
        {/* Show results only if not loading and collocations exist */}
        {!isLoading && collocations.length > 0 && (
          <Card className="shadow-lg border border-border">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">
                Collocations for "{/* Display the searched word safely */}
                {collocations.length > 0 ? word : ''}":
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {/* Consider ScrollArea if results can be very long */}
              {/* <ScrollArea className="h-[400px]"> */}
              <ul className="space-y-4">
                {collocations.map((collocation, index) => (
                  <li key={index} className="border-b border-border pb-3 last:border-b-0">
                    <p className="font-semibold text-lg text-primary">
                      {collocation.collocate}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (Frequency: {collocation.frequency})
                      </span>
                    </p>
                    {/* Render example sentences if they exist */}
                    {collocation.exampleSentences && collocation.exampleSentences.length > 0 && (
                       <ul className="list-disc list-inside pl-2 mt-1 space-y-1">
                          {collocation.exampleSentences.map((sentence, sentenceIndex) => (
                           <li key={sentenceIndex} className="text-sm text-muted-foreground">
                             {sentence}
                            </li>
                          ))}
                        </ul>
                    )}
                  </li>
                ))}
              </ul>
              {/* </ScrollArea> */}
            </CardContent>
          </Card>
        )}
        {/* Optionally show a message when loading or if no results after search */}
        {isLoading && <p className="text-center text-muted-foreground">Loading results...</p>}
        {/* Consider a message if search completed but no results (handled by toast now) */}
        {/* {!isLoading && collocations.length === 0 && word && <p>No results found.</p>} */}
      </div>

      {/* Search History Area */}
      <div className="w-full max-w-lg">
        <Card className="shadow-md border border-border">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Search History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40"> {/* Fixed height for scroll */}
              {history.length > 0 ? (
                <div className="flex flex-col space-y-2">
                  {history.map((historicWord, index) => (
                    <Button
                      key={index}
                      variant="ghost" // Use ghost or outline for less emphasis
                      className="justify-start text-left h-auto py-2" // Adjust padding/height
                      onClick={() => handleHistoryClick(historicWord)}
                      title={`Search for "${historicWord}"`} // Tooltip
                    >
                      {historicWord}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No search history yet.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}