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

    protected static $columnCache = [];
    protected static $schemaPrepared = false;

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
            ->get();
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
            'real_lost_pool' => 0
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
            $winnerStakePool = 0;
            $winners = [];

            foreach ($group['records'] as $record) {
                $coin = max(0, (int)($record['coin'] ?? 0));
                $isRobot = (int)($record['isrobot'] ?? 0) === 1;
                $isKilled = (int)$record['tzid'] === (int)$killerRoomId;

                if ($isKilled) {
                    if (!$isRobot) {
                        $realLostPool += $coin;
                    }
                } elseif (!$isRobot) {
                    $winnerStakePool += $coin;
                    $winners[] = $record;
                }
            }

            $rewardMap = self::buildRewardMap($winners, $winnerStakePool, $realLostPool);
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
                        'remark' => '大逃杀第' . $expect . '期幸存奖励，投注' . $coin . '金币，奖励' . $reward . '金币',
                        'addtime' => date('Y/m/d H:i:s', time())
                    ]);
                }

                if ($isKilled) {
                    if ($isRobot) {
                        $robotLoserCount++;
                    } else {
                        $loserList[] = self::settlementPlayerInfo($record, 0, true);
                    }
                } else {
                    if ($isRobot) {
                        $robotWinnerCount++;
                    } else {
                        $winnerList[] = self::settlementPlayerInfo($record, $reward, false);
                    }
                }
            }

            $groupSummary = [
                'mode' => $group['mode'],
                'roomid' => $group['roomid'],
                'winner_count' => count($winners),
                'loser_count' => count($loserList),
                'robot_winner_count' => $robotWinnerCount,
                'robot_loser_count' => $robotLoserCount,
                'real_lost_pool' => $realLostPool,
                'reward_total' => array_sum($rewardMap),
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
        }

        Redis::set($settledKey, json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $summary;
    }

    static function settlementPlayerInfo($record, $reward, $isKilled)
    {
        $userinfo = self::getuserinfo($record['uid']);
        return [
            'uid' => (int)$record['uid'],
            'username' => $userinfo['username'] ?? '',
            'nickname' => $userinfo['nickname'] ?? '',
            'roomid' => (int)($record['roomid'] ?? 0),
            'mode' => self::normalizeMode($record['mode'] ?? self::MODE_AI),
            'smallroomid' => (int)($record['tzid'] ?? 0),
            'smallroomname' => $record['tzname'] ?? self::smallroomname($record['tzid'] ?? 0),
            'coin' => max(0, (int)($record['coin'] ?? 0)),
            'reward' => max(0, (int)$reward),
            'status' => $isKilled ? 2 : 1
        ];
    }

    static function buildRewardMap($winners, $winnerStakePool, $realLostPool)
    {
        $rewardMap = [];
        if (!$winners || $winnerStakePool <= 0) {
            return $rewardMap;
        }

        $shareTotal = 0;
        foreach ($winners as $winner) {
            $id = (int)$winner['id'];
            $coin = max(0, (int)$winner['coin']);
            $share = $realLostPool > 0 ? (int)floor($realLostPool * $coin / $winnerStakePool) : 0;
            $rewardMap[$id] = $coin + $share;
            $shareTotal += $share;
        }

        $remainder = $realLostPool - $shareTotal;
        if ($remainder > 0) {
            usort($winners, function ($a, $b) {
                $coinCompare = (int)$b['coin'] <=> (int)$a['coin'];
                if ($coinCompare !== 0) {
                    return $coinCompare;
                }
                return (int)$a['id'] <=> (int)$b['id'];
            });

            foreach ($winners as $winner) {
                if ($remainder <= 0) {
                    break;
                }
                $rewardMap[(int)$winner['id']]++;
                $remainder--;
            }
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

    static function getuserinfo($uid)
    {
        $ifexit = Db::table('wa_users')->where('id', $uid)->first();
        if (!$ifexit) {
            return [
                'id' => (int)$uid,
                'username' => '',
                'nickname' => '',
                'coin' => 0,
                'money' => 0,
                'isrobot' => 0,
                'status' => 0,
                'roomid' => 0
            ];
        }

        return [
            'id' => $ifexit->id,
            'username' => $ifexit->username,
            'nickname' => $ifexit->nickname,
            'coin' => $ifexit->score,
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

    static function robotmove($roomid = 2, $mode = self::MODE_AI)
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

            Gateway::sendToGroup(self::roomGroup($roomid, $mode), self::returndata('usertouzhu', [
                'code' => 1,
                'msg' => '用户投注位置变更',
                'info' => $to
            ]));

            $coin = self::randomRobotBetAmount();

            $query = Db::table('wa_touzhu')->where([
                'expect' => $expect,
                'uid' => $v['id'],
                'roomid' => $roomid,
                'ifyouxiao' => 1
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

            Gateway::sendToGroup(self::roomGroup($roomid, $mode), self::returndata('updatesmallcoin', [
                'code' => 1,
                'msg' => '小房间投注总额更新',
                'info' => self::getroom_coin_list($roomid, $expect, $mode)
            ]));

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
