(function (root, factory) {
  var engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.LifeMetricsQuestionnaireEngine = engine;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function sameValue(left, right) {
    return typeof left === typeof right && left === right;
  }

  function findAnswer(answers, value) {
    var answer = answers.find(function (candidate) { return sameValue(candidate.value, value); });
    if (!answer) throw new Error('invalid_submission');
    return answer;
  }

  function compare(left, operator, right) {
    if (operator === '<') return left < right;
    if (operator === '<=') return left <= right;
    if (operator === '==') return left === right;
    if (operator === '>=') return left >= right;
    if (operator === '>') return left > right;
    throw new Error('invalid_configuration');
  }

  function levelForScore(levels, score) {
    var level = levels.find(function (candidate) { return score >= candidate.min && score <= candidate.max; });
    if (!level) throw new Error('unscorable_answers');
    return level.code;
  }

  function score(config, answers) {
    var expected = config.questions.concat(config.safety_questions).map(function (question) { return question.id; }).sort();
    var actual = Object.keys(answers).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('invalid_submission');

    var selected = {};
    var raw = 0;
    var availableMin = 0;
    var availableMax = 0;
    var fullMin = 0;
    var fullMax = 0;
    var removedCapacity = false;
    var dimensionTotals = {};
    config.dimensions.forEach(function (dimension) {
      dimensionTotals[dimension.id] = { raw_score: 0, available_min: 0, available_max: 0 };
    });

    config.questions.forEach(function (question) {
      var applicable = question.answers.filter(function (answer) { return answer.applicable; });
      var minimum = Math.min.apply(null, applicable.map(function (answer) { return answer.points; }));
      var maximum = Math.max.apply(null, applicable.map(function (answer) { return answer.points; }));
      var answer = findAnswer(question.answers, answers[question.id]);
      fullMin += minimum;
      fullMax += maximum;
      selected[question.id] = { value: answer.value, points: answer.points, applicable: answer.applicable };
      if (!answer.applicable) { removedCapacity = true; return; }
      raw += answer.points;
      availableMin += minimum;
      availableMax += maximum;
      if (question.dimension !== null) {
        dimensionTotals[question.dimension].raw_score += answer.points;
        dimensionTotals[question.dimension].available_min += minimum;
        dimensionTotals[question.dimension].available_max += maximum;
      }
    });

    if (availableMax === availableMin) throw new Error('unscorable_answers');
    var finalScore;
    if (removedCapacity && config.score.normalize_when_unavailable) {
      var normalized = config.score.target_min + (raw - availableMin) / (availableMax - availableMin)
        * (config.score.target_max - config.score.target_min);
      finalScore = Math.floor(normalized + 0.5);
    } else if (fullMin === config.score.target_min && fullMax === config.score.target_max) {
      finalScore = raw;
    } else {
      throw new Error('unscorable_answers');
    }

    var dimensions = config.dimensions.map(function (definition, order) {
      var totals = dimensionTotals[definition.id];
      var capacity = totals.available_max - totals.available_min;
      var percentage = capacity === 0 ? null : (totals.raw_score - totals.available_min) / capacity * 100;
      var attention = false;
      if (percentage !== null && definition.attention) {
        var metric = definition.attention.metric === 'score' ? totals.raw_score : percentage;
        attention = compare(metric, definition.attention.operator, definition.attention.value);
      }
      return Object.assign({ id: definition.id }, totals, {
        percentage: percentage, unavailable: percentage === null, attention: attention,
        _order: order, _eligible: definition.weakest_eligible
      });
    });

    var calculated = levelForScore(config.result_levels, finalScore);
    var displayed = calculated;
    var appliedRules = [];
    var classificationMessages = [];
    config.classification_rules.forEach(function (rule) {
      var dimension = dimensions.find(function (item) { return item.id === rule.dimension; });
      var metric = rule.metric === 'dimension_score' ? dimension.raw_score : dimension.percentage;
      if (metric !== null && compare(metric, rule.operator, rule.value)) {
        var cap = config.result_levels.find(function (level) { return level.code === rule.max_category; });
        var current = config.result_levels.find(function (level) { return level.code === displayed; });
        if (current.rank > cap.rank) displayed = cap.code;
        appliedRules.push(rule.id);
        if (!classificationMessages.includes(rule.message_code)) classificationMessages.push(rule.message_code);
      }
    });
    config.dimensions.forEach(function (definition) {
      var dimension = dimensions.find(function (item) { return item.id === definition.id; });
      if (dimension.attention && definition.attention && !classificationMessages.includes(definition.attention.message_code)) {
        classificationMessages.push(definition.attention.message_code);
      }
    });

    var weakest = dimensions.filter(function (dimension) { return dimension._eligible && !dimension.unavailable; })
      .sort(function (left, right) { return left.percentage - right.percentage || left._order - right._order; })
      .slice(0, config.weakest_dimensions ? config.weakest_dimensions.count : 0)
      .map(function (dimension) { return dimension.id; });
    dimensions.forEach(function (dimension) { delete dimension._order; delete dimension._eligible; });

    var safetyAnswers = {};
    var triggered = {};
    var triggerOrder = 0;
    config.safety_questions.forEach(function (question) {
      var answer = findAnswer(question.answers, answers[question.id]);
      safetyAnswers[question.id] = { value: answer.value, triggers: answer.triggers };
      answer.triggers.forEach(function (code) {
        if (!triggered[code]) triggered[code] = { priority: config.safety_messages[code].priority, order: triggerOrder++ };
      });
    });
    var safetyFlags = Object.keys(triggered).sort(function (left, right) {
      return triggered[right].priority - triggered[left].priority || triggered[left].order - triggered[right].order;
    });

    return {
      raw_score: raw, available_min: availableMin, available_max: availableMax, final_score: finalScore,
      calculated_category: calculated, displayed_category: displayed, dimensions: dimensions,
      weakest_dimensions: weakest, applied_classification_rules: appliedRules,
      classification_message_codes: classificationMessages, safety_flag_codes: safetyFlags,
      selected_answers: selected, safety_answers: safetyAnswers
    };
  }

  return { score: score };
}));
