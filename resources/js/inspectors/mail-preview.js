export const MAIL_PREVIEW_WIDTHS = {
  desktop: 1024,
  mobile: 375,
};

const MIN_HEIGHT = 320;
const MAX_HEIGHT = 100_000;

const isFrame = (frame) => typeof HTMLIFrameElement !== 'undefined' && frame instanceof HTMLIFrameElement;

/**
 * Sizes a sandboxed mail preview iframe. React owns the iframe element and its attributes; this controller
 * only writes the inline width, height, and scale styles that follow the previewed document.
 *
 * Options: isActive() (whether the preview is visible), settings() ({ format, viewport }), and nextFrame(callback).
 */
export function createMailPreviewFrame(frame, options = {}) {
  const isActive = options.isActive ?? (() => true);
  const settings = options.settings ?? (() => ({ format: 'html', viewport: 'desktop' }));
  const nextFrame = options.nextFrame ?? ((callback) => window.requestAnimationFrame(callback));
  let connected = false;
  let layoutScheduled = false;
  let canvasObserver = null;
  let bodyObserver = null;

  const canvas = () => frame.closest?.('[data-ndb-mail-preview-canvas]') ?? null;

  const layout = () => {
    if (!isFrame(frame)) return;

    const target = canvas();
    const availableWidth = target?.clientWidth ?? 0;
    if (!target || availableWidth <= 0) return;

    const { format, viewport } = settings();
    const fixedWidth = format === 'html' ? MAIL_PREVIEW_WIDTHS[viewport] : null;
    const frameWidth = fixedWidth ?? availableWidth;
    const scale = fixedWidth ? Math.min(1, availableWidth / fixedWidth) : 1;

    frame.style.setProperty('width', `${frameWidth}px`, 'important');
    frame.style.setProperty('transform', `translateX(-50%) scale(${scale})`, 'important');

    const frameHeight = frame.offsetHeight;
    if (frameHeight > 0) {
      target.style.setProperty('height', `${Math.ceil(frameHeight * scale)}px`, 'important');
    }
  };

  const scheduleLayout = () => {
    if (!connected || layoutScheduled) return;

    layoutScheduled = true;
    nextFrame(() => {
      layoutScheduled = false;
      if (connected) layout();
    });
  };

  const handleMessage = (event) => {
    if (event.source !== frame.contentWindow) return;

    if (event.data?.type === 'newdebugbar:mail-preview-scroll' && Number.isFinite(event.data.deltaY)) {
      const detail = frame.closest?.('[data-ndb-mail-detail]');
      if (!detail) return;

      const multiplier =
        event.data.deltaMode === 1 ? 16 : event.data.deltaMode === 2 ? detail.clientHeight : 1;
      detail.scrollBy({ top: event.data.deltaY * multiplier });

      return;
    }

    if (event.data?.type !== 'newdebugbar:mail-preview-height' || !Number.isFinite(event.data.height)) return;

    const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(event.data.height)));
    frame.style.setProperty('height', `${height}px`, 'important');
    layout();
  };

  const disconnect = () => {
    if (connected) window.removeEventListener('message', handleMessage);
    connected = false;
    canvasObserver?.disconnect?.();
    bodyObserver?.disconnect?.();
    canvasObserver = null;
    bodyObserver = null;
  };

  const connect = () => {
    if (!isActive() || frame?.isConnected === false || !isFrame(frame)) return;

    disconnect();
    connected = true;
    window.addEventListener('message', handleMessage);

    const target = canvas();
    if (target && typeof ResizeObserver === 'function') {
      canvasObserver = new ResizeObserver(scheduleLayout);
      canvasObserver.observe(target);
    }

    scheduleLayout();
  };

  /** Measures a readable document directly; sandboxed previews report their own height instead. */
  const resize = () => {
    if (!isActive() || frame?.isConnected === false || !isFrame(frame)) return;

    bodyObserver?.disconnect?.();
    bodyObserver = null;

    try {
      const frameDocument = frame.contentDocument;
      const body = frameDocument?.body;
      const root = frameDocument?.documentElement;

      if (body && root) {
        let scheduled = false;
        const measure = () => {
          scheduled = false;
          if (!isActive() || frame.isConnected === false) return;

          const height = Math.min(
            MAX_HEIGHT,
            Math.max(MIN_HEIGHT, body.scrollHeight, body.offsetHeight, root.scrollHeight, root.offsetHeight),
          );
          const currentHeight = Number.parseFloat(frame.style.height);
          if (!Number.isFinite(currentHeight) || Math.abs(currentHeight - height) > 1) {
            frame.style.setProperty('height', `${Math.ceil(height)}px`, 'important');
          }
          layout();
        };
        const scheduleMeasure = () => {
          if (scheduled) return;
          scheduled = true;
          nextFrame(measure);
        };

        if (typeof ResizeObserver === 'function') {
          bodyObserver = new ResizeObserver(scheduleMeasure);
          bodyObserver.observe(body);
        }

        scheduleMeasure();
      }
    } catch {
      // Sandboxed HTML previews report their own height through postMessage.
    }

    layout();
    frame.contentWindow?.postMessage({ type: 'newdebugbar:measure-mail-preview' }, '*');
  };

  /** Restarts sizing after the format or viewport changed. */
  const reset = () => {
    if (!isFrame(frame)) return;

    frame.style.setProperty('height', '20rem', 'important');
    resize();
  };

  return { connect, disconnect, layout, resize, reset };
}
