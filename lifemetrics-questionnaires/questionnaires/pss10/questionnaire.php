<?php
/**
 * LifeMetrics Questionnaire: PSS10 (Legacy Migration)
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

return array(
    'schema_version'      => '2.0.0',
    'id'                  => 'pss10',
    'version'             => '1.0.0',
    'status'       => 'review',
    'locale'              => 'fr-FR',
    'title'               => 'Test PSS10',
    'description'         => 'Test PSS10',
    'population'          => 'Adultes',
    'recall_period'       => '1 mois',
    'estimated_duration'  => '2 minutes',
    'scoring_direction'   => 'higher_is_worse',
    'presentation'        => array(
        'layout' => 'pss10',
        'theme'  => 'pss10',
    ),
    'score'               => array(
        'target_min'                 => 10,
        'target_max'                 => 50,
        'normalize_when_unavailable' => false,
        'rounding'                   => 'half_up',
    ),
    'questions'           => array(
        array(
            'id'         => 'q1',
            'text'       => 'Avez-vous été dérangé par un événement inattendu ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 1, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 2, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 4, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 5, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q2',
            'text'       => 'Vous a-t-il semblé difficile de contrôler les choses importantes de votre quotidien ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 1, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 2, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 4, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 5, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q3',
            'text'       => 'Vous êtes-vous senti nerveux et stressé ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 1, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 2, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 4, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 5, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q4',
            'text'       => 'Vous êtes-vous senti confiant dans vos capacités à prendre en main vos problèmes personnels ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 5, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 4, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 2, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 1, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q5',
            'text'       => 'Avez-vous senti que les choses allaient comme vous le vouliez ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 5, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 4, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 2, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 1, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q6',
            'text'       => 'Avez-vous pensé que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 1, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 2, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 4, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 5, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q7',
            'text'       => 'Avez-vous été capable de maîtriser votre énervement ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 5, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 4, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 2, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 1, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q8',
            'text'       => 'Avez-vous senti que vous contrôliez la situation ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 5, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 4, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 2, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 1, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q9',
            'text'       => 'Vous êtes-vous senti irrité parce que les événements échappaient à votre contrôle ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 1, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 2, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 4, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 5, 'applicable' => true ),
            ),
        ),
        array(
            'id'         => 'q10',
            'text'       => 'Avez-vous trouvé que les difficultés s\'accumulaient à un tel point que vous ne pouviez plus les surmonter ?',
            'dimension'  => null,
            'required'   => true,
            'answers'    => array(
                array( 'value' => '1', 'label' => 'Jamais', 'points' => 1, 'applicable' => true ),
                array( 'value' => '2', 'label' => 'Presque jamais', 'points' => 2, 'applicable' => true ),
                array( 'value' => '3', 'label' => 'Parfois', 'points' => 3, 'applicable' => true ),
                array( 'value' => '4', 'label' => 'Assez souvent', 'points' => 4, 'applicable' => true ),
                array( 'value' => '5', 'label' => 'Très souvent', 'points' => 5, 'applicable' => true ),
            ),
        ),
    ),
    'dimensions'          => array(),
    'safety_questions'    => array(),
    'result_levels'       => array(
        array(
            'code' => 'low',
            'min'   => 10,
            'max'   => 20,
            'label' => 'Stress bas',
        ),
        array(
            'code' => 'medium',
            'min'   => 21,
            'max'   => 26,
            'label' => 'Stress modéré',
        ),
        array(
            'code' => 'high',
            'min'   => 27,
            'max'   => 50,
            'label' => 'Stress élevé',
        ),
    ),
    'classification_rules'  => array(),
    'classification_messages' => array(
        'low' => array(
            'title' => 'Votre niveau de stress est bas, félicitations.',
            'text'  => "0-20 : vous n'avez pas trop de souci pour gérer vos stress. En suivant votre programme personnalisé, vous pourrez encore gagner en sérénité, vous relaxer et apprendre tous les outils pour gérer le stress et les émotions liées à celui-ci.",
        ),
        'medium' => array(
            'title' => 'Votre niveau de stress est assez élevé.',
            'text'  => "21-26 : il arrive que vous vous sentiez tendu et que vous ayez du mal à gérer certaines situations provoquant du stress. Cela peut vous amener à un sentiment d'impuissance qui peut affecter vos émotions. En suivant votre programme, vous aurez tous les outils pour gérer le stress et les émotions liées à celui-ci. Pensez également à contacter un de nos praticiens certifiés.",
        ),
        'high' => array(
            'title' => 'Votre niveau de stress est très élevé.',
            'text'  => "27 ou plus : vous êtes très affecté par le stress. Vous avez également très souvent le sentiment de ne pas contrôler certaines situations et que vos émotions prennent le dessus. Pas d'inquiétude, nous allons vous accompagner vers le mieux-être grâce au programme personnalisé conçu sur mesure pour gérer cette problématique qui importune votre quotidien. Pensez également à contacter un de nos praticiens certifiés.",
        ),
    ),
    'result_ctas' => array(
        array(
            'label'   => 'Je veux faire un bilan',
            'url'     => '/formulaire-bilan/',
            'variant' => 'primary',
            'enabled' => true,
        ),
        array(
            'label'   => 'Découvrir les autres tests',
            'url'     => '/tests-sante/',
            'variant' => 'secondary',
            'enabled' => false,
        ),
    ),
    'disclaimer' => array(
        'before' => '',
        'after'  => '',
    ),
    'approvals' => array(
        'content_scoring'   => true,
        'legal_licensing'   => false,
        'technical_runtime' => true,
        'publication'       => false,
    ),
);
