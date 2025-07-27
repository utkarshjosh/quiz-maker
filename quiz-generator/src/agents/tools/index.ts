import { generateQuizTool } from './generateQuiz';
import { analyzePromptTool } from './analyzePrompt';
import { saveQuizTool } from './saveQuiz';
import { getQuizTool } from './getQuiz';
import { tavilySearchTool } from './tavilySearch';
import { knowledgeSearchTool } from './knowledgeSearch';

// Export all tools for the agent
export const tools = [
  generateQuizTool,
  analyzePromptTool,
  saveQuizTool,
  getQuizTool,
  tavilySearchTool,
  knowledgeSearchTool
];

export {
  generateQuizTool,
  analyzePromptTool,
  saveQuizTool,
  getQuizTool,
  tavilySearchTool,
  knowledgeSearchTool
}; 