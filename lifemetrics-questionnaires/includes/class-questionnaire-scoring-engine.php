<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Questionnaire_Scoring_Engine
{
    public function score(array $config, array $answers): array
    {
        $expected = array_merge(
            array_column($config['questions'], 'id'),
            array_column($config['safety_questions'], 'id')
        );
        $actual = array_keys($answers);
        sort($expected);
        sort($actual);
        if ($expected !== $actual) {
            throw new InvalidArgumentException('invalid_submission');
        }

        $selected = array();
        $raw = 0;
        $available_min = 0;
        $available_max = 0;
        $full_min = 0;
        $full_max = 0;
        $removed_capacity = false;
        $dimension_totals = array();
        foreach ($config['dimensions'] as $dimension) {
            $dimension_totals[$dimension['id']] = array('raw_score' => 0, 'available_min' => 0, 'available_max' => 0);
        }

        foreach ($config['questions'] as $question) {
            $applicable = array_values(array_filter($question['answers'], static fn($answer) => $answer['applicable']));
            $minimum = min(array_column($applicable, 'points'));
            $maximum = max(array_column($applicable, 'points'));
            $full_min += $minimum;
            $full_max += $maximum;
            $answer = $this->find_answer($question['answers'], $answers[$question['id']]);
            $selected[$question['id']] = array(
                'value' => $answer['value'],
                'label' => $answer['label'] ?? '',
                'points' => $answer['points'],
                'applicable' => $answer['applicable'],
            );
            if (!$answer['applicable']) {
                $removed_capacity = true;
                continue;
            }
            $raw += $answer['points'];
            $available_min += $minimum;
            $available_max += $maximum;
            if ($question['dimension'] !== null) {
                $dimension_totals[$question['dimension']]['raw_score'] += $answer['points'];
                $dimension_totals[$question['dimension']]['available_min'] += $minimum;
                $dimension_totals[$question['dimension']]['available_max'] += $maximum;
            }
        }

        if ($available_max === $available_min) {
            throw new InvalidArgumentException('unscorable_answers');
        }
        $score = $config['score'];
        if ($removed_capacity && $score['normalize_when_unavailable']) {
            $normalized = $score['target_min'] + (($raw - $available_min) / ($available_max - $available_min))
                * ($score['target_max'] - $score['target_min']);
            $final = (int) round($normalized, 0, PHP_ROUND_HALF_UP);
        } elseif ($full_min === $score['target_min'] && $full_max === $score['target_max']) {
            $final = $raw;
        } else {
            throw new InvalidArgumentException('unscorable_answers');
        }

        $dimensions = array();
        foreach ($config['dimensions'] as $index => $definition) {
            $totals = $dimension_totals[$definition['id']];
            $capacity = $totals['available_max'] - $totals['available_min'];
            $percentage = $capacity === 0 ? null : ($totals['raw_score'] - $totals['available_min']) / $capacity * 100;
            $attention = false;
            if ($percentage !== null && isset($definition['attention'])) {
                $metric = $definition['attention']['metric'] === 'score' ? $totals['raw_score'] : $percentage;
                $attention = self::compare($metric, $definition['attention']['operator'], $definition['attention']['value']);
            }
            $dimensions[] = array(
                'id' => $definition['id'],
                'raw_score' => $totals['raw_score'],
                'available_min' => $totals['available_min'],
                'available_max' => $totals['available_max'],
                'percentage' => $percentage,
                'unavailable' => $percentage === null,
                'attention' => $attention,
                '_order' => $index,
                '_eligible' => $definition['weakest_eligible'],
            );
        }

        $calculated = $this->level_for_score($config['result_levels'], $final);
        $displayed = $calculated;
        $applied_rules = array();
        $classification_messages = array();
        foreach ($config['classification_rules'] as $rule) {
            $dimension = $this->find_by_id($dimensions, $rule['dimension']);
            $metric = $rule['metric'] === 'dimension_score' ? $dimension['raw_score'] : $dimension['percentage'];
            if ($metric !== null && self::compare($metric, $rule['operator'], $rule['value'])) {
                $cap = $this->find_by_code($config['result_levels'], $rule['max_category']);
                $current = $this->find_by_code($config['result_levels'], $displayed);
                if ($current['rank'] > $cap['rank']) {
                    $displayed = $cap['code'];
                }
                $applied_rules[] = $rule['id'];
                if (!in_array($rule['message_code'], $classification_messages, true)) {
                    $classification_messages[] = $rule['message_code'];
                }
            }
        }
        foreach ($config['dimensions'] as $definition) {
            $dimension = $this->find_by_id($dimensions, $definition['id']);
            if ($dimension['attention'] && isset($definition['attention'])
                && !in_array($definition['attention']['message_code'], $classification_messages, true)) {
                $classification_messages[] = $definition['attention']['message_code'];
            }
        }

        $weakest = array_values(array_filter($dimensions, static fn($dimension) => $dimension['_eligible'] && !$dimension['unavailable']));
        usort($weakest, static fn($a, $b) => ($a['percentage'] <=> $b['percentage']) ?: ($a['_order'] <=> $b['_order']));
        $weakest = array_column(array_slice($weakest, 0, $config['weakest_dimensions']['count'] ?? 0), 'id');
        foreach ($dimensions as &$dimension) {
            unset($dimension['_order'], $dimension['_eligible']);
        }
        unset($dimension);

        $safety_answers = array();
        $triggered = array();
        $trigger_order = 0;
        foreach ($config['safety_questions'] as $question) {
            $answer = $this->find_answer($question['answers'], $answers[$question['id']]);
            $safety_answers[$question['id']] = array(
                'value' => $answer['value'],
                'label' => $answer['label'] ?? '',
                'triggers' => $answer['triggers'],
            );
            foreach ($answer['triggers'] as $code) {
                if (!isset($triggered[$code])) {
                    $triggered[$code] = array('priority' => $config['safety_messages'][$code]['priority'], 'order' => $trigger_order++);
                }
            }
        }
        uasort($triggered, static fn($a, $b) => ($b['priority'] <=> $a['priority']) ?: ($a['order'] <=> $b['order']));

        return array(
            'raw_score' => $raw,
            'available_min' => $available_min,
            'available_max' => $available_max,
            'final_score' => $final,
            'calculated_category' => $calculated,
            'displayed_category' => $displayed,
            'dimensions' => $dimensions,
            'weakest_dimensions' => $weakest,
            'applied_classification_rules' => $applied_rules,
            'classification_message_codes' => $classification_messages,
            'safety_flag_codes' => array_keys($triggered),
            'selected_answers' => $selected,
            'safety_answers' => $safety_answers,
        );
    }

    private function find_answer(array $answers, $value): array
    {
        foreach ($answers as $answer) {
            if ($answer['value'] === $value) {
                return $answer;
            }
        }
        throw new InvalidArgumentException('invalid_submission');
    }

    private function level_for_score(array $levels, $score): string
    {
        foreach ($levels as $level) {
            if ($score >= $level['min'] && $score <= $level['max']) {
                return $level['code'];
            }
        }
        throw new InvalidArgumentException('unscorable_answers');
    }

    private function find_by_id(array $items, string $id): array
    {
        foreach ($items as $item) { if ($item['id'] === $id) { return $item; } }
        throw new InvalidArgumentException('invalid_configuration');
    }

    private function find_by_code(array $items, string $code): array
    {
        foreach ($items as $item) { if ($item['code'] === $code) { return $item; } }
        throw new InvalidArgumentException('invalid_configuration');
    }

    private static function compare($left, string $operator, $right): bool
    {
        return match ($operator) {
            '<' => $left < $right, '<=' => $left <= $right, '==' => $left == $right,
            '>=' => $left >= $right, '>' => $left > $right,
        };
    }
}
