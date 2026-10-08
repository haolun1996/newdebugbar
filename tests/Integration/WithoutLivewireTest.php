<?php

use Laravel\Mcp\Server\McpServiceProvider;
use NewDebugBar\NewDebugBarServiceProvider;
use Orchestra\Testbench\TestCase;

/** Boots the package the way an application without Livewire would, so CI can run it with Livewire removed. */
class WithoutLivewireTestCase extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            McpServiceProvider::class,
            NewDebugBarServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $workerToken = getenv('UNIQUE_TEST_TOKEN');

        $app['config']->set('app.debug', true);
        $app['config']->set('newdebugbar.environments', ['testing']);
        $app['config']->set(
            'newdebugbar.storage.path',
            storage_path('framework/testing-newdebugbar-without-livewire'.($workerToken === false ? '' : '-'.$workerToken)),
        );
    }

    protected function defineRoutes($router): void
    {
        $router->get('/plain-page', fn () => response(
            '<!doctype html><html><head><title>Plain page</title></head><body><main>Plain page</main></body></html>',
        ));
    }

    protected function tearDown(): void
    {
        $this->app['files']->deleteDirectory(config('newdebugbar.storage.path'));

        parent::tearDown();
    }
}

uses(WithoutLivewireTestCase::class);

it('profiles a page and serves the bar when the application does not use Livewire', function () {
    $response = $this->get('/plain-page', ['Accept' => 'text/html'])
        ->assertOk()
        ->assertHeader('X-NewDebugBar-Profile')
        ->assertSee('<main>Plain page</main>', false)
        ->assertSee('<div id="newdebugbar-mount"', false)
        ->assertSee('/__newdebugbar/assets/newdebugbar.js', false);
    $id = $response->headers->get('X-NewDebugBar-Profile');

    expect(substr_count((string) $response->getContent(), '<script'))->toBe(2)
        ->and((string) $response->getContent())->not->toContain('livewire.js', 'livewire.min.js', 'data-update-uri');

    $this->getJson("/__newdebugbar/api/profiles/{$id}")
        ->assertOk()
        ->assertJsonPath('summary.path', '/plain-page');
    $this->getJson("/__newdebugbar/api/profiles/{$id}/inspectors/livewire")
        ->assertOk()
        ->assertJsonPath('profile.inspectors.livewire.summary.count', 0);
});
