import json
import os
import random

# Configuration
WORDS_PER_LEVEL = 20
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GAME_DIR = os.path.dirname(BASE_DIR)
OUTPUT_FILE = os.path.join(GAME_DIR, "words.json")

def load_words(filename):
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"Warning: {filename} not found.")
        return []
    with open(filepath, 'r') as f:
        # Filter empty lines and duplicates
        words = [line.strip().lower() for line in f if line.strip()]
        return sorted(list(set(words)))

def create_levels(grade_id, words):
    # Shuffle predictably for now (optional: remove seed for random)
    random.seed(42) 
    random.shuffle(words)
    
    levels = []
    chunked = [words[i:i + WORDS_PER_LEVEL] for i in range(0, len(words), WORDS_PER_LEVEL)]
    
    for i, chunk in enumerate(chunked):
        level_num = i + 1
        levels.append({
            "id": f"{grade_id}-{level_num}",
            "title": f"Level {level_num}",
            "words": sorted(chunk) # Sort words within level for readability? Or keep shuffled? Let's sort.
        })
    return levels

def main():
    print("Building words.json...")
    
    # 1. Load existing words.json to preserve titles and common words
    existing_data = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r') as f:
            try:
                existing_data = json.load(f)
            except:
                pass

    grades_data = existing_data.get('grades', {})
    
    # 2. Process Grades
    grade_files = {
        "3": "grade3.txt",
        "4": "grade4.txt",
        "5": "grade5.txt"
    }
    
    grade_titles = {
        "3": "Novice Wizard",
        "4": "Apprentice Wizard",
        "5": "Master Wizard"
    }

    new_grades = {}

    # maintain common words
    if "common" in grades_data:
        # Convert common to levels if not already? 
        # For now, let's keep common as a single level "Common-1" to unify logic
        common_words = grades_data["common"].get("words", [])
        if isinstance(common_words, list):
            new_grades["common"] = {
                "title": grades_data["common"].get("title", "Common Words"),
                "levels": create_levels("common", common_words)
            }
        else:
             # Already migrated?
             new_grades["common"] = grades_data["common"]

    for grade, filename in grade_files.items():
        words = load_words(filename)
        print(f"Grade {grade}: Loaded {len(words)} words.")
        
        # Merge with existing if any? 
        # Actually, let's just use the new lists as the source of truth for now, 
        # assuming they are comprehensive. 
        # If we wanted to keep old words, we'd merge them here.
        # old_words = grades_data.get(grade, {}).get('words', [])
        # words = list(set(words + old_words))
        
        levels = create_levels(grade, words)
        
        new_grades[grade] = {
            "title": grade_titles.get(grade, f"Grade {grade}"),
            "levels": levels
        }

    final_data = {"grades": new_grades}
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Successfully wrote to {OUTPUT_FILE}")
    print("Summary:")
    for g, data in new_grades.items():
        print(f"  Grade {g}: {len(data['levels'])} levels")

if __name__ == "__main__":
    main()
