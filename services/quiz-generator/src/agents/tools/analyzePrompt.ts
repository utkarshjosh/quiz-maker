import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import SYSTEM_PROMPTS from '../prompts/system';

const analyzePromptSchema = z.object({
  topic: z.string().describe('The topic to analyze'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Target difficulty level'),
  focusArea: z.string().describe('Specific area to focus the analysis on').optional()
});

interface SubtopicAnalysis {
  subtopic: string;
  description: string;
  importance: string;
  suggestedQuestions: string;
  questionTypes: string[];
}

interface AnalysisResult {
  success: boolean;
  analysis?: {
    topic: string;
    difficulty: string;
    focusArea?: string;
    subtopics: SubtopicAnalysis[];
    totalSubtopics: number;
    analyzedAt: string;
  };
  error?: string;
  message: string;
}

export const analyzePromptTool = tool(
  async ({ topic, difficulty = 'medium', focusArea }): Promise<AnalysisResult> => {
    try {
      const llm = new ChatGroq({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.5,
        apiKey: process.env.GROQ_API_KEY
      });

      const prompt = SYSTEM_PROMPTS.TOPIC_ANALYSIS
        .replace('{topic}', topic)
        .replace('{difficulty}', difficulty);

      const additionalContext = focusArea ? `\n\nFocus Area: ${focusArea}` : '';
      const fullPrompt = prompt + additionalContext;

      const response = await llm.invoke(fullPrompt);
      
      // Parse the response to extract JSON
      let analysisData: SubtopicAnalysis[];
      try {
        const content = response.content as string;
        // Try to find JSON array in the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON array found in response');
        }
      } catch (parseError) {
        console.error('Error parsing analysis JSON:', parseError);
        // Fallback structure
        analysisData = [{
          subtopic: topic,
          description: `General knowledge about ${topic}`,
          importance: '8',
          suggestedQuestions: '10',
          questionTypes: ['multiple-choice']
        }];
      }

      return {
        success: true,
        analysis: {
          topic: topic,
          difficulty: difficulty,
          focusArea: focusArea,
          subtopics: analysisData,
          totalSubtopics: analysisData.length,
          analyzedAt: new Date().toISOString()
        },
        message: `Analyzed "${topic}" into ${analysisData.length} subtopics`
      };

    } catch (error) {
      console.error('Error in analyzePrompt tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to analyze prompt'
      };
    }
  },
  {
    name: 'analyze_prompt',
    description: 'Analyze a topic and break it down into subtopics for quiz generation',
    schema: analyzePromptSchema
  }
); 