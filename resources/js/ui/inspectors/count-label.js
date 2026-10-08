/** Count labels shared by the queries, exceptions, validation, and fallback inspectors. */

/** Laravel's Str::plural for the nouns these inspectors count. */
export function plural(word, count) {
  if (Number(count) === 1) return word;

  return /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`;
}

/** `number_format($count).' '.Str::plural($word, $count)`. */
export function countLabel(count, word) {
  return `${Number(count).toLocaleString('en-US')} ${plural(word, count)}`;
}
