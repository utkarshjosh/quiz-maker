#!/usr/bin/env python3
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any
from datasets import load_dataset
import random

def generate_uuid() -> str:
    return str(uuid.uuid4())

def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace and normalizing quotes."""
    return text.strip().replace('"', '"').replace('"', '"')

def get_primary_tag_for_subject(subject: str) -> str:
    """Map MMLU subjects to our primary tags."""
    subject_mapping = {
        'abstract_algebra': 'Mathematics',
        'anatomy': 'Science',
        'astronomy': 'Science',
        'business_ethics': 'Professional',
        'clinical_knowledge': 'Science',
        'college_biology': 'Science',
        'college_chemistry': 'Science',
        'college_computer_science': 'Technology',
        'college_mathematics': 'Mathematics',
        'college_medicine': 'Science',
        'college_physics': 'Science',
        'computer_security': 'Technology',
        'conceptual_physics': 'Science',
        'econometrics': 'Professional',
        'electrical_engineering': 'Technology',
        'elementary_mathematics': 'Mathematics',
        'formal_logic': 'Mathematics',
        'global_facts': 'General Knowledge',
        'high_school_biology': 'Science',
        'high_school_chemistry': 'Science',
        'high_school_computer_science': 'Technology',
        'high_school_european_history': 'History',
        'high_school_geography': 'General Knowledge',
        'high_school_government_and_politics': 'Social Sciences',
        'high_school_macroeconomics': 'Professional',
        'high_school_mathematics': 'Mathematics',
        'high_school_microeconomics': 'Professional',
        'high_school_physics': 'Science',
        'high_school_psychology': 'Social Sciences',
        'high_school_statistics': 'Mathematics',
        'high_school_us_history': 'History',
        'high_school_world_history': 'History',
        'human_sexuality': 'Science',
        'international_law': 'Professional',
        'jurisprudence': 'Professional',
        'logical_fallacies': 'Social Sciences',
        'machine_learning': 'Technology',
        'management': 'Professional',
        'marketing': 'Professional',
        'medical_genetics': 'Science',
        'miscellaneous': 'General Knowledge',
        'moral_disputes': 'Social Sciences',
        'moral_scenarios': 'Social Sciences',
        'nutrition': 'Science',
        'philosophy': 'Arts',
        'prehistory': 'History',
        'professional_accounting': 'Professional',
        'professional_law': 'Professional',
        'professional_medicine': 'Professional',
        'professional_psychology': 'Professional',
        'public_relations': 'Professional',
        'security_studies': 'Professional',
        'sociology': 'Social Sciences',
        'us_foreign_policy': 'History',
        'virology': 'Science',
        'world_religions': 'History',
    }
    return subject_mapping.get(subject, 'General Knowledge')

def get_secondary_tags(subject: str, question_count: int) -> List[str]:
    """Get appropriate secondary tags based on subject and quiz characteristics."""
    tags = []
    
    # Add difficulty tag
    if 'elementary' in subject or 'high_school' in subject:
        tags.append('Beginner')
    elif 'college' in subject:
        tags.append('Intermediate')
    elif 'professional' in subject:
        tags.append('Advanced')
    else:
        tags.append(random.choice(['Beginner', 'Intermediate', 'Advanced']))

    # Add format tag
    tags.append('Multiple Choice')

    # Add time-based tag based on question count
    if question_count <= 10:
        tags.append('Quick Quiz')
    else:
        tags.append('Comprehensive')

    # Add subject-specific secondary tags
    subject_specific_tags = {
        # Science subjects
        'anatomy': ['Medical', 'Biology'],
        'biology': ['Biology'],
        'chemistry': ['Chemistry'],
        'physics': ['Physics'],
        'astronomy': ['Astronomy'],
        'medical_genetics': ['Medical', 'Biology', 'Genetics'],
        'virology': ['Medical', 'Biology', 'Virology'],
        'nutrition': ['Health', 'Biology'],
        
        # Technology subjects
        'computer_science': ['Computer Science', 'Programming'],
        'computer_security': ['Computer Science', 'Cybersecurity'],
        'machine_learning': ['Computer Science', 'AI'],
        'electrical_engineering': ['Engineering'],
        
        # Mathematics subjects
        'abstract_algebra': ['Pure Mathematics'],
        'statistics': ['Statistics', 'Data Analysis'],
        'mathematics': ['Mathematics'],
        
        # Professional subjects
        'business_ethics': ['Business', 'Ethics'],
        'management': ['Business', 'Management'],
        'marketing': ['Business', 'Marketing'],
        'professional_accounting': ['Business', 'Accounting'],
        'econometrics': ['Economics', 'Statistics'],
        'macroeconomics': ['Economics'],
        'microeconomics': ['Economics'],
        'professional_law': ['Legal', 'Law'],
        'international_law': ['Legal', 'Law', 'International'],
        'jurisprudence': ['Legal', 'Law'],
        'professional_medicine': ['Medical', 'Clinical'],
        'clinical_knowledge': ['Medical', 'Clinical'],
        'professional_psychology': ['Psychology', 'Clinical'],
        'public_relations': ['Business', 'Communications'],
        
        # Social Sciences
        'sociology': ['Sociology'],
        'psychology': ['Psychology'],
        'moral_disputes': ['Ethics', 'Philosophy'],
        'moral_scenarios': ['Ethics', 'Philosophy'],
        'logical_fallacies': ['Logic', 'Philosophy'],
        
        # History subjects
        'prehistory': ['Ancient History'],
        'us_history': ['American History'],
        'world_history': ['World History'],
        'european_history': ['European History'],
        'us_foreign_policy': ['Political Science', 'American History'],
        
        # Other subjects
        'world_religions': ['Religion', 'Culture'],
        'philosophy': ['Philosophy'],
        'geography': ['Geography'],
        'security_studies': ['Political Science', 'International Relations']
    }
    
    # Find matching tags based on subject name
    for subject_key, specific_tags in subject_specific_tags.items():
        if subject_key in subject.lower():
            tags.extend(specific_tags)
            break
    
    # Remove duplicates while preserving order
    return list(dict.fromkeys(tags))

def create_quiz_from_questions(
    questions: List[Dict],
    subject: str,
    user_id: str,
    quiz_number: int
) -> tuple:
    """Create a quiz from a set of questions."""
    
    # Sample 10-15 questions
    num_questions = min(len(questions), random.randint(10, 15))
    selected_questions = random.sample(questions, num_questions)
    
    quiz_questions = []
    total_points = 0
    
    for i, q in enumerate(selected_questions):
        question_id = f"q{i+1}"
        options = q['choices']
        correct_idx = q['answer']
        
        points = 10
        question_data = {
            "id": question_id,
            "type": "MULTIPLE_CHOICE",
            "question": clean_text(q['question']),
            "explanation": f"The correct answer is: {clean_text(options[correct_idx])}",
            "points": points,
            "options": [
                {"id": str(i), "text": clean_text(opt)} for i, opt in enumerate(options)
            ],
            "correctAnswer": str(correct_idx)
        }
        quiz_questions.append(question_data)
        total_points += points

    quiz_id = generate_uuid()
    
    # Get appropriate tags
    primary_tag = get_primary_tag_for_subject(subject)
    secondary_tags = get_secondary_tags(subject, len(quiz_questions))
    all_tags = [primary_tag] + secondary_tags
    
    # Create quiz title
    subject_name = subject.replace('_', ' ').title()
    title = f"{subject_name} Quiz #{quiz_number}"
    
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
            "estimatedDuration": len(quiz_questions) * 2,  # 2 minutes per question
            "difficultyDistribution": {
                "easy": len(quiz_questions) // 3,
                "medium": len(quiz_questions) // 3,
                "hard": len(quiz_questions) - (2 * (len(quiz_questions) // 3))
            },
            "tags": all_tags  # Store tags in metadata
        }
    }

    quiz_record = {
        "id": quiz_id,
        "user_id": user_id,
        "title": title,
        "description": f"Test your knowledge of {subject_name}",
        "difficulty": "medium",
        "time_limit": len(quiz_questions) * 120,  # 120 seconds per question
        "total_questions": len(quiz_questions),
        "quiz_data": quiz_data,
        "status": "published",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "published_at": datetime.now(timezone.utc).isoformat(),
        "version": 1
    }
    
    return quiz_record

def main():
    # Load dataset
    print("Loading dataset from Hugging Face...")
    dataset = load_dataset("aptl26/mmlu_mcq")
    
    # User ID from our seed data
    user_id = "1ac7d213-c0ee-4461-8f52-6a42b8e2b343"
    
    quizzes = []
    quiz_count_per_subject = {}
    
    # Create quizzes for each subject
    for split_name in dataset.keys():
        if not split_name.startswith('mmlu__'):
            continue
            
        subject = split_name.replace('mmlu__', '')
        questions = list(dataset[split_name])
        
        # Create 2-3 quizzes per subject
        num_quizzes = random.randint(2, 3)
        for i in range(num_quizzes):
            quiz_count_per_subject[subject] = quiz_count_per_subject.get(subject, 0) + 1
            quiz = create_quiz_from_questions(
                questions,
                subject,
                user_id,
                quiz_count_per_subject[subject]
            )
            quizzes.append(quiz)
    
    # Save all data to JSON file
    print("Saving data to JSON files...")
    output_data = {
        "quizzes": quizzes
    }
    
    with open('quiz_large_seed_data.json', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Data generation complete!")
    print(f"Generated:")
    print(f"- {len(quizzes)} quizzes")
    print("\nSubject distribution:")
    for subject, count in quiz_count_per_subject.items():
        print(f"- {subject}: {count} quizzes")

if __name__ == "__main__":
    main() 