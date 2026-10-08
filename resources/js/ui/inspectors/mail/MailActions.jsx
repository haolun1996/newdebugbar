import { useRef, useState } from 'react';
import { cx } from '../../../app/hooks.js';
import { Icon } from '../../components/Icon.jsx';
import { PopoverSurface } from '../../components/PopoverSurface.jsx';
import { useClickOutside } from '../../shell/useClickOutside.js';

const MENU_ITEM =
  'ndb:flex ndb:h-auto ndb:min-h-11 ndb:w-full ndb:items-center ndb:gap-3 ndb:rounded-lg ndb:bg-transparent ndb:px-3 ndb:py-2 ndb:text-left ndb:text-zinc-700 ndb:transition-colors ndb:hover:bg-zinc-100 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-200 ndb:dark:hover:bg-white/10';
const MENU_LINK =
  'ndb:flex ndb:h-auto ndb:min-h-11 ndb:w-full ndb:items-center ndb:gap-3 ndb:rounded-lg ndb:bg-transparent ndb:px-3 ndb:py-2 ndb:text-left ndb:text-zinc-700 ndb:no-underline ndb:transition-colors ndb:hover:bg-zinc-100 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-200 ndb:dark:hover:bg-white/10';
const INDIGO_ICON =
  'ndb:flex ndb:size-8 ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-lg ndb:bg-indigo-50 ndb:text-indigo-600 ndb:dark:bg-indigo-950/60 ndb:dark:text-indigo-300';

function MenuLabel({ title, description }) {
  return (
    <span className="ndb:min-w-0">
      <span className="ndb:block ndb:text-xs ndb:font-bold">{title}</span>
      <span className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:text-zinc-400">{description}</span>
    </span>
  );
}

/** The selected message's overflow menu: related profile, preview in a new tab, and .EML download. */
export function MailActions({ message, previewUrl, onOpenRelated }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const details = useClickOutside(() => {
    if (details.current) details.current.open = false;
  });
  const close = () => {
    if (details.current) details.current.open = false;
  };
  const hasPreview = message.has_html || message.has_text;

  return (
    <details
      ref={details}
      data-ndb-mail-actions=""
      hidden={!(hasPreview || message.related_profile_id)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        event.preventDefault();
        close();
        trigger.current?.focus();
      }}
      className="ndb:relative ndb:m-0 ndb:shrink-0 ndb:border-0 ndb:bg-transparent ndb:p-0"
    >
      <summary
        ref={trigger}
        data-ndb-mail-actions-trigger=""
        aria-expanded={open}
        aria-controls="newdebugbar-mail-actions-menu"
        aria-haspopup="menu"
        aria-label="Mail actions"
        title="Mail actions"
        className={cx(
          'ndb:flex ndb:size-8 ndb:cursor-pointer ndb:list-none ndb:items-center ndb:justify-center ndb:rounded-lg ndb:border ndb:transition-colors ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500',
          open
            ? 'ndb:border-indigo-300 ndb:bg-indigo-50 ndb:text-indigo-700 ndb:dark:border-indigo-700 ndb:dark:bg-indigo-950/50 ndb:dark:text-indigo-300'
            : 'ndb:border-zinc-200 ndb:bg-white/75 ndb:text-zinc-600 ndb:hover:bg-zinc-100 ndb:hover:text-zinc-950 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-900/75 ndb:dark:text-zinc-300 ndb:dark:hover:bg-zinc-800 ndb:dark:hover:text-white',
        )}
      >
        <Icon name="ellipsis" size={4} />
      </summary>

      <PopoverSurface
        id="newdebugbar-mail-actions-menu"
        direction="below"
        widthClass="ndb:w-64"
        arrowClass="ndb:right-[8px]"
        data-ndb-mail-actions-menu=""
        role="menu"
        aria-label="Mail actions"
      >
        <button
          data-ndb-mail-open-related=""
          hidden={!message.related_profile_id}
          onClick={() => {
            close();
            onOpenRelated();
          }}
          type="button"
          role="menuitem"
          className={MENU_ITEM}
        >
          <span className={INDIGO_ICON}>
            <Icon name="external-link" size={4} />
          </span>
          <MenuLabel title={message.related_label} description="Follow the linked queue activity" />
        </button>
        <a
          data-ndb-mail-open-preview=""
          href={previewUrl ?? undefined}
          hidden={!hasPreview}
          onClick={close}
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          className={MENU_LINK}
        >
          <span className={INDIGO_ICON}>
            <Icon name="external-link" size={4} />
          </span>
          <MenuLabel title="Open preview" description="Open the rendered message in a new tab" />
        </a>
        <a
          data-ndb-mail-download=""
          href={message.eml_url ?? undefined}
          hidden={!message.eml_url}
          onClick={close}
          role="menuitem"
          className={MENU_LINK}
        >
          <span className="ndb:flex ndb:size-8 ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-lg ndb:bg-emerald-50 ndb:text-emerald-600 ndb:dark:bg-emerald-950/60 ndb:dark:text-emerald-300">
            <Icon name="download" size={4} />
          </span>
          <MenuLabel title="Download .EML" description="Save the raw captured message" />
        </a>
      </PopoverSurface>
    </details>
  );
}
