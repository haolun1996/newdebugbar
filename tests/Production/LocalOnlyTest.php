<?php

use Laravel\Mcp\Facades\Mcp;
use NewDebugBar\Http\Middleware\ProfileRequest;

it('registers no profiler, asset, or API route outside an allowed environment', function () {
    $mcp = class_exists(Mcp::class)
        ? Mcp::class
        : Laravel\Mcp\Server\Facades\Mcp::class;

    expect(app()->environment())->toBe('testing')
        ->and(config('newdebugbar.environments'))->toBe(['local'])
        ->and(app('router')->getMiddlewareGroups()['web'])->not->toContain(ProfileRequest::class)
        ->and($mcp::getLocalServer('newdebugbar'))->toBeNull()
        ->and(app('router')->getRoutes()->getByName('newdebugbar.asset'))->toBeNull()
        ->and(app('router')->getRoutes()->getByName('newdebugbar.api.summary'))->toBeNull();

    $this->get('/production-page')
        ->assertOk()
        ->assertDontSee('newdebugbar');

    $this->get('/__newdebugbar/assets/newdebugbar.css')->assertNotFound();
    $this->get('/__newdebugbar/api/recent')->assertNotFound();
    $this->get('/__newdebugbar/api/profiles/00000000-0000-4000-8000-000000000000')->assertNotFound();
});
