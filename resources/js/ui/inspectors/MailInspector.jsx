import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cx, useInspectorController, useShell } from '../../app/hooks.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { FilterTab } from '../components/FilterTab.jsx';
import { FilterTabs } from '../components/FilterTabs.jsx';
import { Icon } from '../components/Icon.jsx';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorDetailTabs } from '../components/InspectorDetailTabs.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { formatDuration } from '../../duration.js';
import {
  MAIL_DETAIL_TABS,
  MAIL_FILTERS,
  filterMailMessages,
  formatNumber,
  mailFilterOptions,
  mailHasSource,
  mailListActivity,
  mailPreviewFormat,
  mailPreviewUrl,
  mailRoutes,
  plural,
  presentMailMessages,
} from '../../inspectors/mail.js';
import { MailHeader } from './mail/MailHeader.jsx';
import { MailMessagePanel, MailSourcePanel } from './mail/MailMessageDetails.jsx';
import { MailPreviewPanel } from './mail/MailPreview.jsx';

const DETAIL_TABS = [
  ['preview', 'Preview', 'eye'],
  ['message', 'Message', 'mail'],
  ['source', 'Source', 'code'],
];

const VIEWPORTS = [
  ['desktop', 'Desktop preview', 'monitor'],
  ['mobile', 'Mobile preview', 'smartphone'],
];

/** The API base injected with the bar, so preview links follow the application's URL. */
function bootApiBase() {
  try {
    return JSON.parse(document.getElementById('newdebugbar-boot')?.textContent ?? 'null')?.api ?? undefined;
  } catch {
    return undefined;
  }
}

/** A fresh detail view for a message: the preview tab in its richest format. */
const detailView = (message, detailOpen) => ({
  selected: message?.execution ?? null,
  detailOpen,
  tab: 'preview',
  format: message?.has_html ? 'html' : 'text',
  viewport: 'desktop',
});

/** Captured mail as a selectable message list with an isolated preview and diagnostics. */
export function MailInspector({ inspector, profileId }) {
  const shell = useShell();
  const summary = inspector.summary ?? {};
  const messages = useMemo(
    () => presentMailMessages(inspector.payload?.items, profileId, mailRoutes(bootApiBase())),
    [inspector.payload?.items, profileId],
  );
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState(() => detailView(messages[0], false));
  const [focusRequest, setFocusRequest] = useState(0);
  const detail = useRef(null);
  const visible = useMemo(() => filterMailMessages(messages, filter, search), [messages, filter, search]);

  // Keep a visible message selected when filters or refreshed data hide the current one.
  const fallback = visible.some((message) => message.execution === view.selected)
    ? view.selected
    : (visible[0]?.execution ?? null);
  if (fallback !== view.selected) {
    setView(detailView(visible[0], view.detailOpen));
  }

  const message = messages.find((candidate) => candidate.execution === view.selected) ?? null;
  const format = mailPreviewFormat(message, view.format);
  const previewUrl = mailPreviewUrl(message, format);
  const hasSource = mailHasSource(message);

  useLayoutEffect(() => {
    detail.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [view.selected, view.tab]);

  useEffect(() => {
    if (focusRequest > 0) detail.current?.focus?.();
  }, [focusRequest]);

  useInspectorController('mail', profileId, {
    receiveIntent(intent) {
      const target = messages.find((candidate) => candidate.transport_message_id === intent?.messageId);
      if (!target) return;

      setFilter('all');
      setSearch('');
      setView(detailView(target, true));
      setFocusRequest((count) => count + 1);
    },
  });

  const select = (execution) => {
    const target = messages.find((candidate) => candidate.execution === execution);
    if (target) setView(detailView(target, true));
  };
  const setTab = (tab) => {
    if (!MAIL_DETAIL_TABS.includes(tab) || (tab === 'source' && !hasSource)) return;
    setView((current) => ({ ...current, tab }));
  };
  const setFormat = (next) => {
    if ((next === 'html' && !message?.has_html) || (next === 'text' && !message?.has_text)) return;
    setView((current) => ({ ...current, format: next }));
  };
  const setViewport = (viewport) => {
    if (format === 'text') return;
    setView((current) => ({ ...current, viewport }));
  };
  const close = () => setView((current) => ({ ...current, detailOpen: false }));
  const openRelated = () => shell.openRelatedProfile(message.related_profile_id, message.related_inspector);

  if (messages.length === 0) {
    return (
      <div
        data-ndb-mail=""
        className="ndb:space-y-4 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:lg:space-y-0"
      >
        <EmptyState label="No mail was sent or queued." />
      </div>
    );
  }

  const retained = Number(summary.retained_count ?? messages.length);
  const dropped = Number(summary.dropped_count ?? 0);

  return (
    <div
      data-ndb-mail=""
      className="ndb:space-y-4 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:lg:space-y-0"
    >
      <InspectorWorkspace frame="top" data-ndb-mail-workspace="">
        <InspectorListPanel
          detailOpen={view.detailOpen}
          controls={
            <InspectorListControls
              showSearch={messages.length > 5}
              leading={
                <p
                  data-ndb-mail-summary=""
                  className="ndb:min-w-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
                >
                  <span data-ndb-mail-summary-count="" className="ndb:block">
                    {formatNumber(retained)} {plural('message', retained)}
                  </span>
                  <span
                    data-ndb-mail-summary-runtime=""
                    className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:font-medium ndb:tabular-nums ndb:text-zinc-400"
                  >
                    {formatDuration(summary.duration_ms ?? 0)} total
                  </span>
                  {dropped > 0 ? (
                    <span className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:text-amber-600 ndb:dark:text-amber-300">
                      {formatNumber(dropped)} not retained
                    </span>
                  ) : null}
                </p>
              }
              search={
                <SearchField
                  label="Search captured mail"
                  placeholder="Search subject or recipient"
                  data-ndb-mail-search=""
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              }
              filter={
                <SelectField
                  label="Filter captured mail"
                  data-ndb-mail-filter=""
                  value={filter}
                  onChange={(event) =>
                    MAIL_FILTERS.includes(event.target.value) && setFilter(event.target.value)
                  }
                >
                  {mailFilterOptions(messages).map(([value, label, count]) => (
                    <option key={value} value={value}>
                      {`${label} (${count})`}
                    </option>
                  ))}
                </SelectField>
              }
            />
          }
          listProps={{ 'data-ndb-mail-list': '' }}
          list={visible.map((row) => {
            const selected = view.selected === row.execution;
            const activity = mailListActivity(row);

            return (
              <button
                key={row.execution}
                type="button"
                data-ndb-mail-item={row.execution}
                data-ndb-execution={row.execution}
                data-ndb-attachments={row.attachment_count > 0 ? 'true' : 'false'}
                data-ndb-search={row.search}
                onClick={() => select(row.execution)}
                aria-pressed={selected}
                className={cx(
                  'ndb:grid ndb:w-full ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-baseline ndb:gap-x-3 ndb:gap-y-1 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3',
                  selected
                    ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
                    : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
                )}
              >
                <span
                  data-ndb-mail-list-title=""
                  className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold"
                >
                  {row.subject}
                </span>
                <span
                  data-ndb-mail-list-status=""
                  className={cx('ndb:justify-self-end ndb:text-xs ndb:font-bold', row.status_text_class)}
                >
                  {row.status_label}
                </span>
                <span
                  data-ndb-mail-list-recipient=""
                  className="ndb:col-start-1 ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
                >
                  To {row.primary_recipient}
                </span>
                {activity !== null ? (
                  <span
                    data-ndb-mail-list-activity=""
                    className={cx(
                      'ndb:col-start-2 ndb:justify-self-end ndb:text-right ndb:text-xs ndb:font-semibold',
                      ['sent', 'failed'].includes(row.status)
                        ? 'ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400'
                        : 'ndb:text-zinc-400',
                    )}
                  >
                    {activity}
                  </span>
                ) : null}
              </button>
            );
          })}
          emptyProps={{ hidden: visible.length !== 0 }}
          empty={<EmptyState label="No mail matches these filters." />}
        />

        <InspectorDetailPane
          detailOpen={view.detailOpen}
          detailRef={detail}
          detailLabel="Selected mail details"
          backLabel="Messages"
          onClose={close}
          data-ndb-mail-detail=""
          back={<InspectorDetailBack data-ndb-mail-detail-back="" onClick={close} label="Messages" />}
        >
          {message ? (
            <div className="ndb:flex ndb:flex-col">
              <MailHeader
                message={message}
                previewUrl={previewUrl}
                onTab={setTab}
                onOpenRelated={openRelated}
              />

              <InspectorDetailTabs
                label="Mail detail"
                align="left"
                data-ndb-mail-detail-tabs=""
                asideProps={{
                  'data-ndb-mail-preview-controls': '',
                  hidden: !(view.tab === 'preview' && (message.has_html || message.has_text)),
                  className: 'ndb:flex ndb:items-center ndb:gap-2',
                }}
                aside={
                  <>
                    <FilterTabs
                      label="Mail preview width"
                      variant="segmented"
                      aria-disabled={format === 'text' ? true : undefined}
                      data-ndb-mail-preview-viewport-control=""
                    >
                      {VIEWPORTS.map(([viewport, label, icon]) => (
                        <FilterTab
                          key={viewport}
                          variant="segmented"
                          data-ndb-mail-preview-viewport={viewport}
                          onClick={() => setViewport(viewport)}
                          disabled={format === 'text'}
                          aria-pressed={view.viewport === viewport}
                          aria-label={label}
                          title={label}
                          className="ndb:size-7 ndb:p-0 ndb:disabled:pointer-events-none ndb:disabled:opacity-40"
                        >
                          <Icon name={icon} size={3} />
                        </FilterTab>
                      ))}
                    </FilterTabs>
                    <SelectField
                      label="Mail preview format"
                      hidden={!(message.has_html && message.has_text)}
                      data-ndb-mail-preview-format=""
                      value={format}
                      onChange={(event) => setFormat(event.target.value)}
                      className="ndb:w-20"
                    >
                      <option value="html" disabled={!message.has_html}>
                        HTML
                      </option>
                      <option value="text" disabled={!message.has_text}>
                        Text
                      </option>
                    </SelectField>
                  </>
                }
              >
                {DETAIL_TABS.map(([tab, label, icon]) => (
                  <FilterTab
                    key={tab}
                    variant="segmented"
                    data-ndb-mail-detail-tab={tab}
                    hidden={tab === 'source' && !hasSource}
                    onClick={() => setTab(tab)}
                    aria-pressed={view.tab === tab}
                    aria-label={label}
                  >
                    <Icon
                      name={icon}
                      size={3.5}
                      data-ndb-mail-detail-tab-icon={tab}
                      className="ndb:sm:hidden"
                    />
                    <span className="ndb:hidden ndb:sm:inline">{label}</span>
                  </FilterTab>
                ))}
              </InspectorDetailTabs>

              {view.tab === 'preview' ? (
                <MailPreviewPanel
                  message={message}
                  url={previewUrl}
                  format={format}
                  viewport={view.viewport}
                  profileId={profileId}
                  onOpenRelated={openRelated}
                />
              ) : null}
              {view.tab === 'message' ? <MailMessagePanel message={message} /> : null}
              {view.tab === 'source' ? <MailSourcePanel message={message} /> : null}
            </div>
          ) : null}
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}
