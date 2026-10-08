/** Pure presentation rules for inspectors without a specialized view. */

const LABEL_KEYS = ['model', 'name', 'event', 'level', 'operation'];

/** The first identifying field of an item, falling back to the inspector label (PHP's `??` chain). */
export function fallbackItemLabel(item, inspectorLabel) {
  for (const key of LABEL_KEYS) {
    const value = item?.[key];
    if (value !== null && value !== undefined)
      return typeof value === 'object' ? JSON.stringify(value) : value;
  }

  return inspectorLabel;
}

/** `json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)`: four spaces, escaped Unicode. */
export function prettyJson(value) {
  return (JSON.stringify(value, null, 4) ?? 'null').replace(
    /[\u007f-￿]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
