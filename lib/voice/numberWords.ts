const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/**
 * 1 → "One", 42 → "Forty-two". Speech engines read digits inconsistently
 * ("1" can come out as "one" or "first"), so we spell reps out.
 */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1000) return String(n);
  let words: string;
  if (n < 20) words = ONES[n];
  else if (n < 100) words = TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  else words = ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberToWords(n % 100).toLowerCase() : "");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
