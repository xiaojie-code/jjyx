require('dotenv').config();
const mysql = require('mysql2/promise');

const columns = {
  sms_status:
    "TINYINT NOT NULL DEFAULT 0 COMMENT '0待发送 1发送中 2成功 3失败'",
  sms_attempts: 'INT NOT NULL DEFAULT 0',
  sms_error: 'VARCHAR(500) NULL',
  sent_at: 'DATETIME NULL',
  reject_reason: 'VARCHAR(500) NULL',
  created_ip: 'VARCHAR(50) NULL',
};

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1已重置并发送 2已拒绝',
        new_password VARCHAR(50) NULL,
        operator_id INT NULL,
        sms_status TINYINT NOT NULL DEFAULT 0 COMMENT '0待发送 1发送中 2成功 3失败',
        sms_attempts INT NOT NULL DEFAULT 0,
        sms_error VARCHAR(500) NULL,
        sent_at DATETIME NULL,
        reject_reason VARCHAR(500) NULL,
        created_ip VARCHAR(50) NULL,
        handled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_password_reset_status (status),
        INDEX idx_password_reset_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [existingRows] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_requests'`,
    );
    const existing = new Set(existingRows.map((row) => row.COLUMN_NAME));
    for (const [name, definition] of Object.entries(columns)) {
      if (existing.has(name)) continue;
      await connection.query(
        `ALTER TABLE password_reset_requests ADD COLUMN \`${name}\` ${definition}`,
      );
      console.log(`Added password_reset_requests.${name}`);
    }

    const [result] = await connection.query(
      'UPDATE password_reset_requests SET new_password = NULL WHERE new_password IS NOT NULL',
    );
    console.log(`Password reset schema ready; cleared ${result.affectedRows} plaintext value(s).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Password reset migration failed: ${error.message}`);
  process.exit(1);
});
