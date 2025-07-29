// Question Types
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',      // Single correct answer
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',      // Multiple correct answers
  ORDER_SEQUENCE = 'ORDER_SEQUENCE',        // Order options in correct sequence
  TRUE_FALSE = 'TRUE_FALSE',               // True/False questions
  FILL_IN_BLANK = 'FILL_IN_BLANK',         // Fill in the blank
  MATCH_PAIRS = 'MATCH_PAIRS',             // Match items from two columns
}

// Media Types that can be attached to questions
export interface QuestionMedia {
  type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
  duration?: number;  // For video/audio in seconds
  thumbnailUrl?: string; // For video
}

// Base interface for all question types
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  points: number;
  timeLimit?: number;  // Time limit in seconds for this specific question
  media?: QuestionMedia[];
  tags?: string[];     // Additional tags for question categorization
}

// Multiple Choice Question
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: QuestionType.MULTIPLE_CHOICE;
  options: {
    id: string;
    text: string;
    media?: QuestionMedia;
  }[];
  correctAnswer: string;  // ID of the correct option
}

// Multiple Select Question
export interface MultipleSelectQuestion extends BaseQuestion {
  type: QuestionType.MULTIPLE_SELECT;
  options: {
    id: string;
    text: string;
    media?: QuestionMedia;
  }[];
  correctAnswers: string[];  // IDs of correct options
  minSelections?: number;    // Minimum selections required
  maxSelections?: number;    // Maximum selections allowed
}

// Order Sequence Question
export interface OrderSequenceQuestion extends BaseQuestion {
  type: QuestionType.ORDER_SEQUENCE;
  items: {
    id: string;
    text: string;
    media?: QuestionMedia;
  }[];
  correctOrder: string[];  // IDs in correct order
}

// True/False Question
export interface TrueFalseQuestion extends BaseQuestion {
  type: QuestionType.TRUE_FALSE;
  correctAnswer: boolean;
}

// Fill in the Blank Question
export interface FillInBlankQuestion extends BaseQuestion {
  type: QuestionType.FILL_IN_BLANK;
  correctAnswers: string[];  // Multiple possible correct answers
  caseSensitive: boolean;    // Whether answer is case sensitive
  allowPartialMatch: boolean; // Whether partial matches are accepted
}

// Match Pairs Question
export interface MatchPairsQuestion extends BaseQuestion {
  type: QuestionType.MATCH_PAIRS;
  pairs: {
    id: string;
    left: {
      text: string;
      media?: QuestionMedia;
    };
    right: {
      text: string;
      media?: QuestionMedia;
    };
  }[];
}

// Union type for all question types
export type QuizQuestion = 
  | MultipleChoiceQuestion 
  | MultipleSelectQuestion 
  | OrderSequenceQuestion 
  | TrueFalseQuestion 
  | FillInBlankQuestion 
  | MatchPairsQuestion;

// Quiz Data Structure
export interface QuizData {
  questions: QuizQuestion[];
  settings: {
    randomizeQuestions: boolean;      // Whether to randomize question order
    randomizeOptions: boolean;        // Whether to randomize option order
    showExplanation: boolean;         // Show explanation after each question
    showCorrectAnswer: boolean;       // Show correct answer after each question
    passingScore: number;            // Minimum score to pass (percentage)
    allowNavigation: boolean;        // Allow going back to previous questions
    showProgressBar: boolean;        // Show progress bar during quiz
    showTimeRemaining: boolean;      // Show time remaining during quiz
  };
  metadata: {
    totalPoints: number;             // Total possible points
    estimatedDuration: number;       // Estimated duration in minutes
    difficultyDistribution: {        // Distribution of question difficulties
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

// Quiz Response Structure
export interface QuizResponse {
  questionId: string;
  type: QuestionType;
  answer: string | string[] | boolean;  // Different types based on question type
  timeSpent: number;                    // Time spent on this question in seconds
  isCorrect?: boolean;                  // Whether the answer was correct
  pointsEarned?: number;               // Points earned for this question
}

// Quiz Result Structure
export interface QuizResult {
  quizId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  totalTimeSpent: number;              // Total time spent in seconds
  responses: QuizResponse[];
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  passed: boolean;
} 