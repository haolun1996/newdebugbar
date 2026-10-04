<?php

$pluginPath = fn (string $path): string => dirname(__DIR__, 2).'/plugins/newdebugbar/'.$path;

test('the Claude Code plugin starts the MCP server from the open Laravel project', function () use ($pluginPath) {
    $config = json_decode(
        file_get_contents($pluginPath('.mcp.json')),
        true,
        flags: JSON_THROW_ON_ERROR,
    );
    $server = $config['mcpServers']['newdebugbar'];

    expect($server)
        ->toMatchArray([
            'command' => 'php',
            'args' => ['${CLAUDE_PROJECT_DIR}/artisan', 'mcp:start', 'newdebugbar'],
        ])
        ->not->toHaveKey('cwd');

    $project = sys_get_temp_dir().'/newdebugbar-plugin-'.bin2hex(random_bytes(8));
    mkdir($project);
    file_put_contents(
        $project.'/artisan',
        '<?php echo json_encode(array_slice($argv, 1), JSON_THROW_ON_ERROR);',
    );
    $args = array_map(
        fn (string $arg): string => str_replace('${CLAUDE_PROJECT_DIR}', $project, $arg),
        $server['args'],
    );

    try {
        $process = proc_open(
            [$server['command'], ...$args],
            [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes,
            sys_get_temp_dir(),
        );

        expect($process)->toBeResource();

        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        expect(proc_close($process))->toBe(0)
            ->and($error)->toBe('')
            ->and(json_decode($output, true, flags: JSON_THROW_ON_ERROR))
            ->toBe(['mcp:start', 'newdebugbar']);
    } finally {
        unlink($project.'/artisan');
        rmdir($project);
    }
});

test('the repository exposes the plugin without adding it to Composer archives', function () use ($pluginPath) {
    $manifest = json_decode(
        file_get_contents($pluginPath('.claude-plugin/plugin.json')),
        true,
        flags: JSON_THROW_ON_ERROR,
    );
    $marketplace = json_decode(
        file_get_contents(dirname(__DIR__, 2).'/.claude-plugin/marketplace.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );
    $composer = json_decode(
        file_get_contents(dirname(__DIR__, 2).'/composer.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    expect($manifest)
        ->toMatchArray([
            'name' => 'newdebugbar',
            'version' => '1.0.2',
            'license' => 'Apache-2.0',
        ])
        ->and($marketplace)->toHaveKeys(['name', 'owner.name'])
        ->and($marketplace['plugins'][0])
        ->toMatchArray([
            'name' => 'newdebugbar',
            'source' => './plugins/newdebugbar',
        ])
        ->and($composer['archive']['exclude'])
        ->toContain('/.claude', '/.claude-plugin', '/plugins');
});

test('the plugin teaches agents how to reach complete profile data', function () use ($pluginPath) {
    $skill = file_get_contents($pluginPath('skills/use-newdebugbar/SKILL.md'));

    expect($skill)
        ->toContain('get-debug-profile-data', '/inspectors', 'JSON Pointer', 'exact value')
        ->toContain('same exact profile ID', 'returned cursor');
});
