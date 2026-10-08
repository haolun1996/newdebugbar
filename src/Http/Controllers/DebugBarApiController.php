<?php

namespace NewDebugBar\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use NewDebugBar\Presentation\DebugBarPresenter;
use NewDebugBar\Presentation\ProfilePresenter;
use NewDebugBar\Presentation\ProfileSummaryPresenter;
use NewDebugBar\Storage\ProfileStore;
use NewDebugBar\Support\QueryExplainer;

/** Serves stored profiles to the browser bar as JSON, one summary or inspector at a time. */
final class DebugBarApiController
{
    public function __construct(
        private readonly ProfileStore $store,
        private readonly ProfilePresenter $presenter,
        private readonly ProfileSummaryPresenter $summaries,
        private readonly DebugBarPresenter $bar,
    ) {}

    public function summary(string $profile): JsonResponse
    {
        return $this->json(['summary' => $this->bar->summary($this->presented($profile), $profile)]);
    }

    /** A brief summary used to list a later request in the request switcher. */
    public function notice(string $profile): JsonResponse
    {
        return $this->json(['summary' => $this->summaries->present($this->presented($profile))]);
    }

    public function inspector(Request $request, string $profile, string $inspector): JsonResponse
    {
        // Host middleware such as ConvertEmptyStringsToNull may turn empty parameters into null.
        $filter = $request->query('timeline_filter') ?? 'key';
        $search = $request->query('timeline_search') ?? '';
        $limit = $request->query('timeline_limit') ?? (string) DebugBarPresenter::TIMELINE_PAGE_SIZE;

        abort_unless(is_string($filter) && in_array($filter, $this->bar->timelineFilters(), true), 422);
        abort_unless(is_string($search) && mb_strlen($search) <= 500, 422);
        abort_unless(is_string($limit) && preg_match('/\A[1-9][0-9]{0,5}\z/', $limit) === 1, 422);

        $presented = $this->bar->inspector($this->presented($profile), $inspector, [
            'filter' => $filter,
            'search' => $search,
            'limit' => (int) $limit,
        ]);
        abort_if($presented === null, 422);

        return $this->json(['profile_id' => $profile, 'inspector' => $inspector, 'profile' => $presented]);
    }

    public function viewData(string $profile, int $renderOrder): JsonResponse
    {
        abort_unless($renderOrder > 0, 422);
        $data = $this->bar->viewData($this->presented($profile), $renderOrder);
        abort_if($data === null, 404);

        return $this->json(['data' => $data]);
    }

    /** Refreshes the summary and the requests later linked to it, such as queued jobs. */
    public function related(string $profile): JsonResponse
    {
        $summary = $this->bar->summary($this->presented($profile), $profile);
        $relatedProfiles = [];

        foreach (array_slice((array) ($summary['related_profile_ids'] ?? []), 0, $this->store->maxProfiles()) as $relatedId) {
            if (! is_string($relatedId) || ! ProfileStore::validId($relatedId)) {
                continue;
            }

            $related = $this->store->get($relatedId);

            if ($related !== null) {
                $relatedProfiles[] = $this->summaries->present($this->presenter->present($related));
            }
        }

        return $this->json(['summary' => $summary, 'related_profiles' => $relatedProfiles]);
    }

    /** Recent API requests from any client, so a page can inspect calls it did not make. */
    public function recent(): JsonResponse
    {
        $profiles = [];

        foreach ($this->store->recent($this->store->maxProfiles()) as $profile) {
            $path = (string) ($profile['inspectors']['request']['payload']['path'] ?? '');

            if (($profile['profile_type'] ?? 'http') !== 'http' || ($path !== '/api' && ! str_starts_with($path, '/api/'))) {
                continue;
            }

            $profiles[] = $this->summaries->present($this->presenter->present($profile));
        }

        return $this->json(['profiles' => $profiles]);
    }

    public function explainQuery(Request $request, string $profile, int $execution, QueryExplainer $explainer): JsonResponse
    {
        // A custom header cannot be sent cross-site without a CORS preflight, which this route never grants.
        abort_unless($request->headers->get('X-NewDebugBar') === '1', 403);
        abort_unless($execution > 0, 422);

        $query = collect($this->presented($profile)['inspectors']['queries']['payload']['items'] ?? [])
            ->firstWhere('execution', $execution);
        abort_unless(is_array($query), 404);

        try {
            return $this->json(['execution' => $execution, 'explain' => $explainer->explain($query), 'error' => null]);
        } catch (InvalidArgumentException $exception) {
            return $this->json(['execution' => $execution, 'explain' => null, 'error' => $exception->getMessage()]);
        }
    }

    /** @return array<string, mixed> */
    private function presented(string $profile): array
    {
        $stored = $this->store->get($profile);
        abort_if($stored === null, 404);

        return $this->presenter->present($stored);
    }

    /** @param array<string, mixed> $data */
    private function json(array $data): JsonResponse
    {
        return new JsonResponse(
            $data,
            headers: ['Cache-Control' => 'no-store, private', 'X-Content-Type-Options' => 'nosniff'],
            options: JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRESERVE_ZERO_FRACTION,
        );
    }
}
