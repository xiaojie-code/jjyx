CREATE TABLE IF NOT EXISTS snake_saves (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  save_data JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_snake_saves_user_game (user_id, game_id),
  INDEX idx_snake_saves_user (user_id),
  INDEX idx_snake_saves_game (game_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
