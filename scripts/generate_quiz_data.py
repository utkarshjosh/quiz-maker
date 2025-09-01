#!/usr/bin/env python3
import os
import json
import uuid
import random
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from tqdm import tqdm
import nltk
import spacy
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from collections import defaultdict
import string
from collections import Counter

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('averaged_perceptron_tagger')

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import subprocess
    print("Downloading spaCy model...")
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], check=True)

# Define major categories and their related keywords
MAJOR_CATEGORIES = {
    'Science': ['science', 'technology', 'physics', 'chemistry', 'biology', 'mathematics'],
    'Entertainment': ['movies', 'television', 'music', 'video-games', 'celebrities'],
    'History': ['history', 'historical', 'ancient', 'medieval', 'modern'],
    'Geography': ['geography', 'world', 'countries', 'cities', 'places'],
    'Sports': ['sports', 'athletics', 'games', 'olympics', 'players'],
    'Literature': ['literature', 'books', 'authors', 'poetry', 'novels'],
    'Knowledge': ['general', 'knowledge', 'facts', 'information', 'trivia'],
    'Nature': ['animals', 'plants', 'environment', 'biology', 'earth']
}

def parse_trivia_file(file_path: str) -> List[Dict[str, Any]]:
    """Parse a trivia file and return a list of question dictionaries."""
    questions = []
    current_question = None
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('#Q'):
                # Save previous question if exists
                if current_question and current_question.get('options'):
                    questions.append(current_question)
                # Start new question
                current_question = {
                    'question': line[3:].strip(),
                    'options': [],
                    'correctAnswer': None,
                    'correct_text': None
                }
            elif line.startswith('^') and current_question:
                current_question['correct_text'] = line[2:].strip()
            elif line.startswith(('A', 'B', 'C', 'D')) and current_question:
                option_text = line[2:].strip()
                option_id = str(len(current_question['options']))
                current_question['options'].append({
                    'id': option_id,
                    'text': option_text
                })
                # Only set correctAnswer if we have the correct_text
                if current_question.get('correct_text') and option_text == current_question['correct_text']:
                    current_question['correctAnswer'] = option_id
        
        # Don't forget to add the last question
        if current_question and current_question.get('options'):
            # If we somehow missed setting the correct answer, use the first option
            if current_question['correctAnswer'] is None and current_question['options']:
                current_question['correctAnswer'] = '0'
                current_question['correct_text'] = current_question['options'][0]['text']
            questions.append(current_question)
    
    # Filter out any questions that don't have a correct answer
    valid_questions = [q for q in questions if q['correctAnswer'] is not None]
    return valid_questions

def determine_tags(question: str, file_name: str) -> List[str]:
    """Determine tags for a question based on content and file name."""
    # Start with the file name as a tag
    tags = [file_name]
    
    # Tokenize and analyze question text
    tokens = word_tokenize(question.lower())
    pos_tags = nltk.pos_tag(tokens)
    
    # Extract nouns as potential tags
    nouns = [word for word, pos in pos_tags if pos.startswith('NN')]
    
    # Add relevant nouns as tags
    tags.extend(nouns[:3])  # Limit to top 3 nouns
    
    return list(set(tags))  # Remove duplicates

def extract_key_phrases(questions: List[Dict[str, Any]], tags: List[str]) -> List[str]:
    """Extract meaningful key phrases from questions using spaCy."""
    # Combine all question texts
    all_text = ' '.join([q['question'] for q in questions])
    
    # Process text with spaCy
    doc = nlp(all_text)
    
    # Extract noun phrases and named entities
    key_phrases = []
    
    # Get noun phrases (chunks)
    for chunk in doc.noun_chunks:
        # Clean and normalize the phrase
        phrase = ' '.join(token.text.lower() for token in chunk if not token.is_stop and len(token.text) > 2)
        if phrase:
            key_phrases.append(phrase)
    
    # Get named entities
    for ent in doc.ents:
        if ent.label_ in ['ORG', 'PERSON', 'GPE', 'LOC', 'EVENT', 'WORK_OF_ART', 'PRODUCT']:
            key_phrases.append(ent.text.lower())
    
    # Add important single nouns that aren't part of phrases
    nouns = [token.text.lower() for token in doc if token.pos_ == "NOUN" 
             and not token.is_stop and len(token.text) > 2]
    key_phrases.extend(nouns)
    
    # Add relevant tags
    key_phrases.extend([tag.lower() for tag in tags if len(tag) > 2])
    
    # Count frequencies and get most common phrases
    phrase_counts = Counter(key_phrases)
    common_phrases = [phrase for phrase, count in phrase_counts.most_common(5)
                     if count > 1 and len(phrase.split()) <= 3]  # Limit phrase length
    
    return common_phrases

def generate_title_and_description(questions: List[Dict[str, Any]], major_category: str, tags: List[str]) -> tuple[str, str]:
    """Generate a title and description for a quiz based on its questions, category, and tags."""
    # Extract key phrases
    key_phrases = extract_key_phrases(questions, tags)
    
    # Generate title
    if key_phrases:
        # Select up to 2 most relevant phrases
        selected_phrases = key_phrases[:2]
        # Capitalize each word in the phrases
        formatted_phrases = [' '.join(word.capitalize() for word in phrase.split()) 
                           for phrase in selected_phrases]
        
        if len(formatted_phrases) > 1:
            topic_terms = f"{formatted_phrases[0]} and {formatted_phrases[1]}"
        else:
            topic_terms = formatted_phrases[0]
            
        title = f"{major_category} Quiz: {topic_terms}"
    else:
        title = f"{major_category} Quiz Challenge"
    
    # Generate description
    num_questions = len(questions)
    difficulty_levels = {
        'easy': num_questions // 3,
        'medium': num_questions // 3,
        'hard': num_questions - (2 * (num_questions // 3))
    }
    
    tag_phrase = ', '.join(tags[:3]) if len(tags) > 1 else tags[0] if tags else ''
    description = (
        f"Test your {major_category.lower()} knowledge with this comprehensive quiz! "
        f"Features {num_questions} questions covering {tag_phrase}. "
        f"Includes {difficulty_levels['easy']} easy, {difficulty_levels['medium']} medium, "
        f"and {difficulty_levels['hard']} challenging questions. "
        f"Can you achieve a passing score of 70%?"
    )
    
    return title, description

def determine_major_category(tags: List[str], question: str) -> str:
    """Determine the major category for a question based on tags and content."""
    text = ' '.join([question.lower()] + [t.lower() for t in tags])
    
    # Score each category based on keyword matches
    scores = defaultdict(int)
    for category, keywords in MAJOR_CATEGORIES.items():
        for keyword in keywords:
            if keyword.lower() in text:
                scores[category] += 1
    
    # Return the category with highest score, or 'Knowledge' as default
    if scores:
        return max(scores.items(), key=lambda x: x[1])[0]
    return 'Knowledge'

def create_quiz(questions: List[Dict[str, Any]], quiz_id: int) -> Dict[str, Any]:
    """Create a quiz object with metadata and settings."""
    selected_questions = random.sample(questions, min(15, len(questions)))
    
    # Collect all tags from selected questions
    all_tags = []
    for q in selected_questions:
        all_tags.extend(q.get('tags', []))
    
    # Determine major category based on most common tags
    major_category = determine_major_category(all_tags, ' '.join([q['question'] for q in selected_questions]))
    
    # Create final tags list with major category first
    tags = [major_category] + list(set(all_tags))[:5]  # Limit to 5 additional tags
    
    # Generate title and description
    title, description = generate_title_and_description(selected_questions, major_category, tags)
    
    return {
        'id': f'quiz_{quiz_id}',
        'title': title,
        'description': description,
        'questions': [
            {
                'id': f'q{i+1}',
                'type': 'MULTIPLE_CHOICE',
                'question': q['question'],
                'options': q['options'],
                'correctAnswer': q['correctAnswer'],
                'points': 10,
                'explanation': f"The correct answer is: {q['correct_text']}"
            }
            for i, q in enumerate(selected_questions)
        ],
        'settings': {
            'randomizeQuestions': True,
            'randomizeOptions': True,
            'showExplanation': True,
            'showCorrectAnswer': True,
            'passingScore': 70,
            'allowNavigation': True,
            'showProgressBar': True,
            'showTimeRemaining': True
        },
        'metadata': {
            'totalPoints': len(selected_questions) * 10,
            'estimatedDuration': len(selected_questions) * 2,  # 2 minutes per question
            'difficultyDistribution': {
                'easy': len(selected_questions) // 3,
                'medium': len(selected_questions) // 3,
                'hard': len(selected_questions) - (2 * (len(selected_questions) // 3))
            },
            'tags': tags
        }
    }

def main():
    # Path to OpenTriviaQA categories
    categories_path = 'OpenTriviaQA/categories'
    output_dir = 'generated_quizzes'
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Collect all questions
    all_questions = []
    
    print("Processing trivia files...")
    for filename in os.listdir(categories_path):
        file_path = os.path.join(categories_path, filename)
        if os.path.isfile(file_path):
            print(f"Processing {filename}...")
            questions = parse_trivia_file(file_path)
            
            # Add tags to questions
            for q in questions:
                q['tags'] = determine_tags(q['question'], filename)
            
            all_questions.extend(questions)
    
    print(f"Total questions collected: {len(all_questions)}")
    
    # Generate quizzes (100 questions per file)
    questions_per_file = 100
    num_quizzes = len(all_questions) // questions_per_file + 1
    
    print(f"Generating {num_quizzes} quiz files...")
    for i in range(num_quizzes):
        start_idx = i * questions_per_file
        end_idx = start_idx + questions_per_file
        file_questions = all_questions[start_idx:end_idx]
        
        if not file_questions:
            continue
        
        quizzes = []
        num_quizzes_in_file = len(file_questions) // 15  # 15 questions per quiz
        
        for j in range(num_quizzes_in_file):
            quiz = create_quiz(file_questions[j*15:(j+1)*15], j)
            quizzes.append(quiz)
        
        # Save to file
        output_file = os.path.join(output_dir, f'quiz_data_{i+1}.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({'quizzes': quizzes}, f, indent=2)
        
        print(f"Generated {output_file} with {len(quizzes)} quizzes")

if __name__ == '__main__':
    main() 