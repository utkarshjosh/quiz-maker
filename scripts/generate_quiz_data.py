#!/usr/bin/env python3
import json
import uuid
from collections import defaultdict
from typing import Dict, List, Tuple
from datetime import datetime, timezone
from datasets import load_dataset
import random

def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace and normalizing quotes."""
    return text.strip().replace('"', '"').replace('"', '"')

# Primary tag definitions
PRIMARY_TAGS = {
    "Science": {
        "icon": "TestTube",
        "color": "text-green-500",
        "description": "Scientific concepts and knowledge",
        "matches": ["physics", "chemistry", "biology", "astronomy"]
    },
    "Technology": {
        "icon": "Laptop",
        "color": "text-blue-500",
        "description": "Technology and computer science",
        "matches": ["computer", "engineering", "machine"]
    },
    "Mathematics": {
        "icon": "Calculator",
        "color": "text-purple-500",
        "description": "Mathematical concepts and problems",
        "matches": ["mathematics", "algebra", "calculus", "statistics"]
    },
    "History": {
        "icon": "Clock",
        "color": "text-amber-700",
        "description": "Historical events and figures",
        "matches": ["history", "world_history", "us_history"]
    },
    "Arts": {
        "icon": "Palette",
        "color": "text-pink-500",
        "description": "Arts and creative fields",
        "matches": ["art", "music", "literature", "philosophy"]
    },
    "Social Sciences": {
        "icon": "Users",
        "color": "text-orange-500",
        "description": "Study of human society",
        "matches": ["psychology", "sociology", "economics", "politics"]
    },
    "Professional": {
        "icon": "Briefcase",
        "color": "text-gray-700",
        "description": "Professional and career fields",
        "matches": ["business", "marketing", "management", "law", "medicine"]
    },
    "General Knowledge": {
        "icon": "Globe",
        "color": "text-indigo-500",
        "description": "General knowledge and trivia",
        "matches": ["general", "world", "culture", "geography"]
    }
}

# Secondary tag definitions
SECONDARY_TAGS = {
    "Difficulty": [
        {
            "name": "Beginner",
            "icon": "Star",
            "color": "text-green-400",
            "description": "Entry-level questions"
        },
        {
            "name": "Intermediate",
            "icon": "StarHalf",
            "color": "text-yellow-500",
            "description": "Medium difficulty questions"
        },
        {
            "name": "Advanced",
            "icon": "Stars",
            "color": "text-red-500",
            "description": "Challenging questions"
        }
    ],
    "Format": [
        {
            "name": "Multiple Choice",
            "icon": "ListChecks",
            "color": "text-blue-400",
            "description": "Questions with multiple choices"
        },
        {
            "name": "Quick Quiz",
            "icon": "Timer",
            "color": "text-purple-400",
            "description": "Short quizzes under 5 minutes"
        },
        {
            "name": "Comprehensive",
            "icon": "BookOpen",
            "color": "text-emerald-500",
            "description": "In-depth quizzes with detailed explanations"
        }
    ]
}

def analyze_dataset(dataset) -> Dict[str, List[str]]:
    """Analyze the MMLU dataset and print insights."""
    print("\n=== Dataset Analysis ===")
    
    # Count questions per category
    category_counts = defaultdict(int)
    question_samples = defaultdict(list)
    
    for split_name, data in dataset.items():
        if split_name.startswith('mmlu__'):
            cat_name = split_name.replace('mmlu__', '').replace('_', ' ').title()
            num_questions = len(data)
            category_counts[cat_name] = num_questions
            
            # Sample 2 random questions for insight
            if num_questions > 0:
                samples = random.sample(list(data), min(2, num_questions))
                question_samples[cat_name].extend(samples)
    
    # Print insights
    print("\nCategory Distribution:")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"- {cat}: {count} questions")
    
    print("\nSample Questions:")
    for cat, samples in question_samples.items():
        print(f"\n{cat}:")
        for i, q in enumerate(samples, 1):
            print(f"  {i}. Q: {q['question']}")
            print(f"     A: {q['choices'][q['answer']]}")
    
    return category_counts

def create_tags() -> List[dict]:
    """Create tag definitions without UUIDs."""
    tags = []
    
    # Create primary tags
    for name, data in PRIMARY_TAGS.items():
        tags.append({
            "name": name,
            "slug": name.lower().replace(' & ', '-').replace(' ', '-'),
            "isPrimary": True,
            "icon": data["icon"],
            "color": data["color"],
            "description": data["description"]
        })
    
    # Create secondary tags
    for category, tag_list in SECONDARY_TAGS.items():
        for tag in tag_list:
            tags.append({
                "name": tag["name"],
                "slug": tag["name"].lower().replace(' ', '-'),
                "isPrimary": False,
                "icon": tag["icon"],
                "color": tag["color"],
                "description": tag["description"]
            })
    
    return tags

def assign_tags_to_quiz(quiz_name: str, difficulty: str) -> List[str]:
    """Return tag names (not UUIDs) for a quiz."""
    assigned_tags = []
    
    # Assign primary tag based on quiz content
    quiz_lower = quiz_name.lower()
    for tag_name, tag_data in PRIMARY_TAGS.items():
        if any(match in quiz_lower for match in tag_data["matches"]):
            assigned_tags.append(tag_name)
            break
    
    # Always assign a difficulty tag
    difficulty_map = {
        "easy": "Beginner",
        "medium": "Intermediate",
        "hard": "Advanced"
    }
    assigned_tags.append(difficulty_map[difficulty])
    
    # Assign format tag based on quiz characteristics
    if len(quiz_name) < 30:
        assigned_tags.append("Quick Quiz")
    else:
        assigned_tags.append("Comprehensive")
    
    # Always add Multiple Choice tag since all questions are MCQ
    assigned_tags.append("Multiple Choice")
    
    return assigned_tags

def create_quiz_from_questions(
    questions,
    category: str,
    user_id: str
) -> dict:
    """Create a quiz with tag names (not UUIDs)."""
    
    # Convert questions to list and sample
    questions_list = list(questions)
    num_questions = random.randint(10, min(18, len(questions_list)))
    selected_questions = random.sample(questions_list, num_questions)
    
    quiz_questions = []
    total_points = 0
    
    for q in selected_questions:
        question_id = str(uuid.uuid4())
        options = q['choices']
        correct_idx = q['answer']
        
        question_data = {
            "id": question_id,
            "type": "MULTIPLE_CHOICE",
            "question": clean_text(q['question']),
            "explanation": f"The correct answer is: {clean_text(options[correct_idx])}",
            "points": 10,
            "options": [
                {"id": str(i), "text": clean_text(opt)} for i, opt in enumerate(options)
            ],
            "correctAnswer": str(correct_idx)
        }
        quiz_questions.append(question_data)
        total_points += 10
    
    quiz_id = str(uuid.uuid4())
    difficulty = "medium"  # Default difficulty - moved up here
    
    quiz_data = {
        "questions": quiz_questions,
        "settings": {
            "randomizeQuestions": True,
            "randomizeOptions": True,
            "showExplanation": True,
            "showCorrectAnswer": True,
            "passingScore": 70,
            "allowNavigation": True,
            "showProgressBar": True,
            "showTimeRemaining": True
        },
        "metadata": {
            "totalPoints": total_points,
            "estimatedDuration": len(quiz_questions) * 1,
            "difficultyDistribution": {
                "easy": 0,
                "medium": len(quiz_questions),
                "hard": 0
            },
            "tags": assign_tags_to_quiz(category, difficulty)  # Now difficulty is defined
        }
    }
    
    quiz_record = {
        "id": quiz_id,
        "userId": user_id,
        "title": f"{category} Quiz",
        "description": f"Test your knowledge of {category}",
        "difficulty": difficulty,
        "timeLimit": len(quiz_questions) * 60,
        "totalQuestions": len(quiz_questions),
        "quizData": quiz_data,
        "status": "published",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "publishedAt": datetime.now(timezone.utc).isoformat(),
        "version": 1
    }
    
    return quiz_record

def main():
    # Load dataset
    print("Loading MMLU dataset from Hugging Face...")
    dataset = load_dataset("aptl26/mmlu_mcq")
    
    # Analyze dataset and print insights
    category_counts = analyze_dataset(dataset)
    
    # Create tags
    print("\nCreating tags...")
    tags = create_tags()
    
    # Create quizzes
    print("Creating quizzes...")
    quizzes = []
    
    # Use a fixed user ID for now
    default_user_id = "1ac7d213-c0ee-4461-8f52-6a42b8e2b343"
    
    for split_name, data in dataset.items():
        if split_name.startswith('mmlu__'):
            category = split_name.replace('mmlu__', '').replace('_', ' ').title()
            quiz = create_quiz_from_questions(data, category, default_user_id)
            quizzes.append(quiz)
    
    # Save data
    print("\nSaving data to JSON files...")
    output_data = {
        "tags": tags,
        "quizzes": quizzes,
        "default_user_id": default_user_id
    }
    
    with open('quiz_seed_data.json', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print("\nData generation complete!")
    print(f"Generated:")
    print(f"- {len([t for t in tags if t['isPrimary']])} primary tags")
    print(f"- {len([t for t in tags if not t['isPrimary']])} secondary tags")
    print(f"- {len(quizzes)} quizzes")

if __name__ == "__main__":
    main() 