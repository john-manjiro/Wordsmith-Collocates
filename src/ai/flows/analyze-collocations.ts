// analyze-collocations.ts
'use server';

/**
 * @fileOverview Analyzes user input to find relevant and statistically significant collocations.
 *
 * - analyzeCollocations - A function that handles the collocation analysis process.
 * - AnalyzeCollocationsInput - The input type for the analyzeCollocations function.
 * - AnalyzeCollocationsOutput - The return type for the analyzeCollocations function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeCollocationsInputSchema = z.object({
  word: z.string().describe('The word to find collocations for.'),
});
export type AnalyzeCollocationsInput = z.infer<typeof AnalyzeCollocationsInputSchema>;

const AnalyzeCollocationsOutputSchema = z.object({
  collocations: z.array(
    z.object({
      collocate: z.string().describe('The collocate.'),
      frequency: z.number().describe('The frequency of the collocate with the input word.'),
      exampleSentences: z.array(z.string()).describe('Example sentences using the collocate with the input word.'),
    })
  ).describe('The statistically significant and contextually relevant collocations for the input word.'),
});
export type AnalyzeCollocationsOutput = z.infer<typeof AnalyzeCollocationsOutputSchema>;

export async function analyzeCollocations(input: AnalyzeCollocationsInput): Promise<AnalyzeCollocationsOutput> {
  return analyzeCollocationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCollocationsPrompt',
  input: {
    schema: z.object({
      word: z.string().describe('The word to find collocations for.'),
    }),
  },
  output: {
    schema: z.object({
      collocations: z.array(
        z.object({
          collocate: z.string().describe('The collocate.'),
          frequency: z.number().describe('The frequency of the collocate with the input word.'),
          exampleSentences: z.array(z.string()).describe('Example sentences using the collocate with the input word.'),
        })
      ).describe('The statistically significant and contextually relevant collocations for the input word.'),
    }),
  },
  prompt: `You are a linguistic expert. Find statistically significant and contextually relevant collocations for the word: {{{word}}}. Return an array of JSON objects. Each object should have the following properties:

- collocate: The collocate.
- frequency: The frequency of the collocate with the input word.
- exampleSentences: Example sentences using the collocate with the input word.

Make sure that the example sentences clearly show how the words are used together.
`,
});

const analyzeCollocationsFlow = ai.defineFlow<
  typeof AnalyzeCollocationsInputSchema,
  typeof AnalyzeCollocationsOutputSchema
>({
  name: 'analyzeCollocationsFlow',
  inputSchema: AnalyzeCollocationsInputSchema,
  outputSchema: AnalyzeCollocationsOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
