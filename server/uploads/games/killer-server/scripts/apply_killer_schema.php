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

$indexes = [
    'idx_killer_active_bet_lookup' => "ALTER TABLE `wa_touzhu` ADD INDEX `idx_killer_active_bet_lookup` (`expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`)",
];

foreach ($indexes as $index => $sql) {
    $stmt = $pdo->query("SHOW INDEX FROM `wa_touzhu` WHERE Key_name = " . $pdo->quote($index));
    if ($stmt->fetch()) {
        echo $index . ": exists" . PHP_EOL;
        continue;
    }

    $pdo->exec($sql);
    echo $index . ": added" . PHP_EOL;
}

$uniqueIndex = 'uniq_killer_active_bet';
$stmt = $pdo->query("SHOW INDEX FROM `wa_touzhu` WHERE Key_name = " . $pdo->quote($uniqueIndex));
if ($stmt->fetch()) {
    echo $uniqueIndex . ": exists" . PHP_EOL;
    return;
}

$duplicates = $pdo->query(
    "SELECT 1 FROM (
        SELECT `expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`, COUNT(*) AS c
        FROM `wa_touzhu`
        WHERE `ifyouxiao` = 1 AND `status` = 0
        GROUP BY `expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`
        HAVING c > 1
        LIMIT 1
    ) AS t"
)->fetch();

if ($duplicates) {
    echo $uniqueIndex . ": skipped, duplicate active bets exist" . PHP_EOL;
    return;
}

$pdo->exec("ALTER TABLE `wa_touzhu` ADD UNIQUE KEY `{$uniqueIndex}` (`expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`)");
echo $uniqueIndex . ": added" . PHP_EOL;
