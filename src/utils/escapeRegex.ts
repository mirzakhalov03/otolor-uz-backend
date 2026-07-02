/** Escapes regex metacharacters so user input is matched literally in $regex queries. */
export const escapeRegex = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
