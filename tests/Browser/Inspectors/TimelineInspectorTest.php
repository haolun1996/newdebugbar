<?php

use NewDebugBar\Storage\ProfileStore;
use NewDebugBar\Tests\Support\DebugBarBrowser;

it('keeps the desktop waterfall useful inside the shared timeline workspace', function () {
    $page = visit('/profiled-timeline-long');
    $page->script("localStorage.setItem('newdebugbar.preferences.v1', JSON.stringify({theme: 'dark', favorites: []}))");

    $page
        ->refresh()
        ->resize(1280, 720)
        ->click('[data-ndb-window-controls="compact"] [data-ndb-window-action="expand"]')
        ->click('[data-ndb-select-inspector="timeline"]');

    DebugBarBrowser::assertInspectorSelected($page, 'timeline');

    $page
        ->assertAttribute('#newdebugbar', 'data-ndb-theme', 'dark')
        ->assertPresent('[data-ndb-timeline-workspace]')
        ->assertVisible('[data-ndb-timeline-waterfall-header]')
        ->assertValue('[data-ndb-timeline-filter]', 'key')
        ->assertScript(<<<'JS'
            (() => {
                const sentinel = document.querySelector('[data-ndb-timeline-page-sentinel]');

                return sentinel?.getAttribute('role') === 'status'
                    && sentinel.getAttribute('aria-live') === 'polite'
                    && document.querySelector('[data-ndb-timeline-load-more]') === null;
            })()
            JS)
        ->assertScript(<<<'JS'
            (() => {
                const controls = document.querySelector('[data-ndb-timeline-list-panel] [data-ndb-inspector-list-controls]');
                const search = document.querySelector('[data-ndb-timeline-search-field]').getBoundingClientRect();
                const filter = document.querySelector('[data-ndb-timeline-filter]').getBoundingClientRect();
                const workspace = document.querySelector('[data-ndb-timeline-workspace]');

                return search.left < filter.left
                    && search.right <= filter.left
                    && controls.scrollWidth <= controls.clientWidth
                    && workspace.getBoundingClientRect().height > 400
                    && workspace.scrollWidth <= workspace.clientWidth;
            })()
            JS);

    $page->script("document.querySelector('[data-ndb-timeline-page-sentinel]').scrollIntoView({ block: 'end' })");

    $page
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length >= 100')
        ->select('[data-ndb-timeline-filter]', 'queries')
        ->assertScript(<<<'JS'
            Array.from(document.querySelectorAll('[data-ndb-timeline-item]:not([hidden])'))
                .every((item) => item.dataset.ndbTimelineInspector === 'queries')
            JS)
        ->assertScript(<<<'JS'
            Array.from(document.querySelectorAll('[data-ndb-timeline-item]:not([hidden])'))
                .every((item) => {
                    const track = item.querySelector('[data-ndb-timeline-track]').getBoundingClientRect();
                    const mark = item.querySelector('[data-ndb-timeline-mark]').getBoundingClientRect();

                    return item.dataset.ndbTimelineKind === 'Duration'
                        && Number(item.dataset.ndbTimelineStart) < Number(item.dataset.ndbTimelineAt)
                        && Number(item.dataset.ndbTimelineDuration) > 0
                        && mark.width >= 3
                        && mark.left >= track.left
                        && mark.right <= track.right + 1;
                })
            JS)
        ->click('[data-ndb-timeline-item="queries-0"]')
        ->assertVisible('[data-ndb-timeline-detail-content]')
        ->assertVisible('[data-ndb-timeline-open-inspector]')
        ->assertVisible('[data-ndb-timeline-detail-content] [data-ndb-inspector-source-link]')
        ->assertSeeIn(
            '[data-ndb-timeline-detail-content] [data-ndb-inspector-source-link]',
            'tests/Support/DefinesTestApplication.php',
        )
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-detail-content]").length === 1')
        ->assertScript(<<<'JS'
            (() => {
                const detail = document.querySelector('[data-ndb-inspector-focus-detail]');
                const title = detail.querySelector('[data-ndb-timeline-detail-label]');
                const category = title.previousElementSibling;
                const facts = detail.querySelector('[data-ndb-inspector-facts]');
                const checks = {
                    groupedIdentity: category.matches('p') && category.parentElement === title.parentElement,
                    leftAlignment: Math.abs(category.getBoundingClientRect().left - title.getBoundingClientRect().left) <= 1,
                    readingOrder: category.getBoundingClientRect().bottom <= title.getBoundingClientRect().top,
                    detailContainer: getComputedStyle(detail).containerType === 'inline-size',
                    detailFit: detail.scrollWidth <= detail.clientWidth + 1,
                    factsFit: facts.scrollWidth <= facts.clientWidth + 1
                        && [...facts.children].every((fact) => fact.scrollWidth <= fact.clientWidth + 1),
                };
                const failures = Object.entries(checks).filter(([, passed]) => ! passed).map(([name]) => name);

                if (failures.length > 0) throw new Error('Timeline detail layout failed: ' + failures.join(', '));

                return true;
            })()
            JS)
        ->assertScript(<<<'JS'
            (() => {
                const detail = document.querySelector('[data-ndb-timeline-detail-content]');
                const source = detail.querySelector('[data-ndb-inspector-source-link]');

                window.newdebugbarTimelineClipboard = [];
                Object.defineProperty(window.navigator, 'clipboard', {
                    configurable: true,
                    value: {
                        writeText: async (value) => window.newdebugbarTimelineClipboard.push(value),
                    },
                });

                return getComputedStyle(source).fontFamily === getComputedStyle(detail).fontFamily;
            })()
            JS)
        ->click('[data-ndb-timeline-detail-content] [data-ndb-inspector-source-link]')
        ->wait(0.05)
        ->assertScript(<<<'JS'
            window.newdebugbarTimelineClipboard.length === 1
                && /^tests\/Support\/DefinesTestApplication\.php:\d+$/.test(window.newdebugbarTimelineClipboard[0])
            JS)
        ->click('[data-ndb-inspector-focus-back]')
        ->assertVisible('[data-ndb-timeline-list]');

    DebugBarBrowser::waitForFocus($page, '[data-ndb-timeline-item][aria-pressed="true"]');

    $page
        ->type('[data-ndb-timeline-search-field]', 'nothing can match this timeline activity')
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]:not([hidden])").length', 0)
        ->assertSee('No timeline activity matches this search and filter.')
        ->assertNoJavaScriptErrors();
});

it('turns the timeline into a mobile chronological drill-in without horizontal overflow', function () {
    $page = visit('/profiled-timeline-long');
    $page->script("localStorage.setItem('newdebugbar.preferences.v1', JSON.stringify({theme: 'light', favorites: []}))");

    $page
        ->refresh()
        ->resize(390, 844)
        ->click('[data-ndb-mobile-toolbar-trigger="actions"]')
        ->click('[data-ndb-mobile-toolbar-action="inspector"]')
        ->click('[data-ndb-header-mobile-trigger="actions"]')
        ->click('[data-ndb-select-inspector="timeline"]')
        ->assertAttribute('#newdebugbar', 'data-ndb-theme', 'light')
        ->assertMissing('[data-ndb-timeline-load-more]')
        ->assertScript(<<<'JS'
            (() => {
                const stage = document.querySelector('[data-ndb-inspector-stage]').getBoundingClientRect();
                const workspace = document.querySelector('[data-ndb-timeline-workspace]');
                const workspaceBox = workspace.getBoundingClientRect();
                const row = document.querySelector('[data-ndb-timeline-item]:not([hidden])');
                const track = row.querySelector('[data-ndb-timeline-track]');
                const near = (actual, expected) => Math.abs(actual - expected) <= 1;

                return getComputedStyle(track).display === 'none'
                    && near(workspaceBox.left, stage.left)
                    && near(workspaceBox.right, stage.right)
                    && workspace.scrollWidth <= workspace.clientWidth
                    && row.scrollWidth <= row.clientWidth;
            })()
            JS);

    $page->script("document.querySelector('[data-ndb-timeline-page-sentinel]').scrollIntoView({ block: 'end' })");

    $page
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length >= 100')
        ->click('[data-ndb-timeline-item="request-start"]')
        ->assertVisible('[data-ndb-timeline-detail-content]')
        ->assertMissing('[data-ndb-timeline-detail-content] [data-ndb-inspector-source-link]')
        ->assertSeeIn('[data-ndb-timeline-detail-content]', 'Not captured for this activity.')
        ->assertScript('getComputedStyle(document.querySelector("[data-ndb-timeline-list]").closest("[data-ndb-inspector-focus-list]")).display === "none"')
        ->assertScript(<<<'JS'
            (() => {
                const stage = document.querySelector('[data-ndb-inspector-stage]').getBoundingClientRect();
                const workspace = document.querySelector('[data-ndb-timeline-workspace]');
                const workspaceBox = workspace.getBoundingClientRect();
                const detail = document.querySelector('[data-ndb-inspector-focus-detail]');
                const title = detail.querySelector('[data-ndb-timeline-detail-label]');
                const category = title.previousElementSibling;
                const facts = detail.querySelector('[data-ndb-inspector-facts]');
                const near = (actual, expected) => Math.abs(actual - expected) <= 1;

                return near(workspaceBox.left, stage.left)
                    && near(workspaceBox.right, stage.right)
                    && workspace.scrollWidth <= workspace.clientWidth
                    && detail.scrollWidth <= detail.clientWidth
                    && getComputedStyle(detail).containerType === 'inline-size'
                    && category.matches('p')
                    && near(category.getBoundingClientRect().left, title.getBoundingClientRect().left)
                    && category.getBoundingClientRect().bottom <= title.getBoundingClientRect().top
                    && facts.scrollWidth <= facts.clientWidth + 1
                    && [...facts.children].every((fact) => fact.scrollWidth <= fact.clientWidth + 1)
                    && document.querySelectorAll('[data-ndb-timeline-detail-content]').length === 1;
            })()
            JS)
        ->click('[data-ndb-inspector-focus-back]')
        ->assertVisible('[data-ndb-timeline-list]')
        ->assertNoJavaScriptErrors();
});

it('finds timeline evidence beyond the loaded page before scrolling', function () {
    $page = visit('/profiled-timeline-long');
    $page->resize(1280, 720)->click('[data-ndb-window-controls="compact"] [data-ndb-window-action="expand"]');
    $page->click('[data-ndb-select-inspector="timeline"]');
    DebugBarBrowser::assertInspectorSelected($page, 'timeline');
    $page->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length === 50')
        ->type('[data-ndb-timeline-search-field]', 'final_timeline_number')
        ->assertVisible('[data-ndb-timeline-item="queries-109"]')
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length === 1')
        ->assertNoJavaScriptErrors();
});

/** Opens the timeline after replacing the captured inspectors of a profiled page. */
function visitTimelineProfile(array $inspectors, float $duration): mixed
{
    $page = visit('/profiled-timeline-long')->resize(1280, 720);
    $store = app(ProfileStore::class);
    $profile = $store->get($page->script('newDebugBarData().summary.id'));
    $store->put(array_merge($profile, ['metrics' => ['duration_ms' => $duration], 'inspectors' => $inspectors]));

    $page->click('[data-ndb-window-controls="compact"] [data-ndb-window-action="expand"]')
        ->click('[data-ndb-select-inspector="timeline"]');
    DebugBarBrowser::assertInspectorSelected($page, 'timeline');
    DebugBarBrowser::waitForDetails($page);

    return $page;
}

/** Records every timeline request the inspector sends. */
const RECORD_TIMELINE_REQUESTS = <<<'JS'
    (() => {
        const fetch = window.fetch;
        window.newdebugbarTimelineRequests = [];
        window.fetch = (input, init) => {
            const url = new URL(String(input), window.location.href);
            if (url.pathname.endsWith('/inspectors/timeline')) window.newdebugbarTimelineRequests.push(url.searchParams);

            return fetch(input, init);
        };

        return true;
    })()
    JS;

function longTimelineRequest(): array
{
    return [
        'method' => 'GET',
        'status' => 200,
        'path' => '/long-timeline',
        'route' => null,
        'action' => null,
    ];
}

it('explains an incomplete timeline above its activity', function () {
    $page = visitTimelineProfile([
        'request' => ['label' => 'Request', 'summary' => ['method' => 'GET', 'status' => 200], 'payload' => longTimelineRequest()],
        'views' => [
            'label' => 'Views',
            'summary' => ['count' => 2, 'retained_count' => 0, 'dropped_count' => 2],
            'payload' => ['items' => []],
        ],
    ], 15.2);

    $page->assertVisible('[data-ndb-timeline-incomplete]')
        ->assertSeeIn('[data-ndb-timeline-incomplete]', 'Timeline incomplete: 2 source events were omitted.')
        ->assertVisible('[data-ndb-timeline-workspace]')
        ->assertNoJavaScriptErrors();
});

it('pages long timelines in deterministic batches and restarts after filtering', function () {
    $page = visitTimelineProfile([
        'request' => ['label' => 'Request', 'summary' => ['method' => 'GET', 'status' => 200], 'payload' => longTimelineRequest()],
        'logs' => ['label' => 'Logs', 'summary' => ['count' => 120], 'payload' => ['items' => array_map(
            fn (int $index): array => ['level' => 'info', 'message' => 'Timeline event '.$index, 'at_ms' => (float) $index],
            range(1, 120),
        )]],
        'exceptions' => ['label' => 'Exceptions', 'summary' => ['count' => 0], 'payload' => ['items' => []]],
    ], 121);

    $page->assertScript(RECORD_TIMELINE_REQUESTS)
        ->assertSeeIn('[data-ndb-timeline-summary]', '2 matching')
        ->select('[data-ndb-timeline-filter]', 'all')
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 50)
        ->assertSee('Showing 50 of 122 timeline')
        ->assertSee('More activity loads as you scroll.')
        ->assertPresent('[data-ndb-timeline-page-sentinel]')
        ->assertMissing('[data-ndb-timeline-load-more]');

    $page->script("document.querySelector('[data-ndb-timeline-page-sentinel]').scrollIntoView({ block: 'end' })");
    $page->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 100);
    $page->script("document.querySelector('[data-ndb-timeline-page-sentinel]').scrollIntoView({ block: 'end' })");

    $page->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 122)
        ->assertMissing('[data-ndb-timeline-page-sentinel]')
        ->assertSee('All 122 timeline events are loaded.')
        ->select('[data-ndb-timeline-filter]', 'logs')
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 50)
        ->fill('[data-ndb-timeline-search-field]', 'event 119')
        ->assertScript('[...document.querySelectorAll("[data-ndb-timeline-item]")].map((item) => item.dataset.ndbTimelineItem).join()', 'logs-118')
        ->assertMissing('[data-ndb-timeline-page-sentinel]')
        ->fill('[data-ndb-timeline-search-field]', 'no such activity')
        ->assertSee('No timeline activity matches this search and filter.')
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 0)
        ->assertPresent('[data-ndb-timeline-search-field]')
        ->assertScript(<<<'JS'
            (() => {
                const requests = window.newdebugbarTimelineRequests.map((params) => ({
                    filter: params.get('timeline_filter'),
                    search: params.get('timeline_search') ?? '',
                    limit: Number(params.get('timeline_limit')),
                }));
                const pages = requests.filter((request, index) => index > 0
                    && request.filter === requests[index - 1].filter
                    && request.search === requests[index - 1].search);

                return requests[0].filter === 'all' && requests[0].limit === 50
                    && pages.map((request) => request.limit).join() === '100,150'
                    && requests.filter((request) => ! pages.includes(request)).every((request) => request.limit === 50)
                    && requests.at(-1).filter === 'logs' && requests.at(-1).search === 'no such activity';
            })()
            JS);

    $page->click('[data-ndb-select-inspector="request"]');
    DebugBarBrowser::waitForDetails($page);
    $page->click('[data-ndb-select-inspector="timeline"]');
    DebugBarBrowser::waitForDetails($page);

    $page->assertValue('[data-ndb-timeline-filter]', 'key')
        ->assertValue('[data-ndb-timeline-search-field]', '')
        ->assertSeeIn('[data-ndb-timeline-summary]', '2 matching')
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 2)
        ->assertScript('window.newdebugbarTimelineRequests.at(-1).get("timeline_limit") === null')
        ->assertNoJavaScriptErrors();
});

it('keeps the selected timeline page when a background refresh races it', function (bool $refreshFirst) {
    $page = visit('/profiled-timeline-long')->resize(1280, 720);
    $page->click('[data-ndb-window-controls="compact"] [data-ndb-window-action="expand"]')
        ->click('[data-ndb-select-inspector="timeline"]');
    DebugBarBrowser::assertInspectorSelected($page, 'timeline');
    DebugBarBrowser::waitForDetails($page);

    $page->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 50)
        ->assertScript(<<<'JS'
            (() => {
                const fetch = window.fetch;
                window.newdebugbarHeldTimeline = [];
                window.newdebugbarHoldTimeline = true;
                window.fetch = (input, init) => {
                    const url = new URL(String(input), window.location.href);

                    if (! window.newdebugbarHoldTimeline || ! url.pathname.endsWith('/inspectors/timeline')) {
                        return fetch(input, init);
                    }

                    return new Promise((resolve) => window.newdebugbarHeldTimeline.push({
                        page: url.searchParams.get('timeline_limit') === '100',
                        release: () => resolve(fetch(input, init)),
                    }));
                };

                return true;
            })()
            JS);

    $page->script("document.querySelector('[data-ndb-timeline-page-sentinel]').scrollIntoView({ block: 'end' })");
    $page->assertScript('window.newdebugbarHeldTimeline.length', 1)
        ->assertScript("(newDebugBarData().requestInspector('timeline', true), true)")
        ->assertScript('window.newdebugbarHeldTimeline.length', 2)
        ->assertScript(sprintf(<<<'JS'
            (() => {
                const held = window.newdebugbarHeldTimeline;
                const page = held.find((request) => request.page);
                const refresh = held.find((request) => ! request.page);
                window.newdebugbarHoldTimeline = false;
                window.newdebugbarReleaseLast = %s ? page : refresh;
                (%s ? refresh : page).release();

                return page !== undefined && refresh !== undefined;
            })()
            JS, $refreshFirst ? 'true' : 'false', $refreshFirst ? 'true' : 'false'))
        ->wait(0.3)
        ->assertScript('(window.newdebugbarReleaseLast.release(), true)')
        ->assertScript(<<<'JS'
            (() => {
                const shell = newDebugBarData();
                const panels = [...document.querySelectorAll('[data-ndb-inspector-panel]')];

                return shell.selected === 'timeline'
                    && shell.loadedInspector === 'timeline'
                    && panels.length === 1
                    && panels[0].dataset.ndbInspectorPanel === 'timeline'
                    && document.querySelectorAll('[data-ndb-timeline-item]').length === 100;
            })()
            JS)
        ->wait(0.3)
        ->assertScript('document.querySelectorAll("[data-ndb-timeline-item]").length', 100)
        ->assertNoJavaScriptErrors();
})->with([
    'refresh first' => true,
    'refresh last' => false,
]);
