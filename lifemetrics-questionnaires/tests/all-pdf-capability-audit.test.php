<?php

defined('ABSPATH') || define('ABSPATH', __DIR__ . '/');
require_once __DIR__ . '/../includes/class-questionnaire-scoring-engine.php';
require_once __DIR__ . '/../includes/class-questionnaire-schema-validator.php';

function audit_assert($condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: " . $message . "\n");
        exit(1);
    }
}

$validator = new LifeMetrics_Questionnaire_Schema_Validator();
$engine = new LifeMetrics_Questionnaire_Scoring_Engine();

// ==========================================
// 1. ACTIVITE PHYSIQUE: Duplicate point mappings (e.g. AP04 duplicate 4 pts)
// ==========================================
$ap_config = array(
    'schema_version' => '2.0.0',
    'id' => 'activite-physique',
    'version' => '1.0.0',
    'status' => 'review',
    'locale' => 'fr-FR',
    'title' => 'Activité Physique',
    'description' => 'Test activite physique',
    'population' => 'Adultes',
    'recall_period' => '7 jours',
    'estimated_duration' => '3 minutes',
    'scoring_direction' => 'higher_is_better',
    'score' => array('target_min' => 0, 'target_max' => 8, 'normalize_when_unavailable' => false, 'rounding' => 'half_up'),
    'questions' => array(
        array(
            'id' => 'AP01',
            'dimension' => 'cardio',
            'text' => 'Question standard',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '1', 'label' => '1', 'points' => 4, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'AP04',
            'dimension' => 'cardio',
            'text' => 'AP04 duplicate 4-point mapping',
            'required' => true,
            'answers' => array(
                array('value' => '0_days', 'label' => '0 jours', 'points' => 0, 'applicable' => true),
                array('value' => '1_day',  'label' => '1 jour', 'points' => 2, 'applicable' => true),
                array('value' => '2_days', 'label' => '2 jours', 'points' => 4, 'applicable' => true),
                array('value' => '3_plus', 'label' => '3+ jours', 'points' => 4, 'applicable' => true),
            ),
        ),
    ),
    'dimensions' => array(
        array('id' => 'cardio', 'label' => 'Cardio', 'question_ids' => array('AP01', 'AP04'), 'weakest_eligible' => true),
    ),
    'weakest_dimensions' => array('count' => 1, 'tie_break' => 'configuration_order'),
    'result_levels' => array(
        array('code' => 'FAIBLE', 'rank' => 0, 'min' => 0, 'max' => 4, 'title' => 'Faible', 'description' => 'Faible', 'recommendations' => array()),
        array('code' => 'BON', 'rank' => 1, 'min' => 5, 'max' => 8, 'title' => 'Bon', 'description' => 'Bon', 'recommendations' => array()),
    ),
    'classification_rules' => array(),
    'classification_messages' => array(),
    'safety_questions' => array(),
    'safety_messages' => array(),
    'result_ctas' => array(
        array('label' => 'Bilan', 'url' => '/bilan/', 'variant' => 'primary', 'enabled' => true),
    ),
    'disclaimer' => array('before' => 'Before', 'after' => 'After'),
);

audit_assert($validator->validate($ap_config) === array(), 'Activité physique config passes schema validation');
$ap_res1 = $engine->score($ap_config, array('AP01' => '1', 'AP04' => '2_days'));
$ap_res2 = $engine->score($ap_config, array('AP01' => '1', 'AP04' => '3_plus'));
audit_assert($ap_res1['final_score'] === 8, 'AP04 2_days yields 4 points (total 8)');
audit_assert($ap_res2['final_score'] === 8, 'AP04 3_plus yields 4 points (total 8)');
audit_assert($ap_res1['displayed_category'] === 'BON', 'AP category is BON');

// ==========================================
// 2. SOMMEIL: Non-linear points (SL01: 7-9h = 4 pts, >9h = 3 pts) + Safety flags
// ==========================================
$sl_config = array(
    'schema_version' => '2.0.0',
    'id' => 'sommeil',
    'version' => '1.0.0',
    'status' => 'review',
    'locale' => 'fr-FR',
    'title' => 'Sommeil',
    'description' => 'Test sommeil',
    'population' => 'Adultes',
    'recall_period' => '7 jours',
    'estimated_duration' => '3 minutes',
    'scoring_direction' => 'higher_is_better',
    'score' => array('target_min' => 0, 'target_max' => 4, 'normalize_when_unavailable' => false, 'rounding' => 'half_up'),
    'questions' => array(
        array(
            'id' => 'SL01',
            'dimension' => 'duree',
            'text' => 'Durée de sommeil',
            'required' => true,
            'answers' => array(
                array('value' => 'lt_5h', 'label' => 'Moins de 5h', 'points' => 0, 'applicable' => true),
                array('value' => '5_6h',  'label' => '5 à 6h',      'points' => 1, 'applicable' => true),
                array('value' => '6_7h',  'label' => '6 à 7h',      'points' => 2, 'applicable' => true),
                array('value' => '7_9h',  'label' => '7 à 9h',      'points' => 4, 'applicable' => true),
                array('value' => 'gt_9h', 'label' => 'Plus de 9h',  'points' => 3, 'applicable' => true),
            ),
        ),
    ),
    'dimensions' => array(
        array('id' => 'duree', 'label' => 'Durée', 'question_ids' => array('SL01'), 'weakest_eligible' => true),
    ),
    'weakest_dimensions' => array('count' => 1, 'tie_break' => 'configuration_order'),
    'result_levels' => array(
        array('code' => 'MAUVAIS', 'rank' => 0, 'min' => 0, 'max' => 2, 'title' => 'Mauvais', 'description' => 'Mauvais', 'recommendations' => array()),
        array('code' => 'BON',     'rank' => 1, 'min' => 3, 'max' => 4, 'title' => 'Bon', 'description' => 'Bon', 'recommendations' => array()),
    ),
    'classification_rules' => array(),
    'classification_messages' => array(),
    'safety_questions' => array(
        array(
            'id' => 'SLSF01',
            'text' => 'Apnée du sommeil',
            'required' => true,
            'answers' => array(
                array('value' => 'yes', 'label' => 'Oui', 'triggers' => array('APNEA_ALERT')),
                array('value' => 'no',  'label' => 'Non', 'triggers' => array()),
            ),
        ),
    ),
    'safety_messages' => array(
        'APNEA_ALERT' => array('priority' => 100, 'title' => 'Attention Apnée', 'text' => 'Consultez un médecin.'),
    ),
    'result_ctas' => array(
        array('label' => 'Bilan', 'url' => '/bilan/', 'variant' => 'primary', 'enabled' => true),
    ),
    'disclaimer' => array('before' => 'Before', 'after' => 'After'),
);

audit_assert($validator->validate($sl_config) === array(), 'Sommeil config passes schema validation');
$sl_res_optimal = $engine->score($sl_config, array('SL01' => '7_9h', 'SLSF01' => 'no'));
$sl_res_long = $engine->score($sl_config, array('SL01' => 'gt_9h', 'SLSF01' => 'yes'));
audit_assert($sl_res_optimal['final_score'] === 4, 'SL01 7-9h gives peak 4 points');
audit_assert($sl_res_long['final_score'] === 3, 'SL01 >9h gives non-linear 3 points');
audit_assert($sl_res_long['safety_flag_codes'] === array('APNEA_ALERT'), 'Safety trigger recorded independently of score');

// ==========================================
// 3. HYDRATATION: N/A capacity normalization (44/44 -> 48)
// ==========================================
$hy_config = array(
    'schema_version' => '2.0.0',
    'id' => 'hydratation',
    'version' => '1.0.0',
    'status' => 'review',
    'locale' => 'fr-FR',
    'title' => 'Hydratation',
    'description' => 'Test hydratation',
    'population' => 'Adultes',
    'recall_period' => '7 jours',
    'estimated_duration' => '3 minutes',
    'scoring_direction' => 'higher_is_better',
    'score' => array('target_min' => 0, 'target_max' => 48, 'normalize_when_unavailable' => true, 'rounding' => 'half_up'),
    'questions' => array(
        array(
            'id' => 'HY01',
            'dimension' => 'eau',
            'text' => 'Eau',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 44, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'HY05',
            'dimension' => 'sport',
            'text' => 'Boisson sport (optional N/A)',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
                array('value' => 'na', 'label' => 'N/A', 'points' => null, 'applicable' => false),
            ),
        ),
    ),
    'dimensions' => array(
        array('id' => 'eau', 'label' => 'Eau', 'question_ids' => array('HY01'), 'weakest_eligible' => true),
        array('id' => 'sport', 'label' => 'Sport', 'question_ids' => array('HY05'), 'weakest_eligible' => true),
    ),
    'weakest_dimensions' => array('count' => 1, 'tie_break' => 'configuration_order'),
    'result_levels' => array(
        array('code' => 'OPTIMAL', 'rank' => 0, 'min' => 0, 'max' => 48, 'title' => 'Optimal', 'description' => 'Optimal', 'recommendations' => array()),
    ),
    'classification_rules' => array(),
    'classification_messages' => array(),
    'safety_questions' => array(),
    'safety_messages' => array(),
    'result_ctas' => array(
        array('label' => 'Bilan', 'url' => '/bilan/', 'variant' => 'primary', 'enabled' => true),
    ),
    'disclaimer' => array('before' => 'Before', 'after' => 'After'),
);

audit_assert($validator->validate($hy_config) === array(), 'Hydratation config passes schema validation');
$hy_res = $engine->score($hy_config, array('HY01' => '4', 'HY05' => 'na'));
audit_assert($hy_res['raw_score'] === 44, 'Raw score is 44');
audit_assert($hy_res['available_max'] === 44, 'Available max is 44');
audit_assert($hy_res['final_score'] === 48, '44/44 normalizes to 48/48');

// ==========================================
// 4. SEDENTARITE: Category guardrail capping (d1 <= 2 caps display at A_REDUIRE)
// ==========================================
$sd_config = array(
    'schema_version' => '2.0.0',
    'id' => 'sedentarite',
    'version' => '1.0.0',
    'status' => 'review',
    'locale' => 'fr-FR',
    'title' => 'Sédentarité',
    'description' => 'Test sédentarité',
    'population' => 'Adultes',
    'recall_period' => '7 jours',
    'estimated_duration' => '3 minutes',
    'scoring_direction' => 'higher_is_better',
    'score' => array('target_min' => 0, 'target_max' => 48, 'normalize_when_unavailable' => true, 'rounding' => 'half_up'),
    'questions' => array(
        array(
            'id' => 'SD01',
            'dimension' => 'd1',
            'text' => 'SD01',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'SD02',
            'dimension' => 'd1',
            'text' => 'SD02',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'SD03',
            'dimension' => 'd2',
            'text' => 'SD03',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '40', 'label' => '40', 'points' => 40, 'applicable' => true),
            ),
        ),
    ),
    'dimensions' => array(
        array('id' => 'd1', 'label' => 'Temps assis', 'question_ids' => array('SD01', 'SD02'), 'weakest_eligible' => true),
        array('id' => 'd2', 'label' => 'Pauses', 'question_ids' => array('SD03'), 'weakest_eligible' => true),
    ),
    'weakest_dimensions' => array('count' => 1, 'tie_break' => 'configuration_order'),
    'result_levels' => array(
        array('code' => 'SEDENTARITE_ELEVEE', 'rank' => 0, 'min' => 0, 'max' => 15, 'title' => 'Élevée', 'description' => 'Élevée', 'recommendations' => array()),
        array('code' => 'SEDENTARITE_A_REDUIRE', 'rank' => 1, 'min' => 16, 'max' => 30, 'title' => 'À réduire', 'description' => 'À réduire', 'recommendations' => array()),
        array('code' => 'SEDENTARITE_FAIBLE', 'rank' => 2, 'min' => 31, 'max' => 48, 'title' => 'Faible', 'description' => 'Faible', 'recommendations' => array()),
    ),
    'classification_rules' => array(
        array(
            'id' => 'CAP_D1_HIGH_SITTING',
            'type' => 'category_cap',
            'metric' => 'dimension_score',
            'dimension' => 'd1',
            'operator' => '<=',
            'value' => 2,
            'max_category' => 'SEDENTARITE_A_REDUIRE',
            'message_code' => 'D1_ATTENTION',
        ),
    ),
    'classification_messages' => array(
        'D1_ATTENTION' => array('title' => 'Attention temps assis', 'text' => 'Votre temps assis limite votre catégorie.'),
    ),
    'safety_questions' => array(),
    'safety_messages' => array(),
    'result_ctas' => array(
        array('label' => 'Bilan', 'url' => '/bilan/', 'variant' => 'primary', 'enabled' => true),
    ),
    'disclaimer' => array('before' => 'Before', 'after' => 'After'),
);

audit_assert($validator->validate($sd_config) === array(), 'Sédentarité config passes schema validation');
// Case where d1 = 0+0 = 0 (<=2), SD03 = 40 => Total 40 (which normally is SEDENTARITE_FAIBLE), but capped to SEDENTARITE_A_REDUIRE
$sd_res = $engine->score($sd_config, array('SD01' => '0', 'SD02' => '0', 'SD03' => '40'));
audit_assert($sd_res['final_score'] === 40, 'Final numeric score is preserved at 40');
audit_assert($sd_res['calculated_category'] === 'SEDENTARITE_FAIBLE', 'Calculated category is SEDENTARITE_FAIBLE');
audit_assert($sd_res['displayed_category'] === 'SEDENTARITE_A_REDUIRE', 'Displayed category is capped at SEDENTARITE_A_REDUIRE');
audit_assert($sd_res['applied_classification_rules'] === array('CAP_D1_HIGH_SITTING'), 'Guardrail rule recorded');
audit_assert($sd_res['classification_message_codes'] === array('D1_ATTENTION'), 'Classification message emitted');

// ==========================================
// 5. FATIGUE & RÉCUPÉRATION: Attention rule (<=2/8) & Weakest dimensions
// ==========================================
$fr_config = array(
    'schema_version' => '2.0.0',
    'id' => 'fatigue-recuperation',
    'version' => '1.0.0',
    'status' => 'review',
    'locale' => 'fr-FR',
    'title' => 'Fatigue',
    'description' => 'Test fatigue',
    'population' => 'Adultes',
    'recall_period' => '7 jours',
    'estimated_duration' => '3 minutes',
    'scoring_direction' => 'higher_is_better',
    'score' => array('target_min' => 4, 'target_max' => 16, 'normalize_when_unavailable' => false, 'rounding' => 'half_up'),
    'questions' => array(
        array(
            'id' => 'FR01',
            'dimension' => 'd1',
            'text' => 'FR01',
            'required' => true,
            'answers' => array(
                array('value' => '1', 'label' => '1', 'points' => 1, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'FR02',
            'dimension' => 'd1',
            'text' => 'FR02',
            'required' => true,
            'answers' => array(
                array('value' => '1', 'label' => '1', 'points' => 1, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'FR03',
            'dimension' => 'd2',
            'text' => 'FR03',
            'required' => true,
            'answers' => array(
                array('value' => '1', 'label' => '1', 'points' => 1, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
        array(
            'id' => 'FR04',
            'dimension' => 'd2',
            'text' => 'FR04',
            'required' => true,
            'answers' => array(
                array('value' => '1', 'label' => '1', 'points' => 1, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
    ),
    'dimensions' => array(
        array(
            'id' => 'd1',
            'label' => 'Sommeil réparateur',
            'question_ids' => array('FR01', 'FR02'),
            'weakest_eligible' => true,
            'attention' => array('metric' => 'score', 'operator' => '<=', 'value' => 2, 'message_code' => 'D1_LOW'),
        ),
        array(
            'id' => 'd2',
            'label' => 'Vitalité',
            'question_ids' => array('FR03', 'FR04'),
            'weakest_eligible' => true,
        ),
    ),
    'weakest_dimensions' => array('count' => 1, 'tie_break' => 'configuration_order'),
    'result_levels' => array(
        array('code' => 'FAIBLE', 'rank' => 0, 'min' => 4, 'max' => 9, 'title' => 'Faible', 'description' => 'Faible', 'recommendations' => array()),
        array('code' => 'BON', 'rank' => 1, 'min' => 10, 'max' => 16, 'title' => 'Bon', 'description' => 'Bon', 'recommendations' => array()),
    ),
    'classification_rules' => array(),
    'classification_messages' => array(
        'D1_LOW' => array('title' => 'Attention sommeil', 'text' => 'Score sommeil trop faible.'),
    ),
    'safety_questions' => array(),
    'safety_messages' => array(),
    'result_ctas' => array(
        array('label' => 'Bilan', 'url' => '/bilan/', 'variant' => 'primary', 'enabled' => true),
    ),
    'disclaimer' => array('before' => 'Before', 'after' => 'After'),
);

audit_assert($validator->validate($fr_config) === array(), 'Fatigue config passes schema validation');
// d1 = 1+1 = 2 (<=2 => triggers attention!), d2 = 4+4 = 8 => Total 10 (BON)
$fr_res = $engine->score($fr_config, array('FR01' => '1', 'FR02' => '1', 'FR03' => '4', 'FR04' => '4'));
audit_assert($fr_res['final_score'] === 10, 'Fatigue score is 10');
audit_assert($fr_res['dimensions'][0]['attention'] === true, 'd1 attention triggered on score <= 2');
audit_assert($fr_res['dimensions'][1]['attention'] === false, 'd2 attention is false');
audit_assert($fr_res['weakest_dimensions'] === array('d1'), 'd1 is identified as weakest dimension');
audit_assert($fr_res['classification_message_codes'] === array('D1_LOW'), 'Dimension attention message emitted');

// ==========================================
// 6. PIEDS & CONFORT POSTURAL: Multiple safety triggers sorted by priority
// ==========================================
$pf_config = array(
    'schema_version' => '2.0.0',
    'id' => 'pieds-confort-postural',
    'version' => '1.0.0',
    'status' => 'review',
    'locale' => 'fr-FR',
    'title' => 'Pieds & Confort Postural',
    'description' => 'Test posture',
    'population' => 'Adultes',
    'recall_period' => '7 jours',
    'estimated_duration' => '3 minutes',
    'scoring_direction' => 'higher_is_better',
    'score' => array('target_min' => 0, 'target_max' => 4, 'normalize_when_unavailable' => false, 'rounding' => 'half_up'),
    'questions' => array(
        array(
            'id' => 'PF01',
            'dimension' => 'douleur',
            'text' => 'Douleur',
            'required' => true,
            'answers' => array(
                array('value' => '0', 'label' => '0', 'points' => 0, 'applicable' => true),
                array('value' => '4', 'label' => '4', 'points' => 4, 'applicable' => true),
            ),
        ),
    ),
    'dimensions' => array(
        array('id' => 'douleur', 'label' => 'Douleur', 'question_ids' => array('PF01'), 'weakest_eligible' => true),
    ),
    'weakest_dimensions' => array('count' => 1, 'tie_break' => 'configuration_order'),
    'result_levels' => array(
        array('code' => 'BON', 'rank' => 0, 'min' => 0, 'max' => 4, 'title' => 'Bon', 'description' => 'Bon', 'recommendations' => array()),
    ),
    'classification_rules' => array(),
    'classification_messages' => array(),
    'safety_questions' => array(
        array(
            'id' => 'PFSF01',
            'text' => 'Douleur aiguë',
            'required' => true,
            'answers' => array(
                array('value' => 'yes', 'label' => 'Oui', 'triggers' => array('URGENT_PAIN')),
                array('value' => 'no',  'label' => 'Non', 'triggers' => array()),
            ),
        ),
        array(
            'id' => 'PFSF02',
            'text' => 'Engourdissement',
            'required' => true,
            'answers' => array(
                array('value' => 'yes', 'label' => 'Oui', 'triggers' => array('NEURO_CHECK')),
                array('value' => 'no',  'label' => 'Non', 'triggers' => array()),
            ),
        ),
    ),
    'safety_messages' => array(
        'NEURO_CHECK'  => array('priority' => 50,  'title' => 'Contrôle neuro', 'text' => 'Consultez.'),
        'URGENT_PAIN'  => array('priority' => 100, 'title' => 'Douleur aiguë', 'text' => 'Consultez rapidement.'),
    ),
    'result_ctas' => array(
        array('label' => 'Podos360', 'url' => '/podos360/', 'variant' => 'primary', 'enabled' => true),
    ),
    'disclaimer' => array('before' => 'Before', 'after' => 'After'),
);

audit_assert($validator->validate($pf_config) === array(), 'Pieds config passes schema validation');
$pf_res = $engine->score($pf_config, array('PF01' => '4', 'PFSF01' => 'yes', 'PFSF02' => 'yes'));
audit_assert($pf_res['safety_flag_codes'] === array('URGENT_PAIN', 'NEURO_CHECK'), 'Safety flags ordered by descending priority');

echo "All 7 PDF methodology capabilities successfully verified in PHP scoring engine.\n";
