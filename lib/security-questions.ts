import bcrypt from "bcryptjs";

// A fallback way to prove who you are and reset your password without an email — mainly for accounts that signed
// up with only a phone number. Weaker than a real second factor (an answer can sometimes be guessed or looked up),
// so it exists alongside the email reset link, not instead of it, and every attempt is rate-limited.
export const SECURITY_QUESTIONS = [
  "What year were you born?",
  "What city were you born in?",
  "What was the name of your first pet?",
  "What was the name of your first school?",
  "What is your mother's maiden name?",
] as const;

// Case and extra spacing shouldn't matter, but the exact wording should.
const normalize = (answer: string) => answer.trim().toLowerCase().replace(/\s+/g, " ");

export const hashSecurityAnswer = (answer: string) => bcrypt.hash(normalize(answer), 12);
export const verifySecurityAnswer = (answer: string, hash: string) => bcrypt.compare(normalize(answer), hash);
