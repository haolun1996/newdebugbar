import { useEffect, useLayoutEffect, useRef } from 'react';
import { cx, useShell } from '../../../app/hooks.js';
import { Icon } from '../../components/Icon.jsx';
import { createMailPreviewFrame } from '../../../inspectors/mail-preview.js';
import { PENDING_MAIL_STATUSES } from '../../../inspectors/mail.js';

/** The sandboxed iframe; it only measures and scales itself while the mail preview is on screen. */
function MailPreviewFrame({ message, url, format, viewport, profileId }) {
  const shell = useShell();
  const active =
    shell.barVisible && shell.inspectorOpen && shell.selected === 'mail' && shell.summary.id === profileId;
  const frame = useRef(null);
  const controller = useRef(null);
  const latest = useRef({ active, format, viewport });
  const initialSettings = useRef(true);

  useLayoutEffect(() => {
    latest.current = { active, format, viewport };
  });

  useLayoutEffect(() => {
    const preview = createMailPreviewFrame(frame.current, {
      isActive: () => latest.current.active,
      settings: () => latest.current,
    });
    controller.current = preview;

    return () => {
      preview.disconnect();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) controller.current?.connect();
    else controller.current?.disconnect();
  }, [active]);

  useEffect(() => {
    if (initialSettings.current) {
      initialSettings.current = false;

      return;
    }

    controller.current?.reset();
  }, [format, viewport]);

  return (
    <div
      data-ndb-mail-preview-canvas=""
      className={cx(
        'ndb:relative ndb:mx-auto ndb:h-80 ndb:w-full ndb:flex-1 ndb:overflow-hidden ndb:transition-[max-width]',
        format === 'html' && viewport === 'mobile' ? 'ndb:max-w-[23.4375rem]' : 'ndb:max-w-none',
      )}
    >
      <iframe
        ref={frame}
        data-ndb-mail-preview-frame=""
        src={url ?? undefined}
        title={`Preview of ${message.subject}`}
        onLoad={() => controller.current?.resize()}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="ndb:absolute ndb:top-0 ndb:left-1/2 ndb:block ndb:h-80 ndb:w-full ndb:max-w-none ndb:origin-top ndb:box-border ndb:rounded-lg ndb:border ndb:border-zinc-200 ndb:bg-white ndb:shadow-sm"
      />
    </div>
  );
}

/** Preview tab: the rendered message, or why no preview exists yet. */
export function MailPreviewPanel({ message, url, format, viewport, profileId, onOpenRelated }) {
  const hasPreview = message.has_html || message.has_text;

  return (
    <div data-ndb-mail-detail-panel="preview" className="ndb:flex ndb:flex-col">
      <div
        data-ndb-mail-preview-surface=""
        className="ndb:flex ndb:bg-zinc-100/70 ndb:p-3 ndb:dark:bg-zinc-950/65"
      >
        {hasPreview ? (
          <MailPreviewFrame
            message={message}
            url={url}
            format={format}
            viewport={viewport}
            profileId={profileId}
          />
        ) : (
          <div className="ndb:m-auto ndb:flex ndb:min-h-80 ndb:w-full ndb:flex-col ndb:items-center ndb:justify-center ndb:rounded-lg ndb:border ndb:border-dashed ndb:border-zinc-300 ndb:bg-white/55 ndb:px-6 ndb:py-10 ndb:text-center ndb:dark:border-zinc-700 ndb:dark:bg-zinc-900/45">
            <span className="ndb:grid ndb:size-9 ndb:place-items-center ndb:rounded-xl ndb:bg-zinc-100 ndb:text-zinc-400 ndb:dark:bg-zinc-800">
              <Icon name="mail" size={4} />
            </span>
            <p className="ndb:mt-3 ndb:text-xs ndb:font-bold">
              {message.status === 'failed'
                ? 'The worker failed before a preview was created.'
                : 'The preview is created when the worker sends this message.'}
            </p>
            <p
              hidden={!PENDING_MAIL_STATUSES.includes(message.status)}
              className="ndb:mt-1 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
            >
              {message.status_label}
            </p>
            <button
              hidden={!message.related_profile_id}
              type="button"
              data-ndb-mail-related-profile=""
              onClick={onOpenRelated}
              className="ndb:mt-4 ndb:inline-flex ndb:h-9 ndb:items-center ndb:gap-2 ndb:rounded-lg ndb:bg-indigo-600 ndb:px-3 ndb:text-xs ndb:font-bold ndb:text-white ndb:transition ndb:hover:bg-indigo-500 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500"
            >
              <span>{message.related_label}</span>
              <Icon name="external-link" size={3.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
