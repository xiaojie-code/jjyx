<?php

chdir(dirname(__DIR__));
require 'vendor/autoload.php';

support\App::loadAllConfig(['route']);

$lockKey = 'codex_killer_lock_test';
$token = plugin\webman\gateway\Common::acquireLock($lockKey, 2);
echo ($token ? 'lock ok' : 'lock failed') . PHP_EOL;

if ($token) {
    plugin\webman\gateway\Common::releaseLock($lockKey, $token);
}
