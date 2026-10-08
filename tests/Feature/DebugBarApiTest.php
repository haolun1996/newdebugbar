<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use NewDebugBar\Presentation\ProfilePresenter;
use NewDebugBar\Storage\BackgroundActivityStore;
use NewDebugBar\Storage\ProfileStore;

const MISSING_PROFILE_ID = '00000000-0000-4000-8000-000000000000';

/** @param array<string, mixed> $inspectors */
function storeApiProfile(array $inspectors, array $metrics = ['duration_ms' => 10, 'peak_memory_mb' => 8], array $profile = []): string
{
    $id = (string) Str::uuid();

    app(ProfileStore::class)->put([
        'id' => $id,
        'environment' => 'testing',
        'metrics' => $metrics,
        'inspectors' => [
            'request' => [
                'label' => 'Request',
                'summary' => ['method' => 'GET', 'status' => 200],
                'payload' => ['method' => 'GET', 'status' => 200, 'path' => '/', 'route' => null, 'action' => null],
            ],
            'exceptions' => ['label' => 'Exceptions', 'summary' => ['count' => 0], 'payload' => ['items' => []]],
            ...$inspectors,
        ],
        ...$profile,
    ]);

    return $id;
}

function inspectorApi(string $profileId, string $inspector, array $query = []): TestResponse
{
    $uri = "/__newdebugbar/api/profiles/{$profileId}/inspectors/{$inspector}";

    return test()->getJson($query === [] ? $uri : $uri.'?'.http_build_query($query));
}

/** @return array<string, array<string, mixed>> */
function summaryInspectors(TestResponse $response): array
{
    return collect($response->json('summary.inspectors'))->keyBy('key')->all();
}

it('serves the summary first and one requested inspector at a time', function () {
    $id = $this->get('/profiled', ['Accept' => 'text/html'])
        ->assertOk()
        ->headers->get('X-NewDebugBar-Profile');

    $summary = $this->getJson("/__newdebugbar/api/profiles/{$id}")
        ->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertJsonPath('summary.id', $id)
        ->assertJsonPath('summary.path', '/profiled')
        ->assertJsonMissingPath('summary.payload');

    expect(summaryInspectors($summary))
        ->toHaveKeys(['request', 'queries', 'timeline'])
        ->not->toHaveKey('overview')
        ->and($summary->json('summary.inspector_counts.queries'))->toBe(3)
        ->and(summaryInspectors($summary)['request']['label'])->toBe('Requests');

    $response = inspectorApi($id, 'request')
        ->assertOk()
        ->assertJsonPath('profile_id', $id)
        ->assertJsonPath('inspector', 'request')
        ->assertJsonPath('profile.inspectors.request.payload.path', '/profiled');

    expect(array_keys($response->json('profile.inspectors')))->toBe(['request'])
        ->and($response->json('profile'))->toHaveKeys(['findings', 'metrics', 'background_activity']);
});

it('keeps API traffic out of the stored profiles', function () {
    $id = $this->get('/profiled', ['Accept' => 'text/html'])->headers->get('X-NewDebugBar-Profile');
    $stored = count(File::files(config('newdebugbar.storage.path')));

    $this->getJson("/__newdebugbar/api/profiles/{$id}")->assertOk()->assertHeaderMissing('X-NewDebugBar-Profile');
    inspectorApi($id, 'queries')->assertOk()->assertHeaderMissing('X-NewDebugBar-Profile');
    $this->getJson('/__newdebugbar/api/recent')->assertOk()->assertHeaderMissing('X-NewDebugBar-Profile');

    expect(count(File::files(config('newdebugbar.storage.path'))))->toBe($stored);
});

it('summarizes warnings, slow queries, and duplicate sql', function () {
    $id = storeApiProfile([
        'request' => [
            'label' => 'Request',
            'summary' => ['method' => 'POST', 'status' => 500],
            'payload' => [
                'method' => 'POST',
                'status' => 500,
                'path' => '/organizations',
                'route' => 'organizations.store',
                'action' => 'OrganizationController@store',
            ],
        ],
        'queries' => [
            'label' => 'Queries',
            'summary' => ['count' => 3, 'duration_ms' => 130.5],
            'payload' => ['items' => [
                ['sql' => 'select * from users', 'duration_ms' => 120],
                ['sql' => "select  *  from\nusers", 'duration_ms' => 5],
                ['sql' => 'select * from clinics', 'duration_ms' => 5.5],
            ]],
        ],
        'exceptions' => ['label' => 'Exceptions', 'summary' => ['count' => 1], 'payload' => ['items' => []]],
    ], ['duration_ms' => 15.2, 'peak_memory_mb' => 8.5]);

    $this->getJson("/__newdebugbar/api/profiles/{$id}")
        ->assertOk()
        ->assertJsonPath('summary.id', $id)
        ->assertJsonPath('summary.environment', 'testing')
        ->assertJsonPath('summary.method', 'POST')
        ->assertJsonPath('summary.path', '/organizations')
        ->assertJsonPath('summary.status', 500)
        ->assertJsonPath('summary.warning', true)
        ->assertJsonPath('summary.peak_memory_mb', 8.5)
        ->assertJsonPath('summary.duration_label', '15.2 ms')
        ->assertJsonPath('summary.query_time_ms', 130.5)
        ->assertJsonPath('summary.query_time_label', '130.5 ms')
        ->assertJsonPath('summary.slow_query_count', 1)
        ->assertJsonPath('summary.repeated_pattern_count', 1)
        ->assertJsonPath('summary.exception_count', 1)
        ->assertJsonPath('summary.theme', 'system');

    inspectorApi($id, 'exceptions')
        ->assertOk()
        ->assertJsonPath('profile.findings.0.summary', 'The request returned HTTP 500.');
});

it('marks active, quiet, truncated, and incomplete inspectors for disclosure', function () {
    $id = storeApiProfile([
        'overview' => ['label' => 'Overview', 'summary' => [], 'payload' => []],
        'queries' => ['label' => 'Queries', 'summary' => ['count' => 0, 'duration_ms' => 0], 'payload' => ['items' => []]],
        'views' => [
            'label' => 'Views',
            'summary' => ['count' => 2, 'retained_count' => 0, 'dropped_count' => 2],
            'payload' => ['items' => []],
        ],
        'logs' => ['label' => 'Logs', 'summary' => ['count' => 0], 'payload' => ['items' => []]],
    ]);

    $response = $this->getJson("/__newdebugbar/api/profiles/{$id}")
        ->assertOk()
        ->assertJsonPath('summary.warning', true);
    $inspectors = summaryInspectors($response);

    expect($inspectors)->not->toHaveKey('overview')
        ->and(collect($inspectors)->every(fn (array $inspector): bool => filled($inspector['description'] ?? null)))->toBeTrue()
        ->and($inspectors['request']['active'])->toBeTrue()
        ->and($inspectors['queries']['active'])->toBeFalse()
        ->and($inspectors['logs']['active'])->toBeFalse()
        ->and($inspectors['exceptions']['active'])->toBeFalse()
        ->and($inspectors['views'])
        ->active->toBeTrue()
        ->attention->toBeTrue()
        ->truncated->toBeTrue()
        ->finding_count->toBe(1)
        ->and($inspectors['timeline'])
        ->active->toBeTrue()
        ->attention->toBeTrue()
        ->incomplete->toBeTrue();

    inspectorApi($id, 'views')
        ->assertOk()
        ->assertJsonPath('profile.inspectors.views.summary.count', 2)
        ->assertJsonPath('profile.inspectors.views.summary.dropped_count', 2);
    inspectorApi($id, 'timeline')
        ->assertOk()
        ->assertJsonPath('profile.inspectors.timeline.payload.incomplete', true)
        ->assertJsonPath('profile.inspectors.timeline.payload.omitted_count', 2);
});

it('marks secondary query transaction omissions as truncated', function () {
    $id = storeApiProfile([
        'queries' => [
            'label' => 'Queries',
            'summary' => [
                'count' => 0,
                'duration_ms' => 0,
                'transaction_count' => 3,
                'transaction_retained_count' => 1,
                'transaction_dropped_count' => 2,
                'truncated' => true,
            ],
            'payload' => ['items' => [], 'transactions' => [['kind' => 'begin']]],
        ],
    ]);

    $queries = summaryInspectors($this->getJson("/__newdebugbar/api/profiles/{$id}")->assertOk())['queries'];

    expect($queries)
        ->active->toBeTrue()
        ->attention->toBeTrue()
        ->truncated->toBeTrue();

    inspectorApi($id, 'queries')
        ->assertOk()
        ->assertJsonPath('profile.inspectors.queries.summary.transaction_count', 3)
        ->assertJsonPath('profile.inspectors.queries.summary.transaction_retained_count', 1)
        ->assertJsonCount(1, 'profile.inspectors.queries.payload.transactions');
});

it('adds query records and their filters to the presented query inspector', function () {
    $id = storeApiProfile([
        'queries' => ['label' => 'Queries', 'summary' => ['count' => 2, 'duration_ms' => 10], 'payload' => ['items' => [
            ['sql' => 'select ?', 'bindings' => [1], 'duration_ms' => 5, 'connection' => 'testing'],
            ['sql' => 'select ?', 'bindings' => [2], 'duration_ms' => 5, 'connection' => 'testing'],
        ]]],
    ], ['duration_ms' => 100]);

    $response = inspectorApi($id, 'queries')
        ->assertOk()
        ->assertJsonPath('profile.inspectors.queries.summary.repeated_pattern_count', 1)
        ->assertJsonPath('profile.inspectors.queries.payload.items.0.repeated_count', 2)
        ->assertJsonPath('profile.findings.0.rule_id', 'query.repeated');
    $records = $response->json('profile.inspectors.queries.payload.records');
    $filters = $response->json('profile.inspectors.queries.payload.record_filters');

    expect($records)->toHaveCount(1)
        ->and($records[0])->repeated->toBeTrue()->count->toBe(2)
        ->and($records[0]['executions'])->toHaveCount(2)
        ->and($filters)->toBe([
            'all' => ['All', 2],
            'attention' => ['Needs attention', 2],
            'read' => ['Reads', 2],
            'write' => ['Writes', 0],
        ]);
});

it('tells the notifications inspector which mail messages the profile still retains', function () {
    $id = storeApiProfile([
        'mail' => ['label' => 'Mail', 'summary' => ['count' => 3], 'payload' => ['items' => [
            ['transport_message_id' => 'retained@example.test', 'status' => 'sent'],
            ['transport_message_id' => null, 'status' => 'queued'],
            ['transport_message_id' => '', 'status' => 'sent'],
        ]]],
        'notifications' => ['label' => 'Notifications', 'summary' => ['count' => 1], 'payload' => ['items' => [
            ['notification' => 'App\\Notifications\\Ready', 'channel' => 'mail', 'mail_message_id' => 'retained@example.test'],
        ]]],
    ]);

    inspectorApi($id, 'notifications')
        ->assertOk()
        ->assertJsonPath('profile.inspectors.notifications.payload.retained_mail_message_ids', ['retained@example.test'])
        ->assertJsonMissingPath('profile.inspectors.mail');

    inspectorApi($id, 'mail')
        ->assertOk()
        ->assertJsonMissingPath('profile.inspectors.mail.payload.retained_mail_message_ids');
});

it('pages and filters long timelines in deterministic batches', function () {
    $id = storeApiProfile([
        'logs' => ['label' => 'Logs', 'summary' => ['count' => 120], 'payload' => ['items' => array_map(
            fn (int $index): array => ['level' => 'info', 'message' => 'Timeline event '.$index, 'at_ms' => (float) $index],
            range(1, 120),
        )]],
    ], ['duration_ms' => 121]);

    inspectorApi($id, 'timeline')
        ->assertOk()
        ->assertJsonPath('profile.inspectors.timeline.payload.filter', 'key')
        ->assertJsonPath('profile.inspectors.timeline.payload.search', '')
        ->assertJsonPath('profile.inspectors.timeline.payload.limit', 50)
        ->assertJsonPath('profile.inspectors.timeline.payload.matching_item_count', 2);

    inspectorApi($id, 'timeline', ['timeline_filter' => 'all', 'timeline_search' => ''])
        ->assertOk()
        ->assertJsonCount(50, 'profile.inspectors.timeline.payload.items')
        ->assertJsonPath('profile.inspectors.timeline.payload.total_item_count', 122)
        ->assertJsonPath('profile.inspectors.timeline.payload.matching_item_count', 122)
        ->assertJsonPath('profile.inspectors.timeline.payload.available_inspectors', ['request', 'logs'])
        ->assertJsonPath('profile.inspectors.timeline.payload.has_more', true);

    inspectorApi($id, 'timeline', ['timeline_filter' => 'all', 'timeline_limit' => 100])
        ->assertOk()
        ->assertJsonCount(100, 'profile.inspectors.timeline.payload.items')
        ->assertJsonPath('profile.inspectors.timeline.payload.has_more', true);

    inspectorApi($id, 'timeline', ['timeline_filter' => 'all', 'timeline_limit' => 150])
        ->assertOk()
        ->assertJsonCount(122, 'profile.inspectors.timeline.payload.items')
        ->assertJsonPath('profile.inspectors.timeline.payload.has_more', false);

    inspectorApi($id, 'timeline', ['timeline_filter' => 'all', 'timeline_limit' => 1])
        ->assertOk()
        ->assertJsonPath('profile.inspectors.timeline.payload.limit', 50)
        ->assertJsonCount(50, 'profile.inspectors.timeline.payload.items');

    inspectorApi($id, 'timeline', ['timeline_filter' => 'logs', 'timeline_search' => 'EVENT 119'])
        ->assertOk()
        ->assertJsonPath('profile.inspectors.timeline.payload.matching_item_count', 1)
        ->assertJsonPath('profile.inspectors.timeline.payload.items.0.id', 'logs-118')
        ->assertJsonPath('profile.inspectors.timeline.payload.has_more', false)
        ->assertJsonPath('profile.inspectors.timeline.payload.total_item_count', 122);

    inspectorApi($id, 'timeline', ['timeline_filter' => 'logs', 'timeline_search' => 'no such activity'])
        ->assertOk()
        ->assertJsonPath('profile.inspectors.timeline.payload.items', [])
        ->assertJsonPath('profile.inspectors.timeline.payload.matching_item_count', 0);
});

it('rejects unknown inspectors and malformed timeline requests', function (string $inspector, array $query) {
    $id = $this->get('/profiled', ['Accept' => 'text/html'])->headers->get('X-NewDebugBar-Profile');

    inspectorApi($id, $inspector, $query)->assertUnprocessable();
})->with([
    'captured overview diagnostics' => ['overview', []],
    'unknown inspector' => ['nonexistent', []],
    'unknown timeline filter' => ['timeline', ['timeline_filter' => 'everything']],
    'list timeline filter' => ['timeline', ['timeline_filter' => ['all']]],
    'oversized search' => ['timeline', ['timeline_search' => str_repeat('x', 501)]],
    'list search' => ['timeline', ['timeline_search' => ['x']]],
    'zero limit' => ['timeline', ['timeline_limit' => 0]],
    'negative limit' => ['timeline', ['timeline_limit' => -50]],
    'fractional limit' => ['timeline', ['timeline_limit' => '50.5']],
    'oversized limit' => ['timeline', ['timeline_limit' => '10000000']],
]);

it('accepts empty timeline parameters that host middleware turns into null', function () {
    $id = $this->get('/profiled', ['Accept' => 'text/html'])->headers->get('X-NewDebugBar-Profile');

    $this->getJson("/__newdebugbar/api/profiles/{$id}/inspectors/timeline?timeline_filter=&timeline_search=&timeline_limit=")
        ->assertOk()
        ->assertJsonPath('profile.inspectors.timeline.payload.filter', 'key')
        ->assertJsonPath('profile.inspectors.timeline.payload.limit', 50);
});

it('keeps view data out of the views inspector until its exact render asks', function () {
    $id = $this->get('/profiled-context', ['Accept' => 'text/html'])
        ->assertOk()
        ->headers->get('X-NewDebugBar-Profile');

    $response = inspectorApi($id, 'views')->assertOk();
    $views = collect($response->json('profile.inspectors.views.payload.groups'))->flatMap(fn (array $group): array => $group['items']);

    expect($views)->not->toBeEmpty()
        ->and($views->every(fn (array $view): bool => ! array_key_exists('data', $view)))->toBeTrue()
        ->and(collect($response->json('profile.inspectors.views.payload.items'))->every(fn (array $view): bool => ! array_key_exists('data', $view)))->toBeTrue()
        ->and($response->getContent())->not->toContain('view-data-value');

    $this->getJson("/__newdebugbar/api/profiles/{$id}/views/1")
        ->assertOk()
        ->assertJsonPath('data.label', 'Context view')
        ->assertJsonPath('data.private_value', 'view-data-value')
        ->assertJsonPath('data.rows', [['reference' => 'NL-1042', 'ready' => true, 'version_count' => 2]]);

    $this->getJson("/__newdebugbar/api/profiles/{$id}/views/999")->assertNotFound();
    $this->getJson("/__newdebugbar/api/profiles/{$id}/views/0")->assertNotFound();
});

it('keeps a data-heavy profile summary small', function () {
    $privateValue = 'heavy-view-private-'.Str::random(24);
    $id = storeApiProfile([
        'views' => [
            'label' => 'Views',
            'summary' => ['count' => 50],
            'payload' => ['items' => array_map(fn (int $index): array => [
                'name' => 'reports.row-'.$index,
                'path' => '/views/reports/row-'.$index.'.blade.php',
                'duration_ms' => 1.5,
                'data' => ['private_value' => $privateValue, 'payload' => str_repeat('x', 20_000)],
            ], range(1, 50))],
        ],
    ], ['duration_ms' => 100, 'peak_memory_mb' => 12]);

    $summary = $this->getJson("/__newdebugbar/api/profiles/{$id}")->assertOk()->getContent();
    $views = inspectorApi($id, 'views')->assertOk()->getContent();

    expect(strlen($summary))->toBeLessThan(50_000)
        ->and($summary)->not->toContain($privateValue)
        ->and(strlen($views))->toBeLessThan(250_000)
        ->and($views)->not->toContain($privateValue);
});

it('summarizes another request without changing what the bar selected', function () {
    $this->get('/profiled', ['Accept' => 'text/html'])->assertOk();
    $nextId = $this->get('/profiled-next', ['Accept' => 'text/html'])
        ->assertOk()
        ->headers->get('X-NewDebugBar-Profile');

    $this->getJson("/__newdebugbar/api/profiles/{$nextId}/notice")
        ->assertOk()
        ->assertJsonPath('summary.id', $nextId)
        ->assertJsonPath('summary.path', '/profiled-next')
        ->assertJsonMissingPath('summary.inspectors');

    // Switching profiles loads the full summary of the exact profile.
    $this->getJson("/__newdebugbar/api/profiles/{$nextId}")
        ->assertOk()
        ->assertJsonPath('summary.id', $nextId)
        ->assertJsonPath('summary.path', '/profiled-next')
        ->assertJsonPath('summary.inspectors.0.key', 'request');
});

it('lists recent API requests from other clients without pages or runtime profiles', function () {
    $this->get('/profiled', ['Accept' => 'text/html'])->assertOk();
    $apiId = $this->postJson('/api/plain-json')
        ->assertOk()
        ->headers->get('X-NewDebugBar-Profile');
    $store = app(ProfileStore::class);
    $worker = $store->get($apiId);
    $worker['id'] = (string) Str::uuid();
    $worker['profile_type'] = 'queue';
    $store->put($worker);

    $profiles = collect($this->getJson('/__newdebugbar/api/recent')->assertOk()->json('profiles'));

    expect($profiles->pluck('id')->all())->toBe([$apiId])
        ->and($profiles->first())
        ->method->toBe('POST')
        ->path->toBe('/api/plain-json')
        ->request_type_label->toBe('JSON')
        ->query_count->toBe(0)
        ->and(is_numeric($profiles->first()['duration_ms']))->toBeTrue();
});

it('refreshes bounded background activity and returns completed worker profiles', function () {
    $originId = $this->get('/profiled-queued-communications', ['Accept' => 'text/html'])
        ->assertOk()
        ->headers->get('X-NewDebugBar-Profile');
    $store = app(ProfileStore::class);
    $origin = $store->get($originId);
    $presented = app(ProfilePresenter::class)->present($origin);
    $correlationKeys = collect($presented['background_activity']['items'])->pluck('key')->all();
    $workerId = (string) Str::uuid();
    $worker = $origin;
    $worker['id'] = $workerId;
    $worker['profile_type'] = 'queue';
    $worker['inspectors']['request']['label'] = 'Runtime';
    $worker['inspectors']['request']['summary'] = ['method' => 'CLI', 'status' => 0, 'exit_code' => 0];
    $worker['inspectors']['request']['payload'] = [
        'path' => 'queue:SendQueuedMailable',
        'runtime_type' => 'queue',
        'name' => 'SendQueuedMailable',
        'context' => ['correlation_key' => $correlationKeys[0], 'origin_profile_id' => $originId],
    ];
    $store->put($worker);

    $this->getJson("/__newdebugbar/api/profiles/{$originId}")
        ->assertOk()
        ->assertJsonPath('summary.background_pending', true);

    app(BackgroundActivityStore::class)->recordOutcome($correlationKeys[0], 'sent', $workerId, 1);
    app(BackgroundActivityStore::class)->recordOutcome($correlationKeys[1], 'failed', $workerId, 1, RuntimeException::class);

    $this->getJson("/__newdebugbar/api/profiles/{$originId}/related")
        ->assertOk()
        ->assertJsonPath('summary.background_pending', false)
        ->assertJsonPath('summary.related_profile_ids', [$workerId])
        ->assertJsonPath('summary.inspectors.0.key', 'request')
        ->assertJsonCount(1, 'related_profiles')
        ->assertJsonPath('related_profiles.0.id', $workerId)
        ->assertJsonPath('related_profiles.0.request_type', 'queue');
});

it('skips related profiles that have expired', function () {
    $originId = $this->get('/profiled-queued-communications', ['Accept' => 'text/html'])->headers->get('X-NewDebugBar-Profile');
    $store = app(ProfileStore::class);
    $presented = app(ProfilePresenter::class)->present($store->get($originId));
    $key = collect($presented['background_activity']['items'])->pluck('key')->first();

    app(BackgroundActivityStore::class)->recordOutcome($key, 'sent', MISSING_PROFILE_ID, 1);

    $this->getJson("/__newdebugbar/api/profiles/{$originId}/related")
        ->assertOk()
        ->assertJsonPath('summary.related_profile_ids', [MISSING_PROFILE_ID])
        ->assertJsonPath('related_profiles', []);
});

it('returns not found when a profile has expired or its id is malformed', function (string $uri) {
    $this->getJson($uri)->assertNotFound();
})->with([
    'summary' => ['/__newdebugbar/api/profiles/'.MISSING_PROFILE_ID],
    'notice' => ['/__newdebugbar/api/profiles/'.MISSING_PROFILE_ID.'/notice'],
    'related' => ['/__newdebugbar/api/profiles/'.MISSING_PROFILE_ID.'/related'],
    'inspector' => ['/__newdebugbar/api/profiles/'.MISSING_PROFILE_ID.'/inspectors/request'],
    'view data' => ['/__newdebugbar/api/profiles/'.MISSING_PROFILE_ID.'/views/1'],
    'malformed id' => ['/__newdebugbar/api/profiles/not-a-profile/notice'],
    'path traversal' => ['/__newdebugbar/api/profiles/..%2F..%2Fcomposer/notice'],
    'non-v4 id' => ['/__newdebugbar/api/profiles/550e8400-e29b-11d4-a716-446655440000'],
]);

it('explains a captured query only for requests that carry the debug bar header', function () {
    $id = $this->get('/profiled', ['Accept' => 'text/html'])->headers->get('X-NewDebugBar-Profile');
    $uri = "/__newdebugbar/api/profiles/{$id}/queries/1/explain";

    $this->postJson($uri)->assertForbidden();
    $this->postJson($uri, headers: ['X-NewDebugBar' => 'true'])->assertForbidden();
    $this->getJson($uri, ['X-NewDebugBar' => '1'])->assertMethodNotAllowed();

    $this->postJson($uri, headers: ['X-NewDebugBar' => '1'])
        ->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('execution', 1)
        ->assertJsonPath('explain.driver', 'sqlite')
        ->assertJsonPath('error', null);

    $this->postJson("/__newdebugbar/api/profiles/{$id}/queries/999/explain", headers: ['X-NewDebugBar' => '1'])->assertNotFound();
    $this->postJson("/__newdebugbar/api/profiles/{$id}/queries/0/explain", headers: ['X-NewDebugBar' => '1'])->assertNotFound();
    $this->postJson('/__newdebugbar/api/profiles/'.MISSING_PROFILE_ID.'/queries/1/explain', headers: ['X-NewDebugBar' => '1'])->assertNotFound();
});

it('reports why a captured query cannot be explained', function () {
    $id = storeApiProfile([
        'queries' => ['label' => 'Queries', 'summary' => ['count' => 1, 'duration_ms' => 1], 'payload' => ['items' => [
            ['sql' => 'delete from users', 'bindings' => [], 'duration_ms' => 1, 'connection' => 'testing'],
        ]]],
    ]);

    $this->postJson("/__newdebugbar/api/profiles/{$id}/queries/1/explain", headers: ['X-NewDebugBar' => '1'])
        ->assertOk()
        ->assertJsonPath('execution', 1)
        ->assertJsonPath('explain', null)
        ->assertJson(fn ($json) => $json->whereType('error', 'string')->etc());
});
