<?php

use NewDebugBar\Tests\Support\DebugBarBrowser;

it('makes top-framed inspector workspaces full bleed on mobile in every mode', function (string $path, string $inspector, string $workspace) {
    $page = visit($path)
        ->resize(390, 844)
        ->click('[data-ndb-mobile-toolbar-trigger="actions"]')
        ->click('[data-ndb-mobile-toolbar-action="inspector"]')
        ->click('[data-ndb-header-mobile-trigger="actions"]')
        ->click("[data-ndb-select-inspector=\"{$inspector}\"]");

    DebugBarBrowser::waitForVisibleElement($page, $workspace);

    $page->assertScript(<<<JS
        (() => {
            const stage = document.querySelector('[data-ndb-inspector-stage]').getBoundingClientRect();
            const target = document.querySelector('{$workspace}');
            const workspace = target.matches('[data-ndb-inspector-focus-list]') ? target.parentElement : target;
            const box = workspace.getBoundingClientRect();

            return Math.abs(box.left - stage.left) <= 1
                && Math.abs(box.right - stage.right) <= 1
                && workspace.scrollWidth <= workspace.clientWidth + 1;
        })()
        JS)
        ->assertNoJavaScriptErrors();
})->with([
    'split' => ['/profiled', 'queries', '[data-ndb-query-workspace]'],
    'focus' => ['/profiled', 'timeline', '[data-ndb-inspector-panel="timeline"] [data-ndb-inspector-focus-list]:not([hidden])'],
    'stream' => ['/profiled-reported-exception', 'exceptions', '[data-ndb-exception-focused-workspace]'],
]);
