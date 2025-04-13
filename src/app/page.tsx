"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeCollocations } from "@/ai/flows/analyze-collocations";
import { generateExampleSentences } from "@/ai/flows/generate-example-sentences";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const useLocalStorage = (key: string, initialValue: string[]) => {
  const [storedValue, setStoredValue] = useState<string[]>(initialValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if(item)
          setStoredValue(JSON.parse(item))
      } catch (error) {
        console.error("Error reading from localStorage:", error);
      }
    }
  }, [key]);

    useEffect(() => {
    try {      
      if (typeof window !== 'undefined')
        window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
};

export default function Home() {
  const [word, setWord] = useState("");
  const [collocations, setCollocations] = useState<
    { collocate: string; frequency: number; exampleSentences: string[] }[]
  >([]);
  const [history, setHistory] = useLocalStorage("searchHistory", []);
  const [isLoading, setIsLoading] = useState(false);

  const setEmptyCollocations = useCallback(() => {
    setCollocations([]);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!word.trim()) {
      toast({
        title: "Error",
        description: "Please enter a word to search for.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const analysisResult = await analyzeCollocations({ word });
      if (!analysisResult?.collocations || analysisResult.collocations.length === 0) {
         toast({
           title: "No Collocations Found",
           description: `No collocations found for the word "${word}".`,
           variant: "warning",
         });
        setEmptyCollocations();
        return;
      }

      setCollocations(analysisResult.collocations);
      setHistory((prevHistory) => {
        const newHistory = [word, ...prevHistory.filter((w) => w !== word)].slice(0, 5);
        return newHistory;
      });
       toast({
         title: "Success",
         description: `Collocations found for "${word}".`,
       });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze collocations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [word, setEmptyCollocations, setHistory]);

  const handleHistoryClick = (historicWord: string) => {
    setWord(historicWord);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-12 bg-background">
      <Toaster />
      <h1 className="text-3xl md:text-5xl font-bold text-primary mb-6">
        WordSmith Collocate
      </h1>

      <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-4xl px-4">
        <Input
          type="text"
          placeholder="Enter a word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="flex-grow md:max-w-[300px]"
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? "Analyzing..." : "Find Collocations"}
        </Button>
      </div>

      <div className="mt-8 w-full max-w-4xl px-4">
        {collocations.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>
                Collocations for "{word}":
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul>
                {collocations.map((collocation, index) => (
                  <li key={index} className="mb-4">
                    <p className="font-semibold text-lg text-accent">
                      {collocation.collocate} ({collocation.frequency})
                    </p>
                    {collocation.exampleSentences.map((sentence, sentenceIndex) => (
                      <p key={sentenceIndex} className="text-sm text-muted-foreground">
                        - {sentence}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8 w-full max-w-4xl px-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Search History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <div className="flex flex-col">
                {history.map((historicWord, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start mb-2"
                    onClick={() => handleHistoryClick(historicWord)}
                  >
                    {historicWord}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
