/** "1 frame" / "3 frames" for stack counts. */
export function frameCount(frames) {
  return `${frames.length}${frames.length === 1 ? ' frame' : ' frames'}`;
}
