<?php

use Illuminate\Database\QueryException;
use NewDebugBar\Analysis\QueryAnalyzer;
use NewDebugBar\Presentation\ProfilePresenter;
use NewDebugBar\Presentation\QueryRecordPresenter;
use NewDebugBar\Storage\ProfileStore;
use NewDebugBar\Support\QueryExplainer;

it('offers runnable SQL and runs manual SQLite explain with the default bindings', function () {
    $response = $this->get('/profiled', ['Accept' => 'text/html'])->assertOk();
    $id = $response->headers->get('X-NewDebugBar-Profile');
    $stored = app(ProfileStore::class)->get($id);
    $profile = app(ProfilePresenter::class)->present($stored);
    $query = $profile['inspectors']['queries']['payload']['items'][0];

    expect($query)
        ->driver->toBe('sqlite')
        ->binding_policy->toBe('full')
        ->bindings_complete->toBeTrue()
        ->source_preserved->toBeTrue()
        ->runnable_available->toBeTrue()
        ->runnable_sql->toContain('select 1 as number')
        ->and($profile['inspectors']['queries']['summary']['count'])->toBe(3);

    $result = app(QueryExplainer::class)->explain($query);

    expect($result)
        ->driver->toBe('sqlite')
        ->mode->toBe('EXPLAIN QUERY PLAN')
        ->rows->not->toBeEmpty();

    $this->postJson("/__newdebugbar/api/profiles/{$id}/queries/1/explain", headers: ['X-NewDebugBar' => '1'])
        ->assertOk()
        ->assertJsonPath('execution', 1)
        ->assertJsonPath('explain.driver', 'sqlite')
        ->assertJsonPath('explain.mode', 'EXPLAIN QUERY PLAN')
        ->assertJsonPath('error', null);
});

it('rejects unsafe incomplete and mutating explain requests before touching the database', function (array $query) {
    expect(fn () => app(QueryExplainer::class)->explain($query))
        ->toThrow(InvalidArgumentException::class);
})->with([
    'safe binding policy' => [[
        'sql' => 'select ? as number',
        'bindings' => [1],
        'source_preserved' => true,
        'binding_policy' => 'safe',
        'bindings_complete' => false,
        'connection' => 'testing',
    ]],
    'multiple statements' => [[
        'sql' => 'select 1; delete from users',
        'bindings' => [],
        'source_preserved' => true,
        'binding_policy' => 'full',
        'bindings_complete' => true,
        'connection' => 'testing',
    ]],
    'write query' => [[
        'sql' => 'delete from users',
        'bindings' => [],
        'source_preserved' => true,
        'binding_policy' => 'full',
        'bindings_complete' => true,
        'connection' => 'testing',
    ]],
]);

it('turns database failures into safe actionable guidance', function (string $sql, string $message, string $privateValue) {
    $query = [
        'sql' => $sql,
        'bindings' => [],
        'source_preserved' => true,
        'binding_policy' => 'full',
        'bindings_complete' => true,
        'connection' => 'testing',
    ];

    try {
        app(QueryExplainer::class)->explain($query);
    } catch (InvalidArgumentException $exception) {
        $failure = $exception;
    }

    expect($failure ?? null)
        ->toBeInstanceOf(InvalidArgumentException::class)
        ->and($failure->getMessage())
        ->toBe($message)
        ->not->toContain($privateValue, 'SQLSTATE', 'Database:')
        ->and($failure->getPrevious())
        ->toBeInstanceOf(QueryException::class);
})->with([
    'missing SQLite function' => [
        'select ndb_private_pause() as ready',
        'SQLite cannot find a function used by this query. Check its name or register it on the query connection, then reload.',
        'ndb_private_pause',
    ],
    'missing SQLite table' => [
        'select * from ndb_private_table',
        'SQLite cannot find a table used by this query. Check the database and confirm the table still exists.',
        'ndb_private_table',
    ],
    'unclassified database failure' => [
        'select from ndb_private_table',
        'Copy the query from Overview, then run EXPLAIN in your database client against the same database.',
        'ndb_private_table',
    ],
]);

it('explains when the query database connection is no longer available', function () {
    $query = [
        'sql' => 'select 1',
        'bindings' => [],
        'source_preserved' => true,
        'binding_policy' => 'full',
        'bindings_complete' => true,
        'connection' => 'private_missing_connection',
    ];

    expect(fn () => app(QueryExplainer::class)->explain($query))
        ->toThrow(
            InvalidArgumentException::class,
            'This query\'s database connection is unavailable. Restore it, then reload.',
        );
});

it('keeps repeated execution evidence in one bounded workspace record', function () {
    $queries = array_map(fn (int $binding): array => [
        'sql' => 'select ? as number',
        'bindings' => [$binding],
        'bindings_complete' => true,
        'binding_policy' => 'full',
        'runnable_available' => true,
        'runnable_sql' => 'select '.$binding.' as number',
        'duration_ms' => $binding,
        'connection' => 'testing',
        'driver' => 'sqlite',
        'callsite' => ['file' => '/app/Queries/NumberQuery.php', 'line' => 14],
        'stack' => [['file' => '/app/Queries/NumberQuery.php', 'line' => 14, 'function' => 'loadNumbers']],
    ], [1, 2, 3]);
    $analysis = (new QueryAnalyzer)->analyze($queries, 20);
    $inspector = [
        'summary' => [...$analysis['summary'], 'count' => 3],
        'payload' => $analysis,
    ];

    $records = app(QueryRecordPresenter::class)->present($inspector['payload']);

    expect($records)
        ->toHaveCount(1)
        ->and($records[0]['repeated'])->toBeTrue()
        ->and($records[0]['count'])->toBe(3)
        ->and($records[0]['driver'])->toBe('sqlite')
        ->and($records[0]['executions'])->toHaveCount(3)
        ->and(array_column($records[0]['executions'], 'driver'))->toBe(['sqlite', 'sqlite', 'sqlite'])
        ->and($records[0]['executions'][2])->not->toHaveKeys(['bindings', 'runnable_sql', 'bindings_complete'])
        ->and($records[0]['executions'][2])->not->toHaveKey('source_short_label')
        ->and($records[0]['executions'][2]['display_sql'])->toBe('select 3 as number')
        ->and($records[0]['executions'][2]['source_label'])->toBe('/app/Queries/NumberQuery.php:14')
        ->and($records[0]['executions'][2]['stack'][0]['function'])->toBe('loadNumbers')
        ->and($records[0]['executions'][2]['display_sql_complete'])->toBeTrue();
});

it('formats query durations with an adaptive unit', function () {
    $items = collect([
        0.0,
        0.19,
        0.99,
        1.0,
        12.34,
        999.99,
        1000.0,
        1453.51,
    ])->map(fn (float $duration, int $index): array => [
        'execution' => $index + 1,
        'sql' => 'select '.$index,
        'normalized_sql' => 'select '.$index,
        'duration_ms' => $duration,
        'connection' => 'testing',
        'driver' => 'sqlite',
        'query_type' => 'read',
        'bindings' => [],
    ])->all();
    $inspector = [
        'summary' => ['count' => count($items), 'total_time_ms' => 1466.04],
        'payload' => ['items' => $items, 'repeated_groups' => []],
    ];
    $records = app(QueryRecordPresenter::class)->present($inspector['payload']);

    expect(array_column($records, 'duration_label'))
        ->toBe(['0 µs', '190 µs', '990 µs', '1 ms', '12.34 ms', '999.99 ms', '1 s', '1.45 s']);
});
