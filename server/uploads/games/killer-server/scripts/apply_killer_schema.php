<?php

$config = require dirname(__DIR__) . '/config/database.php';
$mysql = $config['connections']['mysql'];

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
    $mysql['host'],
    $mysql['port'],
    $mysql['database'],
    $mysql['charset']
);

$pdo = new PDO($dsn, $mysql['username'], $mysql['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$columns = [
    'mode' => "ALTER TABLE `wa_touzhu` ADD COLUMN `mode` varchar(16) NOT NULL DEFAULT 'ai' AFTER `isrobot`",
    'rewards' => "ALTER TABLE `wa_touzhu` ADD COLUMN `rewards` int(11) NOT NULL DEFAULT 0",
    'resultid' => "ALTER TABLE `wa_touzhu` ADD COLUMN `resultid` int(11) DEFAULT NULL",
    'resultname' => "ALTER TABLE `wa_touzhu` ADD COLUMN `resultname` varchar(64) DEFAULT NULL",
    'ifyouxiao' => "ALTER TABLE `wa_touzhu` ADD COLUMN `ifyouxiao` tinyint(1) NOT NULL DEFAULT 1",
];

foreach ($columns as $column => $sql) {
    $stmt = $pdo->query("SHOW COLUMNS FROM `wa_touzhu` LIKE " . $pdo->quote($column));
    if ($stmt->fetch()) {
        echo $column . ": exists" . PHP_EOL;
        continue;
    }

    $pdo->exec($sql);
    echo $column . ": added" . PHP_EOL;
}
