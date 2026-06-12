<?php

namespace plugin\webman\gateway;

use GatewayWorker\Lib\Gateway;
use support\Db;
use support\Redis;

class Common
{
    const MODE_AI = 'ai';
    const MODE_REAL = 'real';
    const PLAYER_BET_AMOUNTS = [100, 500, 1000, 3000, 5000, 10000];
    const ROBOT_BET_AMOUNTS = [100, 500, 1000, 3000];
    const DIRECT_GAME_REWARD_DEFAULT_RATE = 0.0015;
    const DIRECT_GAME_REWARD_MAX_GENERATION = 20;
    const LEGACY_PLAYER_BET_AMOUNT_MAP = [
        1 => 100,
        10 => 100,
        50 => 500,
        300 => 3000,
        2000 => 3000
    ];

    protected static $columnCache = [];
    protected static $schemaPrepared = false;
    protected static $appPdo = null;
    protected static $appDbConfig = null;

    static function normalizeMode($data = null)
    {
        $mode = '';
        if (is_array($data)) {
            $mode = $data['mode'] ?? ($data['match_mode'] ?? ($data['gameMode'] ?? ''));
        } elseif (is_string($data)) {
            $mode = $data;
        }

        $mode = strtolower(trim((string)$mode));
        if (in_array($mode, ['real', 'pvp', 'online', '真人', '真人模式'], true)) {
            return self::MODE_REAL;
        }

        return self::MODE_AI;
    }

    static function allowedBetAmounts($isRobot = false)
    {
        return $isRobot ? self::ROBOT_BET_AMOUNTS : self::PLAYER_BET_AMOUNTS;
    }

    static function isAllowedBetAmount($coin, $isRobot = false)
    {
        return in_array((int)$coin, self::allowedBetAmounts($isRobot), true);
    }

    static function normalizeBetAmount($coin, $isRobot = false, $preferLegacy = false)
    {
        $amount = (int)$coin;
        if ($amount <= 0) {
            return $amount;
        }

        if (self::isAllowedBetAmount($amount, $isRobot)) {
            return $amount;
        }

        if (!$isRobot && isset(self::LEGACY_PLAYER_BET_AMOUNT_MAP[$amount])) {
            $mapped = (int)self::LEGACY_PLAYER_BET_AMOUNT_MAP[$amount];
            if (self::isAllowedBetAmount($mapped, false)) {
                return $mapped;
            }
        }

        return $amount;
    }

    static function randomRobotBetAmount()
    {
        $amounts = self::ROBOT_BET_AMOUNTS;
        return $amounts[array_rand($amounts)];
    }

    static function getDataMode($data, $uid = null, $client_id = null)
    {
        if (is_array($data) && (isset($data['mode']) || isset($data['match_mode']) || isset($data['gameMode']))) {
            return self::normalizeMode($data);
        }

        if ($client_id) {
            $mode = self::getClientSelectedMode($client_id);
            if ($mode) {
                return $mode;
            }
        }

        if ($uid) {
            return self::getUserRoomMode($uid);
        }

        return self::MODE_AI;
    }

    static function roomGroup($roomid, $mode = self::MODE_AI)
    {
        $mode = self::normalizeMode($mode);
        return $mode === self::MODE_REAL ? 'real_' . $roomid : (string)$roomid;
    }

    static function roomNumsKey($roomid, $mode = self::MODE_AI)
    {
        $mode = self::normalizeMode($mode);
        return $mode === self::MODE_REAL ? 'roomnums_real_' . $roomid : 'roomnums_' . $roomid;
    }

    static function setUserRoomMode($uid, $mode)
    {
        Redis::set('killer_mode_' . $uid, self::normalizeMode($mode));
    }

    static function getUserRoomMode($uid)
    {
        $mode = Redis::get('killer_mode_' . $uid);
        return self::normalizeMode($mode ?: self::MODE_AI);
    }

    static function setClientSelectedMode($client_id, $mode)
    {
        Redis::set('killer_client_selected_mode_' . $client_id, self::normalizeMode($mode));
    }

    static function getClientSelectedMode($client_id)
    {
        $mode = Redis::get('killer_client_selected_mode_' . $client_id);
        return $mode ? self::normalizeMode($mode) : '';
    }

    static function clearClientSelectedMode($client_id)
    {
        Redis::del('killer_client_selected_mode_' . $client_id);
    }

    static function acquireLock($key, $ttl = 5)
    {
        $token = bin2hex(random_bytes(16));
        if (Redis::setnx($key, $token)) {
            Redis::expire($key, $ttl);
            return $token;
        }

        return false;
    }

    static function releaseLock($key, $token)
    {
        if (!$token) {
            return;
        }

        if ((string)Redis::get($key) === (string)$token) {
            Redis::del($key);
        }
    }

    static function ensureKillerSchema()
    {
        if (self::$schemaPrepared) {
            return;
        }

        self::addColumnIfMissing('wa_touzhu', 'mode', "ALTER TABLE `wa_touzhu` ADD COLUMN `mode` varchar(16) NOT NULL DEFAULT 'ai' AFTER `isrobot`");
        self::addColumnIfMissing('wa_touzhu', 'rewards', "ALTER TABLE `wa_touzhu` ADD COLUMN `rewards` int(11) NOT NULL DEFAULT 0");
        self::addColumnIfMissing('wa_touzhu', 'resultid', "ALTER TABLE `wa_touzhu` ADD COLUMN `resultid` int(11) DEFAULT NULL");
        self::addColumnIfMissing('wa_touzhu', 'resultname', "ALTER TABLE `wa_touzhu` ADD COLUMN `resultname` varchar(64) DEFAULT NULL");
        self::addColumnIfMissing('wa_touzhu', 'ifyouxiao', "ALTER TABLE `wa_touzhu` ADD COLUMN `ifyouxiao` tinyint(1) NOT NULL DEFAULT 1");
        self::addIndexIfMissing('wa_touzhu', 'idx_killer_active_bet_lookup', "ALTER TABLE `wa_touzhu` ADD INDEX `idx_killer_active_bet_lookup` (`expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`)");
        self::addUniqueActiveBetIndexIfSafe();

        self::$schemaPrepared = true;
    }

    static function addColumnIfMissing($table, $column, $sql)
    {
        if (self::columnExists($table, $column)) {
            return;
        }

        try {
            Db::statement($sql);
            self::$columnCache[$table . '.' . $column] = true;
        } catch (\Throwable $e) {
            self::$columnCache[$table . '.' . $column] = false;
        }
    }

    static function addIndexIfMissing($table, $index, $sql)
    {
        if (self::indexExists($table, $index)) {
            return;
        }

        try {
            Db::statement($sql);
        } catch (\Throwable $e) {
        }
    }

    static function addUniqueActiveBetIndexIfSafe()
    {
        $table = 'wa_touzhu';
        $index = 'uniq_killer_active_bet';
        if (self::indexExists($table, $index)) {
            return;
        }

        try {
            $duplicates = Db::select(
                "SELECT 1 FROM (
                    SELECT `expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`, COUNT(*) AS c
                    FROM `wa_touzhu`
                    WHERE `ifyouxiao` = 1 AND `status` = 0
                    GROUP BY `expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`
                    HAVING c > 1
                    LIMIT 1
                ) AS t"
            );
            if (!empty($duplicates)) {
                return;
            }

            Db::statement("ALTER TABLE `wa_touzhu` ADD UNIQUE KEY `{$index}` (`expect`, `mode`, `roomid`, `uid`, `status`, `ifyouxiao`)");
        } catch (\Throwable $e) {
        }
    }

    static function indexExists($table, $index)
    {
        try {
            $safeIndex = str_replace(['\\', "'"], ['\\\\', "\\'"], $index);
            $rows = Db::select("SHOW INDEX FROM `{$table}` WHERE Key_name = '{$safeIndex}'");
            return !empty($rows);
        } catch (\Throwable $e) {
            return false;
        }
    }

    static function columnExists($table, $column)
    {
        $key = $table . '.' . $column;
        if (array_key_exists($key, self::$columnCache)) {
            return self::$columnCache[$key];
        }

        try {
            $safeColumn = str_replace(['\\', "'"], ['\\\\', "\\'"], $column);
            $rows = Db::select("SHOW COLUMNS FROM `{$table}` LIKE '{$safeColumn}'");
            self::$columnCache[$key] = !empty($rows);
        } catch (\Throwable $e) {
            self::$columnCache[$key] = false;
        }

        return self::$columnCache[$key];
    }

    static function appendModeField($data, $mode)
    {
        self::ensureKillerSchema();
        if (self::columnExists('wa_touzhu', 'mode')) {
            $data['mode'] = self::normalizeMode($mode);
        }
        return $data;
    }

    static function applyModeWhere($query, $mode)
    {
        self::ensureKillerSchema();
        if (self::columnExists('wa_touzhu', 'mode')) {
            $query->where('mode', self::normalizeMode($mode));
        }
        return $query;
    }

    static function killer($settle = false)
    {
        self::ensureKillerSchema();

        $expect = self::getnowexpect();
        $key = 'killer_' . $expect;
        $killerRoomId = Redis::get($key);

        if (!$killerRoomId) {
            $killerRoomId = rand(1, 8);
            Redis::set($key, $killerRoomId);

            $record = [
                'samllroomid' => $killerRoomId,
                'roomname' => self::smallroomname($killerRoomId),
                'expect' => $expect,
                'addtime' => date('Y-m-d H:i:s', time())
            ];
            Db::table('wa_killer_record')->insert($record);
        }

        $room = [
            'killer_to_smallroomid' => (int)$killerRoomId,
            'tzcoin' => (int)Db::table('wa_touzhu')
                ->where(['expect' => $expect, 'tzid' => $killerRoomId, 'ifyouxiao' => 1])
                ->sum('coin')
        ];

        if ($settle) {
            $room['settlement'] = self::settleKiller($expect, (int)$killerRoomId);
        }

        return $room;
    }

    static function handlekiller($list, $expect, $roomid)
    {
        return self::settleKiller($expect, (int)$roomid);
    }

    static function settleKiller($expect, $killerRoomId)
    {
        $settledKey = 'killer_settled_' . $expect;
        $settled = Redis::get($settledKey);
        if ($settled) {
            $decoded = json_decode($settled, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $records = Db::table('wa_touzhu')
            ->where(['expect' => $expect, 'ifyouxiao' => 1, 'status' => 0])
            ->get()
            ->toArray();
        $records = self::object_array($records);

        $summary = [
            'expect' => $expect,
            'killer_room_id' => (int)$killerRoomId,
            'killer_room_name' => self::smallroomname($killerRoomId),
            'groups' => [],
            'winners' => [],
            'losers' => [],
            'winner_count' => 0,
            'loser_count' => 0,
            'reward_total' => 0,
            'real_lost_pool' => 0,
            'killed_room_pool' => 0,
            'survivor_count' => 0,
            'survivor_coin_total' => 0,
            'real_winner_coin_total' => 0,
            'distributed_bonus_total' => 0,
            'winner_share' => 0
        ];

        if (!$records) {
            Redis::set($settledKey, json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            return $summary;
        }

        $groups = [];
        foreach ($records as $record) {
            $mode = self::normalizeMode($record['mode'] ?? self::MODE_AI);
            $roomid = (int)($record['roomid'] ?? 0);
            $tzid = (int)($record['tzid'] ?? 0);
            if ($tzid < 1 || $tzid > 8) {
                continue;
            }
            $record['tzid'] = $tzid;
            $groupKey = $mode . '_' . $roomid;
            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'mode' => $mode,
                    'roomid' => $roomid,
                    'records' => []
                ];
            }
            $groups[$groupKey]['records'][] = $record;
        }

        foreach ($groups as $groupKey => $group) {
            $realLostPool = 0;
            $killedRoomPool = 0;
            $survivorCount = 0;
            $survivorCoinTotal = 0;
            $realWinnerCoinTotal = 0;
            $winners = [];

            foreach ($group['records'] as $record) {
                $coin = max(0, (int)($record['coin'] ?? 0));
                $isRobot = (int)($record['isrobot'] ?? 0) === 1;
                $isKilled = (int)$record['tzid'] === (int)$killerRoomId;

                if ($isKilled) {
                    $killedRoomPool += $coin;
                    if (!$isRobot) {
                        $realLostPool += $coin;
                    }
                } else {
                    $survivorCount++;
                    // All surviving bets, including robots, form the proportional payout denominator.
                    $survivorCoinTotal += $coin;
                    if (!$isRobot) {
                        $realWinnerCoinTotal += $coin;
                        $winners[] = $record;
                    }
                }
            }

            $rewardMap = self::buildRewardMap($winners, $killedRoomPool, $survivorCoinTotal);
            $winnerList = [];
            $loserList = [];
            $robotWinnerCount = 0;
            $robotLoserCount = 0;

            foreach ($group['records'] as $record) {
                $id = (int)$record['id'];
                $uid = (int)$record['uid'];
                $coin = max(0, (int)($record['coin'] ?? 0));
                $isRobot = (int)($record['isrobot'] ?? 0) === 1;
                $isKilled = (int)$record['tzid'] === (int)$killerRoomId;
                $reward = $rewardMap[$id] ?? 0;

                $update = [
                    'resultid' => (int)$killerRoomId,
                    'resultname' => self::smallroomname($killerRoomId),
                    'status' => $isKilled ? 2 : 1,
                    'rewards' => $isKilled ? 0 : $reward
                ];

                Db::table('wa_touzhu')->where(['id' => $id, 'status' => 0])->update($update);

                if (!$isKilled && !$isRobot && $reward > 0) {
                    self::updateusercoin($uid, $reward, 1);
                    self::usercoin_record([
                        'uid' => $uid,
                        'coin' => $reward,
                        'type' => 1,
                        'remark' => '大逃杀第' . $expect . '期幸存奖励，投注' . $coin . '积分，奖励' . $reward . '积分',
                        'addtime' => date('Y/m/d H:i:s', time())
                    ]);
                }

                if ($isKilled) {
                    if ($isRobot) {
                        $robotLoserCount++;
                    } else {
                        $loserList[] = self::settlementPlayerInfo(
                            $record,
                            0,
                            true,
                            $killedRoomPool,
                            $survivorCoinTotal
                        );
                    }
                } else {
                    if ($isRobot) {
                        $robotWinnerCount++;
                    } else {
                        $winnerList[] = self::settlementPlayerInfo(
                            $record,
                            $reward,
                            false,
                            $killedRoomPool,
                            $survivorCoinTotal
                        );
                    }
                }
            }

            $rewardTotal = array_sum($rewardMap);
            $groupSummary = [
                'mode' => $group['mode'],
                'roomid' => $group['roomid'],
                'winner_count' => count($winners),
                'loser_count' => count($loserList),
                'robot_winner_count' => $robotWinnerCount,
                'robot_loser_count' => $robotLoserCount,
                'real_lost_pool' => $realLostPool,
                'killed_room_pool' => $killedRoomPool,
                'survivor_count' => $survivorCount,
                'survivor_coin_total' => $survivorCoinTotal,
                'real_winner_coin_total' => $realWinnerCoinTotal,
                'distributed_bonus_total' => max(0, $rewardTotal - $realWinnerCoinTotal),
                'winner_share' => 0,
                'reward_total' => $rewardTotal,
                'winners' => $winnerList,
                'losers' => $loserList
            ];

            $summary['groups'][] = $groupSummary;
            $summary['winners'] = array_merge($summary['winners'], $winnerList);
            $summary['losers'] = array_merge($summary['losers'], $loserList);
            $summary['winner_count'] += $groupSummary['winner_count'];
            $summary['loser_count'] += $groupSummary['loser_count'];
            $summary['reward_total'] += $groupSummary['reward_total'];
            $summary['real_lost_pool'] += $groupSummary['real_lost_pool'];
            $summary['killed_room_pool'] += $groupSummary['killed_room_pool'];
            $summary['survivor_count'] += $groupSummary['survivor_count'];
            $summary['survivor_coin_total'] += $groupSummary['survivor_coin_total'];
            $summary['real_winner_coin_total'] += $groupSummary['real_winner_coin_total'];
            $summary['distributed_bonus_total'] += $groupSummary['distributed_bonus_total'];
        }

        Redis::set($settledKey, json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $summary;
    }

    static function settlementPlayerInfo($record, $reward, $isKilled, $killedRoomPool = 0, $survivorCoinTotal = 0)
    {
        $userinfo = self::getuserinfo($record['uid']);
        $points = (int)($userinfo['points'] ?? ($userinfo['coin'] ?? 0));
        $coin = max(0, (int)($record['coin'] ?? 0));
        $reward = max(0, (int)$reward);
        $survivorCoinTotal = max(0, (int)$survivorCoinTotal);
        $bonus = $isKilled ? 0 : max(0, $reward - $coin);
        $investmentRatio = !$isKilled && $survivorCoinTotal > 0
            ? round($coin / $survivorCoinTotal, 8)
            : 0;

        return [
            'uid' => (int)$record['uid'],
            'username' => $userinfo['username'] ?? '',
            'nickname' => $userinfo['nickname'] ?? '',
            'points' => $points,
            'balance' => $points,
            'roomid' => (int)($record['roomid'] ?? 0),
            'mode' => self::normalizeMode($record['mode'] ?? self::MODE_AI),
            'smallroomid' => (int)($record['tzid'] ?? 0),
            'smallroomname' => $record['tzname'] ?? self::smallroomname($record['tzid'] ?? 0),
            'coin' => $coin,
            'principal_return' => $isKilled ? 0 : $coin,
            'bonus' => $bonus,
            'reward' => $reward,
            'investment_ratio' => $investmentRatio,
            'survivor_coin_total' => $survivorCoinTotal,
            'killed_room_pool' => max(0, (int)$killedRoomPool),
            'status' => $isKilled ? 2 : 1
        ];
    }

    static function buildRewardMap($winners, $killedRoomPool, $survivorCoinTotal)
    {
        $rewardMap = [];
        $survivorCoinTotal = max(0, (int)$survivorCoinTotal);
        if (!$winners || $survivorCoinTotal <= 0) {
            return $rewardMap;
        }

        $killedRoomPool = max(0, (int)$killedRoomPool);

        foreach ($winners as $winner) {
            $id = (int)$winner['id'];
            $coin = max(0, (int)($winner['coin'] ?? 0));
            $bonus = (int)floor($killedRoomPool * $coin / $survivorCoinTotal);
            $rewardMap[$id] = $coin + $bonus;
        }

        return $rewardMap;
    }

    static function checktoken($client_id, $uid, $token)
    {
        $userToken = Db::table('wa_users')->where('id', $uid)->value('token');
        if (!$userToken) {
            $data = [
                'code' => 10020,
                'msg' => '用户不存在',
                'info' => ''
            ];
            Gateway::sendToClient($client_id, self::returndata('usernotexit', $data));
            return 10020;
        }

        if ((string)$userToken !== (string)$token) {
            $data = [
                'code' => 700,
                'msg' => '登录已过期，请重新登录',
                'info' => ''
            ];
            Gateway::sendToClient($client_id, self::returndata('tokenexpire', $data));
            return 700;
        }

        return 1;
    }

    static function returndata($action, $data)
    {
        return json_encode([
            'action' => $action,
            'data' => $data
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    static function getpaytypelist()
    {
        $config = self::getbaseconfig();
        return [
            'alipay' => $config['menu']['alipaystatus'] ?? 0,
            'wxpay' => $config['menu']['wxpaystatus'] ?? 0,
            'usdt' => $config['menu']['usdtstatus'] ?? 0
        ];
    }

    static function getbaseconfig()
    {
        $value = Db::table('wa_options')->where('name', 'system_config')->value('value');
        $config = json_decode((string)$value, true);
        return is_array($config) ? $config : [];
    }

    protected static function parseEnvFile($path)
    {
        $env = [];
        if (!$path || !is_file($path)) {
            return $env;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!$lines) {
            return $env;
        }

        foreach ($lines as $line) {
            $line = trim(ltrim($line, "\xEF\xBB\xBF"));
            if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            $first = substr($value, 0, 1);
            $last = substr($value, -1);
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
            if ($key !== '') {
                $env[$key] = $value;
            }
        }

        return $env;
    }

    protected static function envValue($env, $key, $default = '')
    {
        if (array_key_exists($key, $env)) {
            return $env[$key];
        }
        $value = getenv($key);
        if ($value !== false && $value !== '') {
            return $value;
        }
        return $default;
    }

    protected static function appDbConfig()
    {
        if (self::$appDbConfig !== null) {
            return self::$appDbConfig;
        }

        $serverEnvPath = realpath(base_path('../../..') . DIRECTORY_SEPARATOR . '.env');
        $env = self::parseEnvFile($serverEnvPath);
        self::$appDbConfig = [
            'host' => self::envValue($env, 'DB_HOST', '127.0.0.1'),
            'port' => self::envValue($env, 'DB_PORT', '3306'),
            'database' => self::envValue($env, 'DB_DATABASE', 'competitive_game'),
            'username' => self::envValue($env, 'DB_USERNAME', 'root'),
            'password' => self::envValue($env, 'DB_PASSWORD', ''),
        ];

        return self::$appDbConfig;
    }

    protected static function appPdo()
    {
        if (self::$appPdo instanceof \PDO) {
            return self::$appPdo;
        }

        $config = self::appDbConfig();
        $dsn = 'mysql:host=' . $config['host'] .
            ';port=' . $config['port'] .
            ';dbname=' . $config['database'] .
            ';charset=utf8mb4';

        try {
            self::$appPdo = new \PDO($dsn, $config['username'], $config['password'], [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            return self::$appPdo;
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected static function killerUserByUid($uid)
    {
        return Db::table('wa_users')->where('id', $uid)->first();
    }

    protected static function resolveAppUserFromKillerUser($killerUser, $pdo = null, $lock = false)
    {
        if (!$killerUser || (int)($killerUser->isrobot ?? 0) === 1) {
            return null;
        }

        $account = trim((string)($killerUser->username ?? ''));
        if ($account === '') {
            return null;
        }

        $pdo = $pdo ?: self::appPdo();
        if (!$pdo) {
            return false;
        }

        try {
            $sql = "SELECT u.id AS user_id, u.account, uc.points
                    FROM users u
                    LEFT JOIN user_currencies uc ON uc.user_id = u.id
                    WHERE u.account = ?
                    LIMIT 1" . ($lock ? " FOR UPDATE" : "");
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$account]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$row) {
                return null;
            }

            if ($row['points'] === null) {
                $insert = $pdo->prepare(
                    "INSERT IGNORE INTO user_currencies (user_id, points, created_at, updated_at)
                     VALUES (?, 0, NOW(), NOW())"
                );
                $insert->execute([(int)$row['user_id']]);

                $select = $pdo->prepare(
                    "SELECT points FROM user_currencies WHERE user_id = ? LIMIT 1" . ($lock ? " FOR UPDATE" : "")
                );
                $select->execute([(int)$row['user_id']]);
                $currency = $select->fetch(\PDO::FETCH_ASSOC);
                $row['points'] = $currency ? $currency['points'] : 0;
            }

            return [
                'user_id' => (int)$row['user_id'],
                'account' => $row['account'],
                'points' => (float)$row['points'],
            ];
        } catch (\Throwable $e) {
            return false;
        }
    }

    protected static function syncLocalScoreFromPoints($killerUid, $points)
    {
        $score = max(0, (int)floor((float)$points));
        try {
            Db::table('wa_users')->where('id', $killerUid)->update(['score' => $score]);
        } catch (\Throwable $e) {
        }
        return $score;
    }

    protected static function getUnifiedPoints($uid, $killerUser = null)
    {
        $killerUser = $killerUser ?: self::killerUserByUid($uid);
        if (!$killerUser) {
            return 0;
        }

        if ((int)($killerUser->isrobot ?? 0) === 1) {
            return (int)($killerUser->score ?? 0);
        }

        $mapped = self::resolveAppUserFromKillerUser($killerUser);
        if (is_array($mapped)) {
            return self::syncLocalScoreFromPoints($uid, $mapped['points']);
        }

        if ($mapped === false) {
            return 0;
        }

        return (int)($killerUser->score ?? 0);
    }

    protected static function appCurrencySn()
    {
        try {
            $random = strtoupper(bin2hex(random_bytes(4)));
        } catch (\Throwable $e) {
            $random = str_pad((string)mt_rand(0, 99999999), 8, '0', STR_PAD_LEFT);
        }

        return 'CL' . date('YmdHis') . $random;
    }

    protected static function appRoundPoints($value)
    {
        return round((float)$value, 6);
    }

    protected static function insertAppCurrencyLog($pdo, $userId, $amount, $before, $after, $logType, $description)
    {
        $stmt = $pdo->prepare(
            "INSERT INTO currency_logs
             (user_id, sn, currency_type, amount, before_balance, after_balance, log_type, description, created_at)
             VALUES (?, ?, 'points', ?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([
            $userId,
            self::appCurrencySn(),
            self::appRoundPoints($amount),
            self::appRoundPoints($before),
            self::appRoundPoints($after),
            substr((string)$logType, 0, 50),
            substr((string)$description, 0, 200),
        ]);
        return (int)$pdo->lastInsertId();
    }

    protected static function isAppDirectGameRewardEnabled($pdo)
    {
        try {
            $stmt = $pdo->prepare("SELECT status FROM system_switches WHERE feature_key = ? LIMIT 1");
            $stmt->execute(['direct_game_reward']);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return !$row || (int)($row['status'] ?? 1) === 1;
        } catch (\Throwable $e) {
            return true;
        }
    }

    protected static function appDirectGameRewardRate($pdo)
    {
        try {
            $stmt = $pdo->prepare("SELECT config_value FROM system_configs WHERE config_key = ? LIMIT 1");
            $stmt->execute(['direct_game_reward_rate']);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            $rate = isset($row['config_value']) ? (float)$row['config_value'] : self::DIRECT_GAME_REWARD_DEFAULT_RATE;
            return $rate > 0 ? $rate : self::DIRECT_GAME_REWARD_DEFAULT_RATE;
        } catch (\Throwable $e) {
            return self::DIRECT_GAME_REWARD_DEFAULT_RATE;
        }
    }

    protected static function maxAppDirectRewardGeneration($validDirectCount)
    {
        $count = (int)$validDirectCount;
        if ($count >= 6) {
            return 20;
        }
        if ($count >= 5) {
            return 15;
        }
        if ($count >= 4) {
            return 12;
        }
        if ($count >= 3) {
            return 9;
        }
        if ($count >= 2) {
            return 6;
        }
        if ($count >= 1) {
            return 3;
        }
        return 0;
    }

    protected static function appActiveAncestorChain($pdo, $userId)
    {
        $chain = [];
        $currentUserId = (int)$userId;
        $visited = [$currentUserId => true];

        for ($generation = 2; $generation <= self::DIRECT_GAME_REWARD_MAX_GENERATION; $generation++) {
            $stmt = $pdo->prepare("SELECT invited_by FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$currentUserId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            $parentId = (int)($row['invited_by'] ?? 0);
            if ($parentId <= 0 || isset($visited[$parentId])) {
                break;
            }
            $visited[$parentId] = true;

            $parentStmt = $pdo->prepare("SELECT id, is_activated, status FROM users WHERE id = ? LIMIT 1");
            $parentStmt->execute([$parentId]);
            $parent = $parentStmt->fetch(\PDO::FETCH_ASSOC);
            if ($parent && (int)($parent['status'] ?? 0) === 1 && (int)($parent['is_activated'] ?? 0) === 1) {
                $chain[] = ['userId' => $parentId, 'generation' => $generation];
            }
            $currentUserId = $parentId;
        }

        return $chain;
    }

    protected static function appValidDirectCount($pdo, $userId)
    {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) AS total
             FROM users
             WHERE invited_by = ? AND status = 1 AND is_activated = 1"
        );
        $stmt->execute([(int)$userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return (int)($row['total'] ?? 0);
    }

    protected static function changeAppPointsInAppDb($pdo, $userId, $amount, $logType, $description)
    {
        $userId = (int)$userId;
        $amount = self::appRoundPoints($amount);
        if ($userId <= 0 || $amount == 0) {
            return null;
        }

        $insert = $pdo->prepare(
            "INSERT IGNORE INTO user_currencies (user_id, points, created_at, updated_at)
             VALUES (?, 0, NOW(), NOW())"
        );
        $insert->execute([$userId]);

        $select = $pdo->prepare("SELECT points FROM user_currencies WHERE user_id = ? LIMIT 1 FOR UPDATE");
        $select->execute([$userId]);
        $currency = $select->fetch(\PDO::FETCH_ASSOC);
        if (!$currency) {
            return null;
        }

        $before = self::appRoundPoints($currency['points']);
        $after = self::appRoundPoints($before + $amount);
        if ($after < 0) {
            return null;
        }

        $update = $pdo->prepare("UPDATE user_currencies SET points = ?, updated_at = NOW() WHERE user_id = ?");
        $update->execute([$after, $userId]);
        $logId = self::insertAppCurrencyLog($pdo, $userId, $amount, $before, $after, $logType, $description);
        return ['before' => $before, 'after' => $after, 'amount' => $amount, 'logId' => $logId];
    }

    protected static function recordAppGameTurnoverForKiller($pdo, $userId, $sourceType, $amount, $currencyLogId, $description)
    {
        $userId = (int)$userId;
        $amount = self::appRoundPoints(abs((float)$amount));
        if ($userId <= 0 || $amount <= 0) {
            return;
        }

        $savepoint = 'killer_turnover_reward';
        try {
            $pdo->exec("SAVEPOINT " . $savepoint);

            $stmt = $pdo->prepare(
                "INSERT INTO game_turnover_records
                 (user_id, game_id, source_type, turnover_amount, currency_log_id, biz_id, description,
                  reward_status, reward_count, total_reward_amount, created_at)
                 VALUES (?, NULL, ?, ?, ?, NULL, ?, 0, 0, 0, NOW())"
            );
            $stmt->execute([
                $userId,
                substr((string)$sourceType, 0, 50),
                $amount,
                $currencyLogId ? (int)$currencyLogId : null,
                substr((string)$description, 0, 200),
            ]);
            $turnoverId = (int)$pdo->lastInsertId();

            if (!self::isAppDirectGameRewardEnabled($pdo)) {
                $update = $pdo->prepare(
                    "UPDATE game_turnover_records
                     SET reward_status = 2, reward_count = 0, total_reward_amount = 0, reward_processed_at = NOW()
                     WHERE id = ?"
                );
                $update->execute([$turnoverId]);
                $pdo->exec("RELEASE SAVEPOINT " . $savepoint);
                return;
            }

            $rate = self::appDirectGameRewardRate($pdo);
            $rewardCount = 0;
            $rewardAmount = 0;
            $ancestors = self::appActiveAncestorChain($pdo, $userId);

            foreach ($ancestors as $ancestor) {
                $ancestorUserId = (int)$ancestor['userId'];
                $generation = (int)$ancestor['generation'];
                $validDirectCount = self::appValidDirectCount($pdo, $ancestorUserId);
                $maxGeneration = self::maxAppDirectRewardGeneration($validDirectCount);
                if ($maxGeneration <= 0 || $generation > $maxGeneration) {
                    continue;
                }

                $amountToPay = self::appRoundPoints($amount * $rate);
                if ($amountToPay <= 0) {
                    continue;
                }

                $changed = self::changeAppPointsInAppDb(
                    $pdo,
                    $ancestorUserId,
                    $amountToPay,
                    'direct_game_reward',
                    'direct_game_reward:' . $amount . '*' . $rate
                );
                if (!$changed) {
                    continue;
                }

                $rewardStmt = $pdo->prepare(
                    "INSERT INTO direct_game_reward_records
                     (turnover_id, source_user_id, ancestor_user_id, generation, valid_direct_count,
                      max_generation, turnover_amount, reward_rate, reward_amount, currency_log_id,
                      status, remark, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())"
                );
                $rewardStmt->execute([
                    $turnoverId,
                    $userId,
                    $ancestorUserId,
                    $generation,
                    $validDirectCount,
                    $maxGeneration,
                    $amount,
                    $rate,
                    $amountToPay,
                    (int)$changed['logId'],
                    'paid_to_points',
                ]);

                $rewardCount++;
                $rewardAmount = self::appRoundPoints($rewardAmount + $amountToPay);
            }

            $update = $pdo->prepare(
                "UPDATE game_turnover_records
                 SET reward_status = 1, reward_rate = ?, reward_count = ?,
                     total_reward_amount = ?, reward_processed_at = NOW()
                 WHERE id = ?"
            );
            $update->execute([$rate, $rewardCount, $rewardAmount, $turnoverId]);
            $pdo->exec("RELEASE SAVEPOINT " . $savepoint);
        } catch (\Throwable $e) {
            try {
                $pdo->exec("ROLLBACK TO SAVEPOINT " . $savepoint);
                $pdo->exec("RELEASE SAVEPOINT " . $savepoint);
            } catch (\Throwable $rollbackError) {
            }
        }
    }

    protected static function changeAppPointsForKiller($uid, $amount, $logType, $description)
    {
        $killerUser = self::killerUserByUid($uid);
        if (!$killerUser || (int)($killerUser->isrobot ?? 0) === 1) {
            return null;
        }

        $pdo = self::appPdo();
        if (!$pdo) {
            return false;
        }

        try {
            $pdo->beginTransaction();
            $mapped = self::resolveAppUserFromKillerUser($killerUser, $pdo, true);
            if ($mapped === null) {
                $pdo->rollBack();
                return null;
            }
            if ($mapped === false) {
                $pdo->rollBack();
                return false;
            }

            $before = self::appRoundPoints($mapped['points']);
            $after = self::appRoundPoints($before + (float)$amount);
            if ($after < 0) {
                $pdo->rollBack();
                self::syncLocalScoreFromPoints($uid, $before);
                return false;
            }

            $update = $pdo->prepare("UPDATE user_currencies SET points = ?, updated_at = NOW() WHERE user_id = ?");
            $update->execute([$after, (int)$mapped['user_id']]);
            $logId = self::insertAppCurrencyLog($pdo, (int)$mapped['user_id'], $amount, $before, $after, $logType, $description);
            if (in_array((string)$logType, ['killer_bet', 'killer_win'], true)) {
                self::recordAppGameTurnoverForKiller(
                    $pdo,
                    (int)$mapped['user_id'],
                    (float)$amount < 0 ? 'bet' : 'game_settle',
                    abs((float)$amount),
                    $logId,
                    $description
                );
            }
            $pdo->commit();

            self::syncLocalScoreFromPoints($uid, $after);
            return [
                'before' => $before,
                'after' => $after,
                'amount' => self::appRoundPoints($amount),
            ];
        } catch (\Throwable $e) {
            try {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
            } catch (\Throwable $rollbackError) {
            }
            return false;
        }
    }

    static function getuserinfo($uid)
    {
        $ifexit = Db::table('wa_users')->where('id', $uid)->first();
        if (!$ifexit) {
            return [
                'id' => (int)$uid,
                'username' => '',
                'nickname' => '',
                'coin' => 0,
                'points' => 0,
                'money' => 0,
                'isrobot' => 0,
                'status' => 0,
                'roomid' => 0
            ];
        }

        $points = self::getUnifiedPoints($uid, $ifexit);

        return [
            'id' => $ifexit->id,
            'username' => $ifexit->username,
            'nickname' => $ifexit->nickname,
            'coin' => $points,
            'points' => $points,
            'money' => $ifexit->money,
            'isrobot' => $ifexit->isrobot,
            'status' => $ifexit->status,
            'roomid' => $ifexit->roomid
        ];
    }

    static function usercoin_record($data)
    {
        return Db::table('wa_usercoin_record')->insert($data) ? 1 : 0;
    }

    static function updateusercoin($uid, $coin, $type)
    {
        $coin = max(0, (int)$coin);
        if ($coin <= 0) {
            return 1;
        }

        $amount = $type == 0 ? -$coin : $coin;
        $logType = $type == 0 ? 'killer_bet' : 'killer_win';
        $description = $type == 0 ? 'Killer game bet' : 'Killer game reward';
        $appChange = self::changeAppPointsForKiller($uid, $amount, $logType, $description);
        if ($appChange !== null) {
            return $appChange ? 1 : 0;
        }

        if ($type == 0) {
            $affected = Db::table('wa_users')
                ->where('id', $uid)
                ->where('score', '>=', $coin)
                ->decrement('score', $coin);
        } else {
            $affected = Db::table('wa_users')->where('id', $uid)->increment('score', $coin);
        }

        return $affected ? 1 : 0;
    }

    static function upposition($uid, $smallroomid)
    {
        $expect = self::getnowexpect();
        Redis::set('position_' . $expect . '_' . $uid, $smallroomid);
        return 1;
    }

    static function robotmove($roomid = 2, $mode = self::MODE_AI, $broadcast = true)
    {
        $mode = self::normalizeMode($mode);
        if ($mode !== self::MODE_AI) {
            return [];
        }

        self::ensureKillerSchema();

        $robots = Db::table('wa_users')->where(['isrobot' => 1, 'roomid' => 0])->get()->toArray();
        $listRobots = self::object_array($robots);
        if (!$listRobots) {
            return [];
        }

        $expect = self::getnowexpect();
        $nums = min(rand(2, 6), count($listRobots));
        $keys = array_rand($listRobots, $nums);
        if (!is_array($keys)) {
            $keys = [$keys];
        }

        $moved = [];
        foreach ($keys as $keyt) {
            $v = $listRobots[$keyt];
            $smallroomid = rand(1, 8);
            $positionKey = self::robotPositionKey($expect, $roomid, $mode, $v['id']);
            Redis::set($positionKey, $smallroomid);

            $to = [
                'uid' => (string)$v['id'],
                'smallroomid' => $smallroomid
            ];

            if ($broadcast) {
                Gateway::sendToGroup(self::roomGroup($roomid, $mode), self::returndata('usertouzhu', [
                'code' => 1,
                'msg' => '用户投注位置变更',
                'info' => $to
            ]));

            }

            $coin = self::randomRobotBetAmount();

            $query = Db::table('wa_touzhu')->where([
                'expect' => $expect,
                'uid' => $v['id'],
                'roomid' => $roomid,
                'ifyouxiao' => 1,
                'status' => 0
            ]);
            $query = self::applyModeWhere($query, $mode);
            $exists = $query->first();

            $touzhu = self::appendModeField([
                'uid' => $v['id'],
                'expect' => $expect,
                'tzid' => $smallroomid,
                'tzname' => self::smallroomname($smallroomid),
                'coin' => $coin,
                'addtime' => date('Y-m-d H:i:s', time()),
                'status' => 0,
                'roomid' => $roomid,
                'isrobot' => 1,
                'ifyouxiao' => 1
            ], $mode);

            if ($exists) {
                Db::table('wa_touzhu')->where('id', $exists->id)->update($touzhu);
            } else {
                Db::table('wa_touzhu')->insert($touzhu);
            }

            if ($broadcast) {
                Gateway::sendToGroup(self::roomGroup($roomid, $mode), self::returndata('updatesmallcoin', [
                'code' => 1,
                'msg' => '小房间投注总额更新',
                'info' => self::getroom_coin_list($roomid, $expect, $mode)
            ]));

            }

            $moved[] = $to;
        }

        return $moved;
    }

    static function robotmoveForActiveRooms()
    {
        $rooms = Db::table('wa_rooms')->where('status', 1)->get();
        $rooms = self::object_array($rooms);
        $moved = [];

        foreach ($rooms as $room) {
            $roomid = (int)($room['id'] ?? 0);
            if ($roomid <= 0) {
                continue;
            }

            $group = self::roomGroup($roomid, self::MODE_AI);
            if (Gateway::getClientCountByGroup($group) <= 0) {
                continue;
            }

            $moved[$roomid] = self::robotmove($roomid, self::MODE_AI);
        }

        return $moved;
    }

    static function robotPositionKey($expect, $roomid, $mode, $uid)
    {
        return 'robotpositon_' . $expect . '_' . self::normalizeMode($mode) . '_' . $roomid . '_' . $uid;
    }

    static function getrobotposition($uid, $roomid = 2, $mode = self::MODE_AI)
    {
        $expect = self::getnowexpect();
        $p = Redis::get(self::robotPositionKey($expect, $roomid, $mode, $uid));
        return $p ?: '0';
    }

    static function getposition($uid)
    {
        $expect = self::getnowexpect();
        $p = Redis::get('position_' . $expect . '_' . $uid);
        return $p ?: '0';
    }

    static function joinrobots($roomid = 2, $mode = self::MODE_AI)
    {
        if (self::normalizeMode($mode) !== self::MODE_AI) {
            return [];
        }

        $robots = Db::table('wa_users')->where(['isrobot' => 1, 'roomid' => 0])->get()->toArray();
        $listRobots = self::object_array($robots);
        $new = [];

        foreach ($listRobots as $v) {
            $v['client_id'] = 'robot_' . $v['id'];
            $v['uid'] = (string)$v['id'];
            $v['userinfo'] = self::getuserinfo($v['id']);
            $v['position'] = self::getrobotposition($v['id'], $roomid, $mode);
            $v['mode'] = self::MODE_AI;
            $new[] = $v;
        }

        return $new;
    }

    static function object_array($array)
    {
        if (is_object($array)) {
            $array = (array)$array;
        }

        if (is_array($array)) {
            foreach ($array as $key => $value) {
                $array[$key] = self::object_array($value);
            }
        }

        return $array;
    }

    static function enterroom($client_id, $roomid, $userinfo, $mode = self::MODE_AI)
    {
        $mode = self::normalizeMode($mode);
        $group = self::roomGroup($roomid, $mode);

        Redis::set('binduid_' . $client_id, $userinfo['id']);
        Gateway::bindUid($client_id, $userinfo['id']);

        $oldRoom = Redis::get('killer_client_room_' . $client_id);
        $oldMode = Redis::get('killer_client_mode_' . $client_id);
        $oldGroup = $oldRoom ? self::roomGroup($oldRoom, $oldMode ?: self::MODE_AI) : '';

        if ($oldRoom && $oldGroup !== $group) {
            Gateway::leaveGroup($client_id, $oldGroup);
            self::uproom_nums($oldRoom, 0, 1, $oldMode ?: self::MODE_AI);
        }

        Gateway::joinGroup($client_id, $group);
        self::changeuserroomid($userinfo['id'], $roomid);
        self::setUserRoomMode($userinfo['id'], $mode);

        Redis::set('killer_client_room_' . $client_id, $roomid);
        Redis::set('killer_client_mode_' . $client_id, $mode);

        if (!$oldRoom || $oldGroup !== $group) {
            self::uproom_nums($roomid, 1, 1, $mode);
        }
    }

    static function leaveroom($client_id, $roomid, $userinfo, $mode = null)
    {
        $mode = $mode ? self::normalizeMode($mode) : self::getUserRoomMode($userinfo['id']);
        $group = self::roomGroup($roomid, $mode);

        Gateway::leaveGroup($client_id, $group);
        self::changeuserroomid($userinfo['id'], 0);
        self::uproom_nums($roomid, 0, 1, $mode);

        Redis::set('killer_client_room_' . $client_id, '');
        Redis::set('killer_client_mode_' . $client_id, '');
        Redis::set('killer_mode_' . $userinfo['id'], self::MODE_AI);
    }

    static function changeuserroomid($uid, $roomid)
    {
        Db::table('wa_users')->where('id', $uid)->update(['roomid' => $roomid]);
    }

    static function getroom_nums($roomid, $mode = self::MODE_AI)
    {
        $key = self::roomNumsKey($roomid, $mode);
        $nums = Redis::get($key);
        if (!$nums) {
            Redis::set($key, 0);
            return 0;
        }
        return (int)$nums;
    }

    static function getnowexpect()
    {
        $hour = date('H');
        $min = date('i');
        $a = $hour * 60 + $min;

        if ($a < 1000 && $a > 100) {
            $a = '0' . $a;
        }
        if ($a < 100) {
            $a = '00' . $a;
        }

        return date('Ymd') . $a;
    }

    static function gettimebyexpect($expect)
    {
        $a = substr($expect, 8);
        $year = substr($expect, 0, 4);
        $month = substr($expect, 4, 2);
        $day = substr($expect, 6, 2);
        $date = $year . '/' . $month . '/' . $day;

        if (isset($a[0]) && $a[0] === '0') {
            $a = mb_substr($a, 1);
        }

        $hour = intval(floor($a / 60));
        $min = $a % 60;
        $time = strtotime($date . ' ' . $hour . ':' . $min);
        return date('Y/m/d H:i', $time);
    }

    static function getroom_coin_list($roomid, $expect, $mode = self::MODE_AI)
    {
        self::ensureKillerSchema();

        $new = [];
        for ($i = 0; $i < 9; $i++) {
            $query = Db::table('wa_touzhu')->where([
                'roomid' => $roomid,
                'tzid' => $i,
                'expect' => $expect,
                'ifyouxiao' => 1
            ]);
            $query = self::applyModeWhere($query, $mode);

            $new[] = [
                'smallroomid' => $i,
                'allcoin' => (int)$query->sum('coin')
            ];
        }

        return $new;
    }

    static function uproom_nums($roomid, $type, $num, $mode = self::MODE_AI)
    {
        $key = self::roomNumsKey($roomid, $mode);
        $nums = (int)(Redis::get($key) ?: 0);

        if ($type == 1) {
            $nums += $num;
        } else {
            $nums = max(0, $nums - $num);
        }

        Redis::set($key, $nums);
        return $nums;
    }

    static function smallroomname($id)
    {
        switch ((string)$id) {
            case '0':
                return '开始位置';
            case '1':
                return '厂长室';
            case '2':
                return '休息室';
            case '3':
                return '杂物间';
            case '4':
                return '谈话室';
            case '5':
                return '茶水间';
            case '6':
                return '工作室';
            case '7':
                return '洗衣房';
            case '8':
                return '音乐室';
            default:
                return '';
        }
    }

    static function getmytzinfo($uid)
    {
        $info = [];
        $info['allcoin'] = (string)Db::table('wa_touzhu')->where(['uid' => $uid, 'ifyouxiao' => 1])->sum('coin');
        $info['reward'] = (string)Db::table('wa_touzhu')->where(['uid' => $uid, 'ifyouxiao' => 1, 'status' => 1])->sum('rewards');
        $info['list'] = Db::table('wa_touzhu')->where(['uid' => $uid, 'ifyouxiao' => 1])->orderByDesc('id')->limit(60)->get();
        return $info;
    }
}
