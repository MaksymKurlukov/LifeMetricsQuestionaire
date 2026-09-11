<?php

defined('ABSPATH') || exit;

final class LifeMetrics_Questionnaire_Schema_Validator
{
    private const TOP_LEVEL = array(
        'schema_version', 'id', 'version', 'status', 'locale', 'title', 'seo_title', 'description',
        'population', 'recall_period', 'estimated_duration', 'scoring_direction', 'score', 'questions',
        'dimensions', 'result_levels', 'classification_rules', 'classification_messages',
        'weakest_dimensions', 'safety_questions', 'safety_messages', 'result_ctas', 'disclaimer',
        'attribution', 'content_revision', 'approvals',
    );

    /** @return list<string> */
    public function validate(array $config): array
    {
        $errors = array();
        $status = $config['status'] ?? null;
        $required = array(
            'schema_version', 'id', 'version', 'status', 'locale', 'title', 'description', 'population',
            'recall_period', 'estimated_duration', 'scoring_direction', 'score', 'questions', 'dimensions',
            'result_levels', 'classification_rules', 'classification_messages', 'safety_questions',
            'safety_messages', 'result_ctas', 'disclaimer',
        );
        foreach ($required as $field) {
            if (!array_key_exists($field, $config)) {
                $errors[] = 'missing_field:' . $field;
            }
        }
        if ($status === 'ready') {
            foreach (array_diff(array_keys($config), self::TOP_LEVEL) as $field) {
                $errors[] = 'unknown_field:' . $field;
            }
        }
        if (($config['schema_version'] ?? null) !== '2.0.0') {
            $errors[] = 'invalid_schema_version';
        }
        if (!self::matches($config['id'] ?? null, '/^[a-z0-9]+(?:-[a-z0-9]+)*$/')) {
            $errors[] = 'invalid_questionnaire_id';
        }
        if (!self::matches($config['version'] ?? null, '/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/')) {
            $errors[] = 'invalid_questionnaire_version';
        }
        if (!in_array($status, array('draft', 'review', 'ready', 'disabled'), true)) {
            $errors[] = 'invalid_status';
        }
        if (($config['locale'] ?? null) !== 'fr-FR') {
            $errors[] = 'invalid_locale';
        }
        foreach (array('title', 'description', 'population', 'recall_period', 'estimated_duration') as $field) {
            if (!self::text($config[$field] ?? null)) {
                $errors[] = 'invalid_text:' . $field;
            }
        }
        if (!in_array($config['scoring_direction'] ?? null, array('lower_is_better', 'higher_is_better', 'higher_is_worse'), true)) {
            $errors[] = 'invalid_scoring_direction';
        }

        $score = $config['score'] ?? null;
        if (!is_array($score) || array_keys($score) !== array('target_min', 'target_max', 'normalize_when_unavailable', 'rounding')
            || !self::number($score['target_min'] ?? null) || !self::number($score['target_max'] ?? null)
            || $score['target_max'] <= $score['target_min']
            || !is_bool($score['normalize_when_unavailable'] ?? null) || ($score['rounding'] ?? null) !== 'half_up') {
            $errors[] = 'invalid_score_definition';
        }

        $questions = is_array($config['questions'] ?? null) && array_is_list($config['questions']) ? $config['questions'] : array();
        if (!$questions) {
            $errors[] = 'invalid_questions';
        }
        $question_ids = array();
        $full_min = 0;
        $full_max = 0;
        foreach ($questions as $question) {
            if ($status === 'ready' && is_array($question) && self::has_unknown($question, array('id', 'dimension', 'text', 'required', 'answers', 'help', 'examples', 'scoring_note'))) {
                $errors[] = 'unknown_field:question';
            }
            if (!is_array($question) || !self::code($question['id'] ?? null) || isset($question_ids[$question['id']])) {
                $errors[] = 'invalid_question_reference';
                continue;
            }
            $question_ids[$question['id']] = $question['dimension'] ?? null;
            if (!is_bool($question['required'] ?? null) || !self::text($question['text'] ?? null)
                || !is_array($question['answers'] ?? null) || !array_is_list($question['answers']) || !$question['answers']) {
                $errors[] = 'invalid_question_definition:' . $question['id'];
                continue;
            }
            $values = array();
            $applicable = 0;
            $applicable_points = array();
            foreach ($question['answers'] as $answer) {
                if ($status === 'ready' && is_array($answer) && self::has_unknown($answer, array('value', 'label', 'points', 'applicable'))) {
                    $errors[] = 'unknown_field:answer';
                }
                $value = is_array($answer) ? ($answer['value'] ?? null) : null;
                $key = gettype($value) . ':' . json_encode($value);
                $valid_value = is_string($value) || is_int($value);
                $is_applicable = is_array($answer) ? ($answer['applicable'] ?? null) : null;
                $answer_points = is_array($answer) ? ($answer['points'] ?? null) : null;
                if (!$valid_value || isset($values[$key]) || !self::text($answer['label'] ?? null) || !is_bool($is_applicable)
                    || ($is_applicable ? !self::number($answer_points) : $answer_points !== null)) {
                    $errors[] = 'invalid_answer_definition:' . $question['id'];
                    continue;
                }
                $values[$key] = true;
                $applicable += $is_applicable ? 1 : 0;
                if ($is_applicable) { $applicable_points[] = $answer_points; }
            }
            if ($applicable === 0) {
                $errors[] = 'invalid_answer_definition:' . $question['id'];
            } else {
                $full_min += min($applicable_points);
                $full_max += max($applicable_points);
            }
        }
        if (is_array($score) && self::number($score['target_min'] ?? null) && self::number($score['target_max'] ?? null)
            && ($full_min !== $score['target_min'] || $full_max !== $score['target_max'])) {
            $errors[] = 'invalid_score_definition';
        }

        $dimensions = is_array($config['dimensions'] ?? null) && array_is_list($config['dimensions']) ? $config['dimensions'] : array();
        $dimension_ids = array();
        $memberships = array_fill_keys(array_keys($question_ids), 0);
        foreach ($dimensions as $dimension) {
            if ($status === 'ready' && is_array($dimension) && self::has_unknown($dimension, array('id', 'label', 'question_ids', 'weakest_eligible', 'attention', 'calculation_mode', 'improvement_messages'))) {
                $errors[] = 'unknown_field:dimension';
            }
            $id = is_array($dimension) ? ($dimension['id'] ?? null) : null;
            if (!self::slug($id) || isset($dimension_ids[$id]) || !self::text($dimension['label'] ?? null)
                || !is_bool($dimension['weakest_eligible'] ?? null) || !is_array($dimension['question_ids'] ?? null)
                || !array_is_list($dimension['question_ids']) || !$dimension['question_ids']) {
                $errors[] = 'invalid_dimension_definition';
                continue;
            }
            if (array_key_exists('calculation_mode', $dimension) && !in_array($dimension['calculation_mode'], array('average', 'sum'), true)) {
                $errors[] = 'invalid_dimension_definition';
                continue;
            }
            if (array_key_exists('improvement_messages', $dimension) && (!is_array($dimension['improvement_messages']) || array_is_list($dimension['improvement_messages']))) {
                $errors[] = 'invalid_dimension_definition';
                continue;
            }
            $dimension_ids[$id] = true;
            foreach ($dimension['question_ids'] as $question_id) {
                if (!array_key_exists($question_id, $question_ids) || $question_ids[$question_id] !== $id) {
                    $errors[] = 'invalid_question_reference:' . $id;
                } else {
                    $memberships[$question_id]++;
                }
            }
        }
        foreach ($question_ids as $id => $dimension) {
            if (($dimension === null && $dimensions) || ($dimension !== null && ($memberships[$id] ?? 0) !== 1)) {
                $errors[] = 'invalid_question_reference:' . $id;
            }
        }

        $messages = $this->validate_messages($config['classification_messages'] ?? null, 'invalid_classification_message', $errors);
        foreach ($dimensions as $dimension) {
            if (is_array($dimension) && array_key_exists('attention', $dimension)) {
                $attention = $dimension['attention'];
                if ($status === 'ready' && is_array($attention) && self::has_unknown($attention, array('metric', 'operator', 'value', 'message_code'))) {
                    $errors[] = 'unknown_field:attention';
                }
                if (!is_array($attention) || !in_array($attention['metric'] ?? null, array('score', 'percentage'), true)
                    || !self::operator($attention['operator'] ?? null) || !self::number($attention['value'] ?? null)
                    || !isset($messages[$attention['message_code'] ?? null])) {
                    $errors[] = 'invalid_dimension_attention:' . ($dimension['id'] ?? 'unknown');
                }
            }
        }

        $levels = is_array($config['result_levels'] ?? null) && array_is_list($config['result_levels']) ? $config['result_levels'] : array();
        $level_codes = array();
        $ranks = array();
        $ranges = array();
        foreach ($levels as $level) {
            if ($status === 'ready' && is_array($level) && self::has_unknown($level, array('code', 'rank', 'min', 'max', 'title', 'description', 'recommendations'))) {
                $errors[] = 'unknown_field:result_level';
            }
            $code = is_array($level) ? ($level['code'] ?? null) : null;
            $rank = is_array($level) ? ($level['rank'] ?? null) : null;
            if (!self::code($code) || isset($level_codes[$code]) || !is_int($rank) || isset($ranks[$rank])
                || !is_int($level['min'] ?? null) || !is_int($level['max'] ?? null) || $level['max'] < $level['min']
                || !self::text($level['title'] ?? null) || !self::text($level['description'] ?? null)
                || !is_array($level['recommendations'] ?? null)) {
                $errors[] = 'invalid_result_ranges';
                continue;
            }
            $level_codes[$code] = $rank;
            $ranks[$rank] = true;
            $ranges[] = array($level['min'], $level['max']);
        }
        if (is_array($score) && self::number($score['target_min'] ?? null) && self::number($score['target_max'] ?? null)) {
            usort($ranges, static fn($a, $b) => $a[0] <=> $b[0]);
            $next = $score['target_min'];
            foreach ($ranges as $range) {
                if ($range[0] !== $next) {
                    $errors[] = 'invalid_result_ranges';
                    break;
                }
                $next = $range[1] + 1;
            }
            if ($next !== $score['target_max'] + 1) {
                $errors[] = 'invalid_result_ranges';
            }
        }

        $rules = is_array($config['classification_rules'] ?? null) && array_is_list($config['classification_rules']) ? $config['classification_rules'] : array();
        $rule_ids = array();
        foreach ($rules as $rule) {
            if ($status === 'ready' && is_array($rule) && self::has_unknown($rule, array('id', 'type', 'metric', 'dimension', 'operator', 'value', 'max_category', 'message_code'))) {
                $errors[] = 'unknown_field:classification_rule';
            }
            $id = is_array($rule) ? ($rule['id'] ?? null) : null;
            if (!self::code($id) || isset($rule_ids[$id]) || ($rule['type'] ?? null) !== 'category_cap'
                || !in_array($rule['metric'] ?? null, array('dimension_score', 'dimension_percentage'), true)
                || !isset($dimension_ids[$rule['dimension'] ?? null]) || !self::operator($rule['operator'] ?? null)
                || !self::number($rule['value'] ?? null) || !isset($level_codes[$rule['max_category'] ?? null])
                || !isset($messages[$rule['message_code'] ?? null])) {
                $errors[] = 'invalid_classification_rule';
            } else {
                $rule_ids[$id] = true;
            }
        }

        if ($dimensions) {
            $weakest = $config['weakest_dimensions'] ?? null;
            if ($status === 'ready' && is_array($weakest) && self::has_unknown($weakest, array('count', 'tie_break'))) {
                $errors[] = 'unknown_field:weakest_dimensions';
            }
            if (!is_array($weakest) || !in_array($weakest['count'] ?? null, array(1, 2), true)
                || ($weakest['tie_break'] ?? null) !== 'configuration_order') {
                $errors[] = 'invalid_weakest_dimensions';
            }
        }

        $safety_messages = $this->validate_messages($config['safety_messages'] ?? null, 'invalid_safety_reference', $errors, true);
        $safety_questions = is_array($config['safety_questions'] ?? null) && array_is_list($config['safety_questions']) ? $config['safety_questions'] : array();
        $safety_ids = array();
        foreach ($safety_questions as $question) {
            if ($status === 'ready' && is_array($question) && self::has_unknown($question, array('id', 'text', 'required', 'answers', 'help', 'examples', 'scoring_note'))) {
                $errors[] = 'unknown_field:safety_question';
            }
            $id = is_array($question) ? ($question['id'] ?? null) : null;
            if (!self::code($id) || isset($safety_ids[$id]) || !self::text($question['text'] ?? null)
                || !is_bool($question['required'] ?? null) || isset($question['points']) || isset($question['dimension'])
                || !is_array($question['answers'] ?? null) || !array_is_list($question['answers']) || !$question['answers']) {
                $errors[] = 'invalid_safety_reference';
                continue;
            }
            $safety_ids[$id] = true;
            $values = array();
            foreach ($question['answers'] as $answer) {
                if ($status === 'ready' && is_array($answer) && self::has_unknown($answer, array('value', 'label', 'triggers'))) {
                    $errors[] = 'unknown_field:safety_answer';
                }
                $value = is_array($answer) ? ($answer['value'] ?? null) : null;
                $key = gettype($value) . ':' . json_encode($value);
                if ((!is_string($value) && !is_int($value)) || isset($values[$key]) || !self::text($answer['label'] ?? null)
                    || !is_array($answer['triggers'] ?? null) || !array_is_list($answer['triggers'])) {
                    $errors[] = 'invalid_safety_reference';
                    continue;
                }
                $values[$key] = true;
                foreach ($answer['triggers'] as $trigger) {
                    if (!isset($safety_messages[$trigger])) {
                        $errors[] = 'invalid_safety_reference';
                    }
                }
            }
        }

        $ctas = is_array($config['result_ctas'] ?? null) && array_is_list($config['result_ctas']) ? $config['result_ctas'] : array();
        if (!$ctas) {
            $errors[] = 'invalid_result_ctas';
        }
        foreach ($ctas as $cta) {
            if ($status === 'ready' && is_array($cta) && self::has_unknown($cta, array('label', 'url', 'variant', 'enabled'))) {
                $errors[] = 'unknown_field:result_cta';
            }
            $url = is_array($cta) ? ($cta['url'] ?? null) : null;
            if (!self::text($cta['label'] ?? null) || !in_array($cta['variant'] ?? null, array('primary', 'secondary'), true)
                || !is_bool($cta['enabled'] ?? null) || !is_string($url)
                || !preg_match('#^(?:/[A-Za-z0-9/_-]*|https://[^\s]+)$#', $url)) {
                $errors[] = 'invalid_result_ctas';
            }
        }
        $disclaimer = $config['disclaimer'] ?? null;
        if ($status === 'ready' && is_array($disclaimer) && self::has_unknown($disclaimer, array('before', 'after'))) {
            $errors[] = 'unknown_field:disclaimer';
        }
        if (!is_array($disclaimer) || !self::text($disclaimer['before'] ?? null) || !self::text($disclaimer['after'] ?? null)) {
            $errors[] = 'invalid_disclaimer';
        }
        if ($status === 'ready') {
            $approvals = $config['approvals'] ?? null;
            if (is_array($approvals) && array_diff(array_keys($approvals), array('content_scoring', 'legal_licensing', 'technical_runtime', 'publication'))) {
                $errors[] = 'invalid_approvals';
            }
            foreach (array('content_scoring', 'legal_licensing', 'technical_runtime', 'publication') as $gate) {
                if (!is_array($approvals) || ($approvals[$gate] ?? null) !== true) {
                    $errors[] = 'approval_required:' . $gate;
                }
            }
        }
        return array_values(array_unique($errors));
    }

    public function is_valid(array $config): bool
    {
        return $this->validate($config) === array();
    }

    private function validate_messages($value, string $error, array &$errors, bool $priority = false): array
    {
        if (!is_array($value) || ($value !== array() && array_is_list($value))) {
            $errors[] = $error;
            return array();
        }
        foreach ($value as $code => $message) {
            if (is_array($message) && self::has_unknown($message, $priority ? array('priority', 'title', 'text') : array('title', 'text'))) {
                $errors[] = 'unknown_field:message';
            }
            if (!self::code($code) || !is_array($message) || !self::text($message['title'] ?? null)
                || !self::text($message['text'] ?? null) || ($priority && !is_int($message['priority'] ?? null))) {
                $errors[] = $error;
                unset($value[$code]);
            }
        }
        return $value;
    }

    private static function number($value): bool { return (is_int($value) || is_float($value)) && is_finite((float) $value); }
    private static function text($value): bool { return is_string($value) && trim($value) !== '' && strip_tags($value) === $value; }
    private static function matches($value, string $pattern): bool { return is_string($value) && preg_match($pattern, $value) === 1; }
    private static function slug($value): bool { return self::matches($value, '/^[a-z0-9]+(?:-[a-z0-9]+)*$/'); }
    private static function code($value): bool { return self::matches($value, '/^[A-Z][A-Z0-9_-]*$/'); }
    private static function operator($value): bool { return in_array($value, array('<', '<=', '==', '>=', '>'), true); }
    private static function has_unknown(array $value, array $allowed): bool { return array_diff(array_keys($value), $allowed) !== array(); }
}
