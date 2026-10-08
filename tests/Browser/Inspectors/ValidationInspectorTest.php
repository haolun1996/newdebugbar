<?php

use NewDebugBar\Storage\ProfileStore;
use NewDebugBar\Tests\Support\DebugBarBrowser;

it('shows Livewire validation messages rules and source on desktop and mobile', function () {
    $page = visit('/profiled-livewire-validation')
        ->resize(1440, 900)
        ->click('[data-testid="host-validation-form"] button[type="submit"]')
        ->assertSee('The email field must be a valid email address.')
        ->assertSee('The name field is required.')
        ->assertScript(<<<'JS'
            (() => {
                const state = newDebugBarData(document.getElementById('newdebugbar'));
                state.setTheme('light');

                return state.laterRequestCount === 1
                    && state.recentProfiles.some((profile) => /^\/livewire-[0-9a-f]{8}\/update$/i.test(profile.path))
                    && document.getElementById('newdebugbar').dataset.ndbTheme === 'light';
            })()
            JS)
        ->click('[data-ndb-request-picker-trigger="toolbar"]')
        ->assertVisible('#newdebugbar-request-list-toolbar')
        ->assertScript(<<<'JS'
            (() => {
                const state = newDebugBarData(document.getElementById('newdebugbar'));
                const validation = state.recentProfiles.find((profile) => /^\/livewire-[0-9a-f]{8}\/update$/i.test(profile.path));
                const option = document.querySelector(`[data-ndb-request-option][data-ndb-profile-id="${validation?.id}"]`);

                option?.click();

                return option !== null;
            })()
            JS)
        ->assertScript(<<<'JS'
            (() => {
                const state = newDebugBarData(document.getElementById('newdebugbar'));

                return state.summary.inspector_counts.validation === 1
                    && state.inspectorOpen === true;
            })()
            JS)
        ->click('[data-ndb-select-inspector="validation"]')
        ->assertVisible('[data-ndb-validation-item="0"]')
        ->assertVisible('[data-ndb-validation-messages="email"]')
        ->assertVisible('[data-ndb-validation-message="name"]')
        ->assertVisible('[data-ndb-validation-rules="email"]')
        ->assertVisible('[data-ndb-validation-field-row="traveler.itinerary.days.0.accommodation.confirmation_code"]')
        ->assertVisible('[data-ndb-validation-callsite="0"]')
        ->assertSee('13 fields failed validation')
        ->assertSee('Validation 422')
        ->assertSee('Response 200')
        ->assertScript(<<<'JS'
            (() => {
                const panel = document.querySelector('[data-ndb-inspector-panel="validation"]');
                const table = document.querySelector('[data-ndb-validation-table]');
                const header = table?.querySelector('[data-ndb-validation-table-header]');
                const headerCells = [...(header?.children ?? [])];
                const row = table?.querySelector('[data-ndb-validation-field-row="email"]');
                const rowCells = [...(row?.children ?? [])];
                const message = document.querySelector('[data-ndb-validation-message="email"]');
                const source = document.querySelector('[data-ndb-validation-callsite="0"]');

                if (!panel || !table || !header || !row || !message || !source) return false;

                const headerBoxes = headerCells.map((cell) => cell.getBoundingClientRect());
                const rowBoxes = rowCells.map((cell) => cell.getBoundingClientRect());

                return table.getAttribute('role') === 'table'
                    && getComputedStyle(header).display === 'grid'
                    && headerCells.map((cell) => cell.textContent.trim()).join('|') === 'Field|Message|Failed rules'
                    && rowCells.length === 3
                    && rowCells[0].dataset.ndbValidationField === 'email'
                    && rowCells[1].dataset.ndbValidationMessages === 'email'
                    && rowCells[2].dataset.ndbValidationRules === 'email'
                    && headerBoxes.every((box, index) => Math.abs(box.left - rowBoxes[index].left) <= 1)
                    && rowBoxes[1].width > rowBoxes[0].width
                    && rowBoxes[1].width > rowBoxes[2].width
                    && document.querySelectorAll('[data-ndb-validation-field-row]').length === 13
                    && document.querySelectorAll('[data-ndb-validation-message="email"]').length >= 2
                    && [...row.querySelectorAll('[data-ndb-validation-mobile-label]')]
                        .every((label) => getComputedStyle(label).display === 'none')
                    && message.closest('details') === null
                    && source.textContent.includes('tests/Fixtures/HostValidationForm.php')
                    && table.scrollWidth <= table.clientWidth + 1
                    && panel.scrollWidth <= panel.clientWidth + 1;
            })()
            JS);

    DebugBarBrowser::assertInspectorSelected($page, 'validation');

    $page
        ->keys('[data-ndb-validation-callsite="0"]', 'Enter')
        ->assertNoJavaScriptErrors()
        ->assertScript(<<<'JS'
            (() => {
                const state = newDebugBarData(document.getElementById('newdebugbar'));
                state.setTheme('dark');

                return document.getElementById('newdebugbar').dataset.ndbTheme === 'dark';
            })()
            JS)
        ->resize(390, 844)
        ->assertVisible('[data-ndb-validation-item="0"]')
        ->assertVisible('[data-ndb-validation-messages="email"]')
        ->assertScript(<<<'JS'
            (() => {
                const stage = document.querySelector('[data-ndb-inspector-stage]').getBoundingClientRect();
                const workspace = document.querySelector('[data-ndb-validation-workspace]');
                const workspaceBox = workspace.getBoundingClientRect();
                const item = document.querySelector('[data-ndb-validation-item="0"]');
                const table = item.querySelector('[data-ndb-validation-table]');
                const header = table.querySelector('[data-ndb-validation-table-header]');
                const row = table.querySelector('[data-ndb-validation-field-row="email"]');
                const cells = [...row.children];
                const labels = [...row.querySelectorAll('[data-ndb-validation-mobile-label]')];
                const near = (actual, expected) => Math.abs(actual - expected) <= 1;

                return item.scrollWidth <= item.clientWidth
                    && table.scrollWidth <= table.clientWidth + 1
                    && near(workspaceBox.left, stage.left)
                    && near(workspaceBox.right, stage.right)
                    && workspace.scrollWidth <= workspace.clientWidth
                    && getComputedStyle(header).display === 'none'
                    && cells.length === 3
                    && cells[0].getBoundingClientRect().top < cells[1].getBoundingClientRect().top
                    && cells[1].getBoundingClientRect().top < cells[2].getBoundingClientRect().top
                    && labels.map((label) => label.textContent.trim()).join('|') === 'Field|Message|Failed rules'
                    && labels.every((label) => getComputedStyle(label).display !== 'none');
            })()
            JS)
        ->assertNoJavaScriptErrors();
});

it('explains redirected validation failures and messages carried from the previous request', function () {
    $page = visit('/profiled-session-validation');
    $page->script("localStorage.setItem('newdebugbar.preferences.v1', JSON.stringify({theme: 'light', favorites: ['validation']}))");
    $page->refresh()->resize(1440, 900);
    $id = $page->script("newDebugBarData(document.getElementById('newdebugbar')).summary.id");
    $store = app(ProfileStore::class);
    $profile = $store->get($id);
    $profile['inspectors']['validation'] = [
        'label' => 'Validation',
        'summary' => ['count' => 2],
        'payload' => ['items' => [
            [
                'source' => 'exception',
                'fields' => ['email', 'name'],
                'rules' => ['email' => ['Required', 'Email'], 'name' => ['Required']],
                'messages' => [
                    'email' => ['The email field must be a valid email address.'],
                    'name' => ['The name field is required.'],
                ],
                'error_bag' => 'signup',
                'exception_status' => 422,
                'exception_message' => 'The email field must be a valid email address. (and 1 more error)',
                'response_status' => 302,
                'callsite' => ['file' => 'tests/Support/DefinesTestApplication.php', 'line' => 589],
            ],
            [
                'source' => 'session',
                'from_previous_request' => true,
                'fields' => ['email', 'team'],
                'rules' => ['email' => [], 'team' => []],
                'messages' => [
                    'email' => ['The email has already been taken.'],
                    'team' => ['The selected team is invalid.'],
                ],
                'error_bag' => 'default',
            ],
        ]],
    ];
    $store->put($profile);

    $page->click('[data-ndb-window-controls="compact"] [data-ndb-window-action="expand"]')
        ->click('[data-ndb-select-inspector="validation"]');

    DebugBarBrowser::waitForVisibleElement($page, '[data-ndb-validation-item="1"]');

    $page->assertSeeIn('[data-ndb-validation-workspace]', '2 validation attempts')
        ->assertSeeIn('[data-ndb-validation-item="0"]', '2 fields failed validation')
        ->assertSeeIn('[data-ndb-validation-item="0"]', 'signup bag')
        ->assertSeeIn('[data-ndb-validation-item="0"]', 'Validation 422')
        ->assertSeeIn('[data-ndb-validation-item="0"]', 'Redirect 302')
        ->assertSeeIn('[data-ndb-validation-message="name"]', 'The name field is required.')
        ->assertSeeIn('[data-ndb-validation-callsite="0"]', 'tests/Support/DefinesTestApplication.php:589')
        ->assertDontSee('Show validation messages')
        ->assertSeeIn('[data-ndb-validation-item="1"]', 'Carried from the previous request.')
        ->assertScript(<<<'JS'
            [...document.querySelectorAll('[data-ndb-validation-item="1"] header span')]
                .some((badge) => badge.textContent.trim() === 'Previous request')
            JS)
        ->assertSeeIn('[data-ndb-validation-item="1"]', 'default bag')
        ->assertSeeIn('[data-ndb-validation-item="1"]', 'The email has already been taken.')
        ->assertSeeIn('[data-ndb-validation-item="1"]', 'Why rules and source may be missing')
        ->assertSeeIn('[data-ndb-validation-item="1"]', 'Failed rules and source code are not available on this request.')
        ->assertSeeIn('[data-ndb-validation-rules="team"]', 'Not captured')
        ->assertMissing('[data-ndb-validation-callsite="1"]')
        ->assertNoJavaScriptErrors();
});
