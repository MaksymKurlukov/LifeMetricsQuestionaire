<?php

return array (
  'schema_version' => '2.0.0',
  'id' => 'pss10',
  'version' => '1.0.0',
  'status' => 'review',
  'locale' => 'fr-FR',
  'title' => 'Évaluez votre niveau de stress',
  'description' => 'Évaluez rapidement votre niveau de stress ressenti grâce à l\'échelle de stress perçu développée par Cohen et Williamson en 1983.',
  'population' => 'Adultes',
  'recall_period' => 'Au cours du mois dernier',
  'estimated_duration' => '2 minutes',
  'scoring_direction' => 'higher_is_worse',
  'score' => 
  array (
    'target_min' => 10,
    'target_max' => 50,
    'normalize_when_unavailable' => false,
    'rounding' => 'half_up',
  ),
  'questions' => 
  array (
    0 => 
    array (
      'id' => 'Q1',
      'dimension' => NULL,
      'text' => 'Avez-vous été dérangé par un événement inattendu ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 1,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 2,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 4,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 5,
          'applicable' => true,
        ),
      ),
    ),
    1 => 
    array (
      'id' => 'Q2',
      'dimension' => NULL,
      'text' => 'Vous a-t-il semblé difficile de contrôler les choses importantes de votre quotidien ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 1,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 2,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 4,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 5,
          'applicable' => true,
        ),
      ),
    ),
    2 => 
    array (
      'id' => 'Q3',
      'dimension' => NULL,
      'text' => 'Vous êtes-vous senti nerveux et stressé ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 1,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 2,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 4,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 5,
          'applicable' => true,
        ),
      ),
    ),
    3 => 
    array (
      'id' => 'Q4',
      'dimension' => NULL,
      'text' => 'Vous êtes-vous senti confiant dans vos capacités à prendre en main vos problèmes personnels ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 5,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 4,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 2,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 1,
          'applicable' => true,
        ),
      ),
    ),
    4 => 
    array (
      'id' => 'Q5',
      'dimension' => NULL,
      'text' => 'Avez-vous senti que les choses allaient comme vous le vouliez ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 5,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 4,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 2,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 1,
          'applicable' => true,
        ),
      ),
    ),
    5 => 
    array (
      'id' => 'Q6',
      'dimension' => NULL,
      'text' => 'Avez-vous pensé que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 1,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 2,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 4,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 5,
          'applicable' => true,
        ),
      ),
    ),
    6 => 
    array (
      'id' => 'Q7',
      'dimension' => NULL,
      'text' => 'Avez-vous été capable de maîtriser votre énervement ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 5,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 4,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 2,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 1,
          'applicable' => true,
        ),
      ),
    ),
    7 => 
    array (
      'id' => 'Q8',
      'dimension' => NULL,
      'text' => 'Avez-vous senti que vous contrôliez la situation ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 5,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 4,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 2,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 1,
          'applicable' => true,
        ),
      ),
    ),
    8 => 
    array (
      'id' => 'Q9',
      'dimension' => NULL,
      'text' => 'Vous êtes-vous senti irrité parce que les événements échappaient à votre contrôle ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 1,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 2,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 4,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 5,
          'applicable' => true,
        ),
      ),
    ),
    9 => 
    array (
      'id' => 'Q10',
      'dimension' => NULL,
      'text' => 'Avez-vous trouvé que les difficultés s\'accumulaient à un tel point que vous ne pouviez plus les surmonter ?',
      'required' => true,
      'answers' => 
      array (
        0 => 
        array (
          'value' => '1',
          'label' => 'Jamais',
          'points' => 1,
          'applicable' => true,
        ),
        1 => 
        array (
          'value' => '2',
          'label' => 'Presque jamais',
          'points' => 2,
          'applicable' => true,
        ),
        2 => 
        array (
          'value' => '3',
          'label' => 'Parfois',
          'points' => 3,
          'applicable' => true,
        ),
        3 => 
        array (
          'value' => '4',
          'label' => 'Assez souvent',
          'points' => 4,
          'applicable' => true,
        ),
        4 => 
        array (
          'value' => '5',
          'label' => 'Très souvent',
          'points' => 5,
          'applicable' => true,
        ),
      ),
    ),
  ),
  'dimensions' => 
  array (
  ),
  'safety_questions' => 
  array (
  ),
  'safety_messages' => 
  array (
  ),
  'result_levels' => 
  array (
    0 => 
    array (
      'code' => 'LOW',
      'rank' => 0,
      'min' => 10,
      'max' => 20,
      'title' => 'Stress bas',
      'description' => 'Votre niveau de stress est bas, félicitations.',
      'recommendations' => 
      array (
      ),
    ),
    1 => 
    array (
      'code' => 'MEDIUM',
      'rank' => 1,
      'min' => 21,
      'max' => 26,
      'title' => 'Stress assez élevé',
      'description' => 'Votre niveau de stress est assez élevé.',
      'recommendations' => 
      array (
      ),
    ),
    2 => 
    array (
      'code' => 'HIGH',
      'rank' => 2,
      'min' => 27,
      'max' => 50,
      'title' => 'Stress très élevé',
      'description' => 'Votre niveau de stress est très élevé.',
      'recommendations' => 
      array (
      ),
    ),
  ),
  'classification_rules' => 
  array (
  ),
  'classification_messages' => 
  array (
    'LOW' => 
    array (
      'title' => 'Votre niveau de stress est bas, félicitations.',
      'text' => '0-20 : vous n\'avez pas trop de souci pour gérer vos stress. En suivant votre programme personnalisé, vous pourrez encore gagner en sérénité, vous relaxer et apprendre tous les outils pour gérer le stress et les émotions liées à celui-ci.',
    ),
    'MEDIUM' => 
    array (
      'title' => 'Votre niveau de stress est assez élevé.',
      'text' => '21-26 : il arrive que vous vous sentiez tendu et que vous ayez du mal à gérer certaines situations provoquant du stress. Cela peut vous amener à un sentiment d\'impuissance qui peut affecter vos émotions. En suivant votre programme, vous aurez tous les outils pour gérer le stress et les émotions liées à celui-ci. Pensez également à contacter un de nos praticiens certifiés.',
    ),
    'HIGH' => 
    array (
      'title' => 'Votre niveau de stress est très élevé.',
      'text' => '27 ou plus : vous êtes très affecté par le stress. Vous avez également très souvent le sentiment de ne pas contrôler certaines situations et que vos émotions prennent le dessus. Pas d\'inquiétude, nous allons vous accompagner vers le mieux-être grâce au programme personnalisé conçu sur mesure pour gérer cette problématique qui importune votre quotidien. Pensez également à contacter un de nos praticiens certifiés.',
    ),
  ),
  'result_ctas' => 
  array (
    0 => 
    array (
      'label' => 'Je veux faire un bilan',
      'url' => '/formulaire-bilan/',
      'variant' => 'primary',
      'enabled' => true,
    ),
    1 => 
    array (
      'label' => 'Découvrir les autres tests',
      'url' => '/tests-sante/',
      'variant' => 'secondary',
      'enabled' => false,
    ),
  ),
  'disclaimer' => 
  array (
    'before' => 'Ce questionnaire est un outil d\'évaluation et ne remplace pas un avis médical.',
    'after' => 'Consultez un professionnel de santé en cas de doute.',
  ),
  'approvals' => 
  array (
    'content_scoring' => true,
    'legal_licensing' => false,
    'technical_runtime' => true,
    'publication' => false,
  ),
);
