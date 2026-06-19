CREATE TABLE IF NOT EXISTS fishing_saves (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  save_data JSON NOT NULL,
  last_daily_reward_date VARCHAR(10) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_fishing_saves_user_game (user_id, game_id),
  INDEX idx_fishing_saves_user (user_id),
  INDEX idx_fishing_saves_game (game_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
