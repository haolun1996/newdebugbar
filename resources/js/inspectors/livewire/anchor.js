/**
 * Places a fixed floating box under its reference, like Alpine's `x-anchor.bottom-start.fixed`: it flips above
 * when that overflows the viewport less, then shifts horizontally to keep `padding` pixels from the edges.
 */
export function anchorPosition(reference, floating, viewport, placement = 'bottom-start', padding = 5) {
  const below = viewport.height - (reference.bottom + floating.height);
  const above = reference.top - floating.height;
  const y = below < 0 && above > below ? above : reference.bottom;
  const x = placement.endsWith('-end') ? reference.right - floating.width : reference.left;
  const maxX = viewport.width - floating.width - padding;

  return { x: Math.max(padding, Math.min(x, maxX)), y };
}
