# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above) holds the binding project rules: scope, local checks before pushing, product behavior, MCP parity, interface priorities, and host-page isolation. This file adds commands and architecture only. For UI work, use the `craft-newdebugbar-ui` project skill in `.claude/skills/`.

## Commands

```bash
# Formatting
vendor/bin/pint <files>              # PHP + Blade (composer lint / lint:check run Pint on everything)
npx prettier --write <files>         # JS, CSS, JSON, Markdown (no repo config file; plugins: blade, tailwindcss)

# Static analysis (Larastan level 4, src + config)
composer analyse

# PHP tests (Pest)
composer test:php                    # Package suite: Architecture, Feature, Integration, Production, Unit (parallel)
vendor/bin/pest tests/Unit/QueryAnalyzerTest.php
vendor/bin/pest tests/Feature/McpServerTest.php --filter="profile data"
vendor/bin/pest tests/Feature tests/Unit --parallel --processes=4

# Browser tests (Pest browser plugin + Playwright Chromium); builds assets first
composer test:browser
vendor/bin/pest tests/Browser/StyleIsolationTest.php   # run `npm run build` first if assets changed

# JavaScript (node:test, with coverage thresholds 90/90/85)
npm test
node --test tests/js/inspector-queries.test.js

# Assets (Vite + Tailwind 4 → dist/, committed)
npm run build
npm run dev                          # vite build --watch

composer test                        # analyse + php + js + browser
```

Never run two Pest invocations at once in this checkout (they share browser-server state). After rebuilding, `dist/` must be committed; CI fails on `git diff --exit-code -- dist`.

CI (`.github/workflows/tests.yml`) runs the Package suite across Laravel 10–13 × PHP 8.1–8.5 × `laravel/mcp` 0.x/1.x, the MCP stdio test on Windows, the JS tests plus a dist freshness check, and the browser suite with `composer lint:check`. Code must work on PHP 8.1 and Laravel 10 (`phpVersion: 80100` in PHPStan); `composer.json` pins the local platform to 8.3.

## Architecture

A Laravel package (`NewDebugBar\` → `src/`) that profiles local requests, stores each profile as JSON, injects a Livewire-powered bar into HTML responses, and exposes the same data to coding agents through a local MCP server.

### Capture → store → present

1. **Bootstrap**: `NewDebugBarServiceProvider` binds every service with its config-derived limits. In `boot()` it returns early unless `newdebugbar.enabled` (null means it follows `app.debug`) and `newdebugbar.environments` allow it. When enabled, it registers event listeners, Livewire hooks, log channel taps, the `/__newdebugbar/*` routes (assets, CSRF, mail previews), the MCP server (`Mcp::local('newdebugbar', ...)`), and pushes the `ProfileRequest` global middleware.
2. **Recording**: `ProfileManager` is **scoped** (one per request or job) and owns the collectors, keyed by inspector name (`queries`, `http_client`, `models`, `cache`, ...). `ProfileRequest` calls `begin()`; non-HTTP lifecycles (artisan, queue, tests) go through `RuntimeProfiler` → `beginRuntime()`. Listeners in `Support/EventRegistrar` and `Support/LivewireRegistrar` call `ProfileManager::record($collectorKey, $item)`, which stamps timing and forwards to the collector. Collectors (`Collectors/`, base `AbstractCollector`, contract `Contracts/Collector`) bound and redact items through `Support/Redactor` **at capture time** and expose `summary()` + `payload()`. Generic inspectors (models, views, events, authorization) reuse `ItemCollector`.
3. **Finalizing**: on `RequestHandled`, `Support/ProfileFinalizer` checkpoints the profile, saves it through `Storage/ProfileStore` (JSON files in `storage/framework/newdebugbar`, pruned by count and age), sets the `X-NewDebugBar-Profile` header, and runs `Support/BarInjector` to inject the CSS, the JS, and the mounted `newdebugbar.toolbar` Livewire component into HTML. It then resumes collecting to capture after-response (terminating) work and rewrites the profile. `BackgroundActivityStore` keeps queued job activity that is linked back to profiles later. All debug work is wrapped so failures never replace the host response.
4. **Presentation**: stored profiles stay raw. `Presentation/ProfilePresenter::present()` enriches them on every read using `Analysis/*` (query grouping and N+1 detection, cache and HTTP analysis, findings in `ProfileAnalyzer`, `TimelineBuilder`) and the per-inspector presenters. The browser UI, MCP, and `Testing/ProfileAssertions` all consume this one presented shape, so analyzer changes affect every consumer.

### Browser UI

- `Livewire/DebugBar` is the single Livewire component. It mounts with a summary only and loads each inspector on demand (`loadInspector`, deferred content). Most state is `#[Locked]`. Inspector descriptions live in its `INSPECTOR_DESCRIPTIONS`.
- Blade views are in `resources/views` (namespace `newdebugbar::`). `livewire/inspectors/{key}.blade.php` is one view per inspector, and `components/` holds the shared component library that inspectors should reuse.
- JS entry is `resources/js/newdebugbar.js`, built by Vite as an IIFE into `dist/newdebugbar.{js,css}` and served by `AssetController` from `dist/` (base `/__newdebugbar/assets/`). `state.js` composes an Alpine-style state object from `runtime.js` defaults, shell modules (`shell/`: toolbar, navigation, palette, preferences, requests, activity refresh), and per-inspector controllers registered in `inspectors/index.js`.
- `request-discovery.js` and `csrf-recovery.js` follow later fetch/XHR/Livewire requests on the same page through the profile header, so the bar can switch between captured profiles.

### MCP server

`Mcp/NewDebugBarServer` (tools in `Mcp/Tools`, base `DebugTool`) serves profiles through `Presentation/McpProfilePresenter`, which applies `mcp.max_items` / `mcp.max_bytes` limits and JSON Pointer paging. `get-debug-profile-data` is the generic tool that reaches any presented field. The server's `$instructions` string documents payload paths for agents; update it along with tool guidance and `tests/Feature/McpServerTest.php` when profile shape changes. `tests/Integration/McpStdioTest.php` covers the real stdio transport.

### Tests

- `tests/TestCase.php` (Testbench) and `tests/Support/DefinesTestApplication.php` define the fixture app (routes, models, jobs, mail in `tests/Fixtures`). `tests/Production` uses `ProductionTestCase` to verify the package stays inert outside allowed environments.
- `tests/Browser` uses `tests/Support/DebugBarBrowser.php`. `StyleIsolationTest.php` is the hostile-host test to extend when adding browser identifiers or global CSS.
- `tests/Architecture` enforces view, detail-panel, and GitHub Actions conventions.
- `tests/js/*.test.js` test the JS modules directly with shared helpers in `state-test-support.js`.
