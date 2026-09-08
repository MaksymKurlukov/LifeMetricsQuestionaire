<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Questionnaire_Registry
{
    private string $base_path;

    /** @var array<string, string> */
    private array $questionnaires;

    /** @var array<string, array<string, mixed>|null> */
    private array $cache = array();

    private ?LifeMetrics_Questionnaire_Schema_Validator $validator;

    /**
     * @param array<string, string> $questionnaires Explicit questionnaire ID-to-file map.
     */
    public function __construct(string $base_path, array $questionnaires, ?LifeMetrics_Questionnaire_Schema_Validator $validator = null)
    {
        $resolved_base = realpath($base_path);

        if ($resolved_base === false || !is_dir($resolved_base)) {
            throw new InvalidArgumentException('Questionnaire registry base path must be a directory.');
        }

        $this->base_path = rtrim($resolved_base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        $this->questionnaires = $questionnaires;
        $this->validator = $validator;
    }

    /**
     * Resolve any valid lifecycle state for internal tooling.
     *
     * Full questionnaire schema validation is introduced in Stage 4.
     *
     * @return array<string, mixed>|null
     */
    public function get_internal(string $id): ?array
    {
        if (array_key_exists($id, $this->cache)) {
            return $this->cache[$id];
        }

        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $id) || !array_key_exists($id, $this->questionnaires)) {
            return null;
        }

        $relative_path = $this->questionnaires[$id];

        if (!is_string($relative_path) || $relative_path === '') {
            return $this->cache[$id] = null;
        }

        $resolved_path = realpath($this->base_path . $relative_path);

        if (
            $resolved_path === false
            || !is_file($resolved_path)
            || !str_starts_with($resolved_path, $this->base_path)
        ) {
            return $this->cache[$id] = null;
        }

        $configuration = require $resolved_path;

        if (
            !is_array($configuration)
            || ($configuration['id'] ?? null) !== $id
            || !in_array($configuration['status'] ?? null, array('draft', 'review', 'ready', 'disabled'), true)
            || (($configuration['status'] ?? null) === 'ready' && $this->validator !== null && !$this->validator->is_valid($configuration))
        ) {
            return $this->cache[$id] = null;
        }

        return $this->cache[$id] = $configuration;
    }

    /**
     * Resolve only questionnaires approved for public use.
     *
     * @return array<string, mixed>|null
     */
    public function get_public(string $id): ?array
    {
        $configuration = $this->get_internal($id);

        if ($configuration === null || $configuration['status'] !== 'ready') {
            return null;
        }

        return $configuration;
    }
}
