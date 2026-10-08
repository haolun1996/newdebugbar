<?php

use Illuminate\Support\Str;
use NewDebugBar\Presentation\QueueActivityPresenter;
use NewDebugBar\Presentation\RedisCommandPresenter;

/** @return array<string, mixed> */
function queueInspectorFixture(string $profileId, string $workerId): array
{
    $inspector = [
        'summary' => [
            'count' => 2,
            'queued_count' => 1,
            'executed_count' => 1,
            'failed_count' => 1,
            'duration_ms' => 4.25,
        ],
        'payload' => ['items' => [
            [
                'kind' => 'queued',
                'status' => 'sent',
                'job' => 'App\\Jobs\\SendTripReceipt',
                'connection' => 'redis',
                'queue' => 'mail',
                'job_id' => 'job-41',
                'delay_seconds' => 30,
                'duration_ms' => 0.0,
                'at_ms' => 12.5,
                'is_origin' => true,
                'worker_profile_id' => $workerId,
                'communication_type' => 'mail',
                'communication_class' => 'App\\Mail\\TripReceipt',
                'channels' => ['mail'],
                'recipient_count' => 1,
                'attempts' => [[
                    'attempt' => 1,
                    'status' => 'sent',
                    'profile_id' => $workerId,
                    'recorded_at' => '2026-08-26T10:00:00+02:00',
                ]],
            ],
            [
                'kind' => 'failed',
                'status' => 'failed',
                'job' => 'App\\Jobs\\RefreshTrip',
                'connection' => 'sync',
                'queue' => 'sync',
                'duration_ms' => 4.25,
                'at_ms' => 18.75,
                'attempt' => 1,
                'exception_class' => RuntimeException::class,
            ],
        ]],
    ];
    $inspector['payload']['records'] = app(QueueActivityPresenter::class)->present($inspector['payload']['items'], $profileId);

    return $inspector;
}

/** @return array<string, mixed> */
function redisInspectorFixture(string $protected): array
{
    $inspector = [
        'summary' => ['count' => 2, 'failed_count' => 1, 'duration_ms' => 1.25],
        'payload' => ['items' => [
            [
                'command' => 'GET',
                'connection' => 'default',
                'duration_ms' => 1.25,
                'at_ms' => 8.5,
                'failed' => false,
                'key_count' => 1,
                'key_retained' => 1,
                'key_dropped' => 0,
                'key_policy' => 'full',
                'keys' => ['trip:kyoto'],
                'key_hashes' => [$protected],
                'callsite' => [
                    'file' => 'app/Services/TripCache.php',
                    'line' => 42,
                ],
            ],
            [
                'command' => 'HGET',
                'connection' => 'sessions',
                'duration_ms' => 0.0,
                'at_ms' => 9.0,
                'failed' => true,
                'exception_class' => RuntimeException::class,
                'key_count' => 1,
                'key_retained' => 1,
                'key_dropped' => 0,
                'key_policy' => 'hash',
                'keys' => [],
                'key_hashes' => [$protected],
                'callsite' => ['file' => 'app/Services/SessionStore.php'],
            ],
        ]],
    ];

    $inspector['payload']['records'] = app(RedisCommandPresenter::class)->present($inspector['payload']['items']);

    return $inspector;
}

it('normalizes queue lifecycle and related worker evidence for one active detail', function () {
    $workerId = (string) Str::uuid();
    $items = queueInspectorFixture((string) Str::uuid(), $workerId)['payload']['records'];

    expect($items)->toHaveCount(2)
        ->and($items[0])
        ->status_group->toBe('completed')
        ->related_profile_id->toBe($workerId)
        ->related_inspector->toBe('mail')
        ->at_label->toBe('12.5 ms')
        ->display_channels->toBe([])
        ->attempts->toHaveCount(1)
        ->and($items[0]['attempts'][0]['sequence'])->toBe(1)
        ->and($items[0]['attempts'][0]['attempt'])->toBe(1)
        ->and($items[0]['attempts'][0]['status'])->toBe('sent')
        ->and($items[0]['attempts'][0]['profile_id'])->toBe($workerId)
        ->and($items[1])
        ->status_group->toBe('failed')
        ->duration_label->toBe('4.25 ms')
        ->exception_class->toBe(RuntimeException::class)
        ->attempts->toBe([]);
});

it('keeps protected Redis identifiers hashed and failure timing truthful', function () {
    $protected = '18b0b12c34d56e78';
    $items = redisInspectorFixture($protected)['payload']['records'];

    expect($items[0])
        ->callsite->toBe(['file' => 'app/Services/TripCache.php', 'line' => 42])
        ->source_label->toBe('app/Services/TripCache.php:42')
        ->key_label->toBe('trip:kyoto')
        ->and($items[1])
        ->key_label->toBe('1 protected key')
        ->duration_label->toBe('—')
        ->key_count->toBe(1)
        ->key_hashes->toBe([$protected])
        ->callsite->toBe(['file' => 'app/Services/SessionStore.php', 'line' => null])
        ->source_label->toBe('app/Services/SessionStore.php');
});
