<?php

use Illuminate\Support\Str;
use NewDebugBar\Analysis\ProfileAnalyzer;
use NewDebugBar\Analysis\QueryAnalyzer;
use NewDebugBar\Mcp\NewDebugBarServer;
use NewDebugBar\Mcp\Tools\GetDebugProfileData;
use NewDebugBar\Presentation\ProfilePresenter;
use NewDebugBar\Presentation\QueryRecordPresenter;
use NewDebugBar\Storage\ProfileStore;
use NewDebugBar\Tests\Support\McpResponse;

it('reuses the query analysis that prepared the profile when building findings', function () {
    app()->instance(QueryAnalyzer::class, new QueryAnalyzer(slowQueryMs: 50));
    // A second analysis with this fallback analyzer would lose the slow-query finding.
    app()->instance(ProfileAnalyzer::class, new ProfileAnalyzer(new QueryAnalyzer(slowQueryMs: 1_000)));
    $profile = app(ProfilePresenter::class)->present([
        'id' => (string) Str::uuid(),
        'metrics' => ['duration_ms' => 200],
        'inspectors' => ['queries' => [
            'label' => 'Queries',
            'summary' => ['count' => 1],
            'payload' => ['items' => [['sql' => 'select 1', 'duration_ms' => 60]]],
        ]],
    ]);

    expect($profile['inspectors']['queries']['payload']['records'][0]['slow'])->toBeTrue()
        ->and(array_column($profile['findings'], 'rule_id'))->toContain('query.slow')
        ->and(array_column(app(ProfileAnalyzer::class)->analyze($profile), 'rule_id'))->not->toContain('query.slow');
});

it('preserves grouped execution identities in prepared records', function () {
    $analysis = (new QueryAnalyzer)->analyze([
        ['sql' => 'select ?', 'bindings' => [1], 'runnable_available' => true, 'runnable_sql' => 'select 1'],
        ['sql' => 'update trips set active = 1'],
        ['sql' => 'select ?', 'bindings' => [2], 'runnable_available' => true, 'runnable_sql' => 'select 2'],
    ]);
    $presenter = new QueryRecordPresenter;
    $records = $presenter->present($analysis);

    expect(array_column($records, 'execution'))->toBe([1, 2])
        ->and(array_column($records[0]['executions'], 'execution'))->toBe([1, 3])
        ->and($records[0]['executions'][0]['explain'])->toBeNull()
        ->and($records[1]['executions'][0]['explain_available'])->toBeFalse()
        ->and($presenter->filters($records))->toBe([
            'all' => ['All', 3],
            'attention' => ['Needs attention', 2],
            'read' => ['Reads', 2],
            'write' => ['Writes', 1],
        ]);
});

it('exposes prepared query records and per-run evidence through bounded MCP paths', function () {
    $profileId = $this->get('/profiled', ['Accept' => 'text/html'])->assertOk()->headers->get('X-NewDebugBar-Profile');
    $profile = app(ProfilePresenter::class)->present(app(ProfileStore::class)->get($profileId));
    $record = $profile['inspectors']['queries']['payload']['records'][0];
    $run = $record['executions'][1];

    foreach ([
        '/key' => $record['key'],
        '/count' => 3,
        '/duration_label' => $record['duration_label'],
        '/executions/1/execution' => 2,
        '/executions/1/display_sql' => $run['display_sql'],
        '/executions/1/source_label' => $run['source_label'],
        '/executions/1/explain_available' => $run['explain_available'],
    ] as $path => $value) {
        $content = McpResponse::structuredContent(NewDebugBarServer::tool(GetDebugProfileData::class, [
            'profile_id' => $profileId,
            'path' => '/inspectors/queries/payload/records/0'.$path,
        ])->assertOk());
        expect($content['data']['value'])->toBe($value);
    }
});
