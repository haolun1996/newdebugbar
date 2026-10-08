<?php

namespace NewDebugBar\Presentation;

/** Shapes presented profiles into the summary and per-inspector data the browser bar renders. */
final class DebugBarPresenter
{
    public const DEFAULT_INSPECTOR = 'request';

    public const TIMELINE_PAGE_SIZE = 50;

    private const TIMELINE_KEY_INSPECTORS = ['request', 'queries', 'http_client', 'exceptions', 'authorization', 'validation', 'queue'];

    /** @var array<string, string> */
    private const INSPECTOR_DESCRIPTIONS = [
        'authorization' => 'See what Laravel allowed or denied, for which user and arguments, then inspect the policy or Gate and source.',
        'cache' => 'Review cache reads, writes, deletes, stores, results, and timing.',
        'events' => 'See which events Laravel dispatched, where they came from, and how they were handled.',
        'exceptions' => 'Inspect reported exceptions, application frames, and the code path that failed.',
        'http_client' => 'Review outbound HTTP requests, responses, timing, and their source.',
        'logs' => 'Review log messages, their context, and the application code that wrote them.',
        'livewire' => 'Inspect Livewire activity and mounted components.',
        'mail' => 'Inspect mail created during the request, including recipients, metadata, and previews.',
        'models' => 'Review Eloquent retrievals, writes, repeated records, and application sources.',
        'notifications' => 'Inspect notification recipients, channel deliveries, failures, payloads, and source code.',
        'queries' => 'Find repeated work, slow SQL, and the application code that triggered it.',
        'queue' => 'Review queued work, its connection and queue, and what happened during dispatch.',
        'redis' => 'Inspect direct Redis commands, their keys, connections, and timing.',
        'request' => 'Inspect the selected request and switch to later requests from this page or recent API requests from other clients.',
        'timeline' => 'Follow important work in the order it happened across the request.',
        'validation' => 'Review failed fields, messages, rules, and where validation came from.',
        'views' => 'See which Blade templates rendered and the data each received. Use this to spot missing variables, unexpected partials, and repeated renders.',
    ];

    public function __construct(
        private readonly ProfileSummaryPresenter $summaries,
        private readonly QueryRecordPresenter $queries,
    ) {}

    /** @return list<string> */
    public function timelineFilters(): array
    {
        return ['all', 'key', ...array_keys(self::INSPECTOR_DESCRIPTIONS)];
    }

    /**
     * The toolbar summary: request facts plus one navigation entry per inspector.
     *
     * @param  array<string, mixed>  $profile  A presented profile.
     * @return array<string, mixed>
     */
    public function summary(array $profile, string $profileId): array
    {
        $inspectors = $profile['inspectors'] ?? [];
        $findings = is_array($profile['findings'] ?? null) ? $profile['findings'] : [];
        $summary = $this->summaries->present($profile);
        $findingCounts = [];
        $inspectorLinks = [];
        $inspectorCounts = [];

        foreach ($findings as $finding) {
            $inspectorKey = is_array($finding) ? ($finding['inspector'] ?? null) : null;

            if (is_string($inspectorKey)) {
                $findingCounts[$inspectorKey] = ($findingCounts[$inspectorKey] ?? 0) + 1;
            }
        }

        foreach ($inspectors as $key => $inspector) {
            if ($key === 'overview') {
                continue;
            }

            $label = $key === 'request'
                ? 'Requests'
                : (string) ($inspector['label'] ?? ucfirst($key));
            $count = match ($key) {
                'models' => $inspector['summary']['activity_count'] ?? $inspector['summary']['count'] ?? null,
                'notifications' => $inspector['summary']['notification_count'] ?? $inspector['summary']['count'] ?? null,
                default => $inspector['summary']['count'] ?? null,
            };
            $dropped = (int) ($inspector['summary']['dropped_count'] ?? 0);
            $secondaryDropped = (int) ($inspector['summary']['transaction_dropped_count'] ?? 0);
            $truncated = (bool) ($inspector['summary']['truncated'] ?? false)
                || $dropped > 0
                || $secondaryDropped > 0;
            $incomplete = (bool) ($inspector['payload']['incomplete'] ?? false);
            $findingCount = $findingCounts[$key] ?? 0;
            $attention = $findingCount > 0 || $truncated || $incomplete;
            $inspectorLinks[] = [
                'key' => $key,
                'label' => $label,
                'description' => $this->inspectorDescription((string) $key, $label),
                'layout' => 'workspace',
                'count' => $count,
                'active' => $count === null || (int) $count > 0 || $attention,
                'attention' => $attention,
                'finding_count' => $findingCount,
                'truncated' => $truncated,
                'incomplete' => $incomplete,
            ];
            $inspectorCounts[$key] = $count;
        }

        return [
            ...$summary,
            'id' => $summary['id'] ?? $profileId,
            'theme' => config('newdebugbar.theme', 'system'),
            'environment' => (string) ($summary['environment'] ?? app()->environment()),
            'method' => $summary['method'] ?? 'GET',
            'path' => $summary['path'] ?? '/',
            'inspectors' => $inspectorLinks,
            'inspector_counts' => $inspectorCounts,
        ];
    }

    /**
     * The profile slice one inspector renders: shared profile facts plus only that inspector.
     *
     * @param  array<string, mixed>  $profile  A presented profile.
     * @param  array{filter?: string, search?: string, limit?: int}  $timeline
     * @return array<string, mixed>|null Null when the profile has no such inspector.
     */
    public function inspector(array $profile, string $key, array $timeline = []): ?array
    {
        $inspector = $profile['inspectors'][$key] ?? null;

        if ($key === 'overview' || ! is_array($inspector)) {
            return null;
        }

        if ($key === 'timeline') {
            $inspector['payload'] = $this->timelinePage((array) ($inspector['payload'] ?? []), $timeline);
        }

        if ($key === 'views') {
            // Template data can be large and private, so each render's data loads only when it is opened.
            foreach (array_keys((array) ($inspector['payload']['items'] ?? [])) as $viewIndex) {
                unset($inspector['payload']['items'][$viewIndex]['data']);
            }

            foreach ((array) ($inspector['payload']['groups'] ?? []) as $groupIndex => $group) {
                foreach (array_keys((array) ($group['items'] ?? [])) as $viewIndex) {
                    unset($inspector['payload']['groups'][$groupIndex]['items'][$viewIndex]['data']);
                }
            }
        }

        if ($key === 'queries') {
            $records = $inspector['payload']['records'] ?? $this->queries->present((array) ($inspector['payload'] ?? []));
            $inspector['payload']['records'] = $records;
            $inspector['payload']['record_filters'] = $this->queries->filters($records);
        }

        if ($key === 'notifications') {
            // Mail deliveries link to their message only while the mail inspector still retains it.
            $inspector['payload']['retained_mail_message_ids'] = array_values(array_filter(
                array_column((array) ($profile['inspectors']['mail']['payload']['items'] ?? []), 'transport_message_id'),
                static fn (mixed $id): bool => is_string($id) && $id !== '',
            ));
        }

        $shared = $profile;
        $shared['inspectors'] = [$key => $inspector];

        return $shared;
    }

    /**
     * Template data for one rendered view, loaded only when a developer opens it.
     *
     * @param  array<string, mixed>  $profile  A presented profile.
     * @return array<string, mixed>|null
     */
    public function viewData(array $profile, int $renderOrder): ?array
    {
        foreach ((array) ($profile['inspectors']['views']['payload']['groups'] ?? []) as $group) {
            foreach ((array) ($group['items'] ?? []) as $view) {
                if ((int) ($view['render_order'] ?? 0) === $renderOrder) {
                    return is_array($view['data'] ?? null) ? $view['data'] : [];
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array{filter?: string, search?: string, limit?: int}  $options
     * @return array<string, mixed>
     */
    private function timelinePage(array $payload, array $options): array
    {
        $items = (array) ($payload['items'] ?? []);
        $filter = $options['filter'] ?? 'key';
        $limit = max(self::TIMELINE_PAGE_SIZE, (int) ($options['limit'] ?? self::TIMELINE_PAGE_SIZE));
        $payload['available_inspectors'] = array_values(array_unique(array_column($items, 'inspector')));
        $payload['total_item_count'] = count($items);
        $payload['total_duration_ms'] = max(0.001, ...array_column($items, 'at_ms'));
        $items = $this->filteredTimelineItems($items, $filter, (string) ($options['search'] ?? ''));
        $payload['matching_item_count'] = count($items);
        $payload['items'] = array_slice($items, 0, $limit);
        $payload['has_more'] = count($items) > $limit;
        $payload['filter'] = $filter;
        $payload['search'] = (string) ($options['search'] ?? '');
        $payload['limit'] = $limit;

        return $payload;
    }

    /** @param array<int, array<string, mixed>> $items @return array<int, array<string, mixed>> */
    private function filteredTimelineItems(array $items, string $filter, string $search): array
    {
        $search = mb_strtolower(trim($search));

        return array_values(array_filter($items, function (array $item) use ($filter, $search): bool {
            $inspector = $item['inspector'];
            $matchesInspector = $filter === 'all'
                || ($filter === 'key' && in_array($inspector, self::TIMELINE_KEY_INSPECTORS, true))
                || $inspector === $filter;
            $source = $item['source'] ?? [];
            $text = mb_strtolower(implode(' ', [
                $item['label'],
                $item['inspector_label'] ?? str_replace('_', ' ', $inspector),
                isset($source['file']) ? $source['file'].':'.($source['line'] ?? 1) : '',
            ]));

            return $matchesInspector && ($search === '' || str_contains($text, $search));
        }));
    }

    private function inspectorDescription(string $key, string $label): string
    {
        return self::INSPECTOR_DESCRIPTIONS[$key]
            ?? 'Review the collected '.strtolower($label).' details for this request.';
    }
}
