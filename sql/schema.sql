-- ============================================================
-- Schéma PSS-10 - Perceived Stress Scale
-- Base MySQL pour questionnaire anonyme
-- ============================================================

-- Base de données (créer manuellement si besoin)
-- CREATE DATABASE IF NOT EXISTS pss10_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE pss10_db;

-- Table des sessions (une session = un questionnaire rempli)
CREATE TABLE IF NOT EXISTS pss_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  created_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  final_score TINYINT NULL COMMENT '10..50',
  category VARCHAR(10) NULL COMMENT 'low, medium, high'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des réponses (une ligne par question par session)
CREATE TABLE IF NOT EXISTS pss_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  question_id TINYINT NOT NULL COMMENT '1..10',
  selected_value TINYINT NOT NULL COMMENT '1..5 (valeur brute)',
  score_value TINYINT NOT NULL COMMENT '1..5 (déjà inversé si reverse)',
  answered_at DATETIME NOT NULL,
  UNIQUE KEY uk_session_question (session_id, question_id),
  CONSTRAINT fk_answers_session FOREIGN KEY (session_id) REFERENCES pss_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index pour analytics / requêtes par date
CREATE INDEX idx_sessions_created ON pss_sessions(created_at);
CREATE INDEX idx_answers_session ON pss_answers(session_id);
