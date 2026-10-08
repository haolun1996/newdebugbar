<?php

namespace NewDebugBar\Support;

use Illuminate\Http\Response as LaravelResponse;
use NewDebugBar\Presentation\DebugBarPresenter;
use NewDebugBar\Presentation\ProfilePresenter;
use NewDebugBar\Storage\ProfileStore;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Adds the bar's mount point, its boot data, and the package assets to supported HTML responses. */
final class BarInjector
{
    public function __construct(
        private readonly AssetUrl $assets,
        private readonly ProfileStore $store,
        private readonly ProfilePresenter $presenter,
        private readonly DebugBarPresenter $bar,
    ) {}

    public function inject(Response $response, string $profileId): Response
    {
        if (! $this->supports($response)) {
            return $response;
        }

        $html = (string) $response->getContent();

        $stylesheet = e($this->assets->for('newdebugbar.css'));
        $script = e($this->assets->for('newdebugbar.js'));
        $boot = json_encode([
            'summary' => $this->bar->summary($this->presenter->present($this->store->get($profileId) ?? []), $profileId),
            'profile_limit' => $this->store->maxProfiles(),
            'api' => url('/__newdebugbar/api'),
        ], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

        $head = '<link rel="stylesheet" href="'.$stylesheet.'" data-navigate-once="true">';
        $body = '<div id="newdebugbar-mount" style="display:contents!important"></div>'
            .'<script type="application/json" id="newdebugbar-boot">'.$boot.'</script>'
            .'<script src="'.$script.'" data-navigate-once="true"></script>';
        // Callbacks keep `$` and `\` in the injected markup literal; they are not replacement references.
        if (preg_match('/<\/head\s*>/i', $html) === 1) {
            $html = preg_replace_callback('/<\/head\s*>/i', fn (array $match): string => $head.$match[0], $html, 1) ?? $html;
        } elseif (preg_match('/<html(?:\s[^>]*)?>/i', $html) === 1) {
            $html = preg_replace_callback('/<html(?:\s[^>]*)?>/i', fn (array $match): string => $match[0].'<head>'.$head.'</head>', $html, 1) ?? $html;
        }

        $html = preg_replace_callback('/<\/body\s*>/i', fn (array $match): string => $body.$match[0], $html, 1) ?? $html;

        $original = $response instanceof LaravelResponse ? $response->getOriginalContent() : null;
        $response->setContent($html);

        if ($response instanceof LaravelResponse) {
            $response->original = $original;
        }

        $response->headers->remove('Content-Length');
        $response->headers->set('X-NewDebugBar-Profile', $profileId);

        return $response;
    }

    public function supports(Response $response): bool
    {
        if ($response instanceof BinaryFileResponse || $response instanceof StreamedResponse) {
            return false;
        }

        if ($response->isRedirection()) {
            return false;
        }

        if (str_contains(strtolower((string) $response->headers->get('Content-Disposition')), 'attachment')) {
            return false;
        }

        $contentType = strtolower((string) $response->headers->get('Content-Type'));

        if ($contentType !== '' && ! str_contains($contentType, 'text/html')) {
            return false;
        }

        return preg_match('/<\/body\s*>/i', (string) $response->getContent()) === 1;
    }
}
