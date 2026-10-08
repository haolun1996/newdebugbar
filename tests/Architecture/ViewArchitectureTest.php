<?php

use Symfony\Component\Finder\Finder;

it('namespaces package-owned browser identifiers away from host pages', function () {
    $ui = dirname(__DIR__, 2).'/resources/js/ui';
    $attributeViolations = [];
    $idViolations = [];
    $hostDirectiveViolations = [];

    foreach ((new Finder)->files()->in($ui)->name('*.jsx') as $file) {
        $relativePath = $file->getRelativePathname();
        $contents = file_get_contents($file->getPathname());

        preg_match_all('/(?:^|[\s{(,])[\'"]?data-(?<name>[a-z0-9_-]+)[\'"]?\s*[=:]/m', $contents, $attributes);

        foreach (array_unique($attributes['name']) as $name) {
            if (! str_starts_with($name, 'ndb-')) {
                $attributeViolations[] = $relativePath.': data-'.$name;
            }
        }

        preg_match_all('/\sid=(?:"(?<literal>[^"]+)"|\{`(?<template>[^`$]*))/', $contents, $ids, PREG_SET_ORDER);

        foreach ($ids as $id) {
            $prefix = ($id['literal'] ?? '') !== '' ? $id['literal'] : ($id['template'] ?? '');

            if ($prefix !== '' && ! str_starts_with($prefix, 'newdebugbar')) {
                $idViolations[] = $relativePath.': '.$prefix;
            }
        }

        // Host pages may run their own Alpine or Livewire, which would interpret these on our markup.
        preg_match_all('/\s(?<attribute>x-[a-z]+|wire:[a-z.]+)[=\s>]/', $contents, $directives);

        foreach (array_unique($directives['attribute']) as $attribute) {
            $hostDirectiveViolations[] = $relativePath.': '.$attribute;
        }
    }

    expect($attributeViolations)->toBe([])
        ->and($idViolations)->toBe([])
        ->and($hostDirectiveViolations)->toBe([]);
});
