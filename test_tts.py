import os
import sys

# Add current directory to path so we can import from server
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import robust_generate_tts, SOUNDS_DIR

def test_words():
    words_to_test = ['roll', 'heart', 'walk', 'other', 'morning', 'afraid', 'without', 'stopped']
    rate = "+0%"
    
    print(f"Testing TTS generation for {len(words_to_test)} words...")
    
    if not os.path.exists(SOUNDS_DIR):
        os.makedirs(SOUNDS_DIR)
        
    results = []
    for word in words_to_test:
        filename = f"test_{word}_p0.mp3"
        filepath = os.path.join(SOUNDS_DIR, filename)
        
        # Remove if exists to ensure fresh test
        if os.path.exists(filepath):
            os.remove(filepath)
            
        print(f"Generating audio for '{word}'...")
        success, error = robust_generate_tts(word, filepath, rate)
        
        if success:
            file_size = os.path.getsize(filepath)
            print(f"  [SUCCESS] '{word}' generated. Size: {file_size} bytes")
            results.append((word, True, file_size))
        else:
            print(f"  [FAILURE] '{word}' failed: {error}")
            results.append((word, False, error))
            
    print("\n--- Test Summary ---")
    all_success = True
    for word, success, detail in results:
        status = "PASSED" if success else "FAILED"
        print(f"{word:12}: {status} ({detail})")
        if not success:
            all_success = False
            
    if all_success:
        print("\nAll tests passed!")
    else:
        print("\nSome tests failed.")

if __name__ == "__main__":
    test_words()
