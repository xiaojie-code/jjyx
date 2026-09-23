require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  try {
    const [rows] = await connection.query(
      `SELECT id, user_id, account,
              CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4)) AS phone,
              status, sms_status, sms_attempts, sms_error, sent_at,
              operator_id, handled_at, created_at, updated_at
       FROM password_reset_requests ORDER BY id DESC LIMIT 10`,
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await connection.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
