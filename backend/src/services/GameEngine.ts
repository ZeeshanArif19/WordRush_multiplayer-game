import { LetterFeedback, LetterStatus } from '@wordle/shared';

/**
 * Pure function to evaluate a guess against a target word.
 * 
 * Logic handles duplicate letters correctly:
 * If the target is "APPLE" and guess is "PUPPY":
 * - The 'P' at index 2 is 'correct' (green).
 * - The 'P' at index 0 is 'present' (yellow).
 * - The 'P' at index 3 is 'absent' (gray) because we ran out of available 'P's in the target.
 */
export function evaluateGuess(guess: string, targetWord: string): LetterFeedback[] {
  const guessUpper = guess.toUpperCase();
  const targetUpper = targetWord.toUpperCase();
  
  const result: LetterFeedback[] = Array(guessUpper.length).fill(null).map((_, i) => ({
    letter: guessUpper[i],
    status: 'absent' // Default to absent
  }));

  // Keep track of which letters in the target word have been "used up"
  const targetLetterPool: (string | null)[] = targetUpper.split('');

  // First Pass: Find all the 'correct' (Green) matches
  for (let i = 0; i < guessUpper.length; i++) {
    if (guessUpper[i] === targetUpper[i]) {
      result[i].status = 'correct';
      targetLetterPool[i] = null; // Mark this target letter as used
    }
  }

  // Second Pass: Find 'present' (Yellow) matches
  for (let i = 0; i < guessUpper.length; i++) {
    // Skip if it was already marked as correct
    if (result[i].status === 'correct') continue;

    const letter = guessUpper[i];
    const targetIndex = targetLetterPool.indexOf(letter);

    // If the letter exists in the remaining pool
    if (targetIndex !== -1) {
      result[i].status = 'present';
      targetLetterPool[targetIndex] = null; // Mark it as used so we don't double count
    }
  }

  return result;
}

/**
 * Pure function to check if a guess is a winning guess.
 */
export function isWinningGuess(feedback: LetterFeedback[]): boolean {
  return feedback.every(letter => letter.status === 'correct');
}

/**
 * Pure function to check if the game is over due to running out of attempts.
 */
export function isGameOver(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}

/**
 * Pure function to validate guess format.
 * Here we just check length, but you could expand this to check against a dictionary API.
 */
export function isValidGuessFormat(guess: string, expectedLength: number): boolean {
  return guess.length === expectedLength && /^[a-zA-Z]+$/.test(guess);
}
