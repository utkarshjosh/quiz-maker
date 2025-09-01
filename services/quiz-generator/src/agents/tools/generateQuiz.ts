import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import { v4 as uuidv4 } from 'uuid';
import SYSTEM_PROMPTS from '../prompts/system';

const generateQuizSchema = z.object({
  topic: z.string().describe('The topic for the quiz'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Quiz difficulty level'),
  numQuestions: z.number().min(1).max(50).describe('Number of questions to generate'),
  timeLimit: z.number().min(1).max(300).describe('Time limit in minutes'),
  requirements: z.string().describe('Additional requirements or specifications for the quiz').optional()
});

interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  category?: string;
}

interface QuizData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  questions: QuizQuestion[];
}

interface Quiz extends QuizData {
  id: string;
  topic: string;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
}

interface GenerateQuizResult {
  success: boolean;
  quiz?: Quiz;
  error?: string;
  message: string;
}

export const generateQuizTool = tool(
  async ({ topic, difficulty = 'medium', numQuestions = 10, timeLimit = 60, requirements }): Promise<GenerateQuizResult> => {
    try {
      const llm = new ChatGroq({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.7,
        apiKey: process.env.GROQ_API_KEY
      });

      const prompt = SYSTEM_PROMPTS.QUIZ_GENERATION
        .replace('{topic}', topic)
        .replace('{difficulty}', difficulty)
        .replace('{numQuestions}', numQuestions.toString())
        .replace('{timeLimit}', timeLimit.toString());

      const additionalContext = requirements ? `\n\nAdditional Requirements: ${requirements}` : '';
      const fullPrompt = prompt + additionalContext;

      const response = await llm.invoke(fullPrompt);
      
      // Parse the response to extract JSON
      let quizData: QuizData;
      try {
        const content = response.content as string;
        // Try to find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quizData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing quiz JSON:', parseError);
        // Fallback structure
        quizData = {
          title: `${topic} Quiz`,
          description: `A ${difficulty} difficulty quiz about ${topic}`,
          difficulty: difficulty,
          timeLimit: timeLimit,
          questions: []
        };
      }

      // Add metadata
      const quiz: Quiz = {
        id: uuidv4(),
        ...quizData,
        topic: topic,
        totalQuestions: quizData.questions?.length || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        quiz: quiz,
        message: `Generated ${quiz.totalQuestions} questions for "${topic}" quiz`
      };

    } catch (error) {
      console.error('Error in generateQuiz tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate quiz'
      };
    }
  },
  {
    name: 'generate_quiz',
    description: 'Generate a comprehensive quiz on a given topic with specified difficulty and number of questions',
    schema: generateQuizSchema
  }
); 