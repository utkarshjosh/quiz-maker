import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Subtopic {
  subtopic: string;
  description: string;
  weight: number;
}

interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Quiz {
  id: string;
  title: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  questions: Question[];
  totalQuestions: number;
  createdAt: Date;
  tags: string[];
}

interface GenerateQuizParams {
  prompt: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  numQuestions?: number;
  timeLimit?: number;
}

class QuizGeneratorService {
  private model: string;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  async generateQuiz({ 
    prompt, 
    difficulty = 'medium', 
    numQuestions = 10, 
    timeLimit = 60 
  }: GenerateQuizParams): Promise<Quiz> {
    try {
      // Step 1: Analyze the prompt and create subtopics
      const subtopics = await this.analyzePrompt(prompt, difficulty);
      
      // Step 2: Generate questions for each subtopic
      const questions = await this.generateQuestions(subtopics, numQuestions, difficulty);
      
      // Step 3: Structure the quiz
      const quiz: Quiz = {
        id: uuidv4(),
        title: this.generateTitle(prompt),
        prompt: prompt,
        difficulty: difficulty,
        timeLimit: timeLimit,
        questions: questions,
        totalQuestions: questions.length,
        createdAt: new Date(),
        tags: this.extractTags(prompt)
      };

      // TODO: Save quiz to database
      // await this.saveQuiz(quiz);
      
      return quiz;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw new Error('Failed to generate quiz: ' + (error as Error).message);
    }
  }

  private async analyzePrompt(prompt: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<Subtopic[]> {
    const systemPrompt = `You are an expert quiz creator. Analyze the given topic and break it down into relevant subtopics for a ${difficulty} difficulty quiz. 

    Return a JSON array of subtopics with the following structure:
    [
      {
        "subtopic": "Subtopic name",
        "description": "Brief description of what this subtopic covers",
        "weight": number (1-10, how important this subtopic is)
      }
    ]

    Make sure the subtopics are relevant, comprehensive, and appropriate for the difficulty level.`;

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: ${prompt}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing subtopics:', error);
      // Fallback to basic subtopics
      return [
        {
          subtopic: prompt,
          description: `Questions about ${prompt}`,
          weight: 10
        }
      ];
    }
  }

  private async generateQuestions(
    subtopics: Subtopic[], 
    numQuestions: number, 
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<Question[]> {
    const systemPrompt = `You are an expert quiz creator. Generate high-quality multiple-choice questions based on the given subtopics.

    Requirements:
    - Difficulty level: ${difficulty}
    - Each question should have 4 options (A, B, C, D)
    - Only one correct answer per question
    - Include an explanation for the correct answer
    - Make questions challenging but fair
    - Avoid ambiguous or trick questions

    Return a JSON array with this structure:
    [
      {
        "question": "Question text",
        "options": {
          "A": "Option A text",
          "B": "Option B text", 
          "C": "Option C text",
          "D": "Option D text"
        },
        "correctAnswer": "A",
        "explanation": "Explanation of why this is correct",
        "subtopic": "Which subtopic this question belongs to",
        "difficulty": "${difficulty}"
      }
    ]`;

    const subtopicsText = subtopics.map(st => 
      `- ${st.subtopic}: ${st.description} (Weight: ${st.weight})`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Generate ${numQuestions} questions based on these subtopics:\n\n${subtopicsText}` 
        }
      ],
      temperature: 0.8,
      max_tokens: 4000
    });

    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      const questions = JSON.parse(content);
      
      // Add unique IDs to questions
      return questions.map((q: Omit<Question, 'id'>) => ({
        ...q,
        id: uuidv4()
      }));
    } catch (error) {
      console.error('Error parsing questions:', error);
      throw new Error('Failed to generate questions');
    }
  }

  private generateTitle(prompt: string): string {
    // Simple title generation based on prompt
    const words = prompt.split(' ');
    const titleWords = words.slice(0, 4).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    return titleWords.join(' ') + ' Quiz';
  }

  private extractTags(prompt: string): string[] {
    // Simple tag extraction - in production, this could be more sophisticated
    const words = prompt.toLowerCase().split(' ');
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return words
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Limit to 5 tags
  }

  // TODO: Implement database operations
  async saveQuiz(quiz: Quiz): Promise<void> {
    // Save to MongoDB
    console.log('TODO: Save quiz to database', quiz.id);
  }

  async getQuizById(quizId: string): Promise<Quiz | null> {
    // Retrieve from database
    console.log('TODO: Get quiz from database', quizId);
    return null;
  }
}

export default new QuizGeneratorService(); 