<?php

namespace plugin\webman\gateway;

use GatewayWorker\Lib\Gateway;
use support\Db;
use support\Redis;

class Taosha
{
    public static function timer()
    {
        $tickKey = 'killer_timer_tick_' . date('YmdHis');
        if (!Redis::setnx($tickKey, 1)) {
            return;
        }
        Redis::expire($tickKey, 2);

        $time = self::roundTimeLeft();
        $expect = Common::getnowexpect();

        $groups = self::activeRoundGroups($expect);
        foreach ($groups['playing'] as $group) {
            self::sendToClients($group['clients'], Common::returndata('timer', [
                'code' => 1,
                'msg' => '本局剩余时间',
                'msg' => self::timerMessage(),
                'info' => (int)$time
            ]));
        }

        foreach ($groups['waiting'] as $group) {
            self::sendToClients($group['clients'], Common::returndata('match_waiting', [
                'code' => 1,
                'msg' => '正在等待真人玩家',
                'info' => [
                    'mode' => Common::MODE_REAL,
                    'roomid' => $group['roomid'],
                    'online' => $group['online'],
                    'ready' => $group['ready'],
                    'min_players' => self::minRealPlayers()
                ]
            ]));
            self::carryWaitingGroupToNext($group);
        }

        self::sendRoundStartForGroups($groups['playing'], $expect, $time);
        self::sendBetReminderForGroups($groups['playing'], $expect, $time);
        self::sendDefaultBetForGroups($groups['playing'], $expect, $time);
        self::sendKillerAppearForGroups($groups['playing'], $expect, $time);
        self::sendRoundResultForGroups($groups['playing'], $expect, $time);

        switch ((int)$time) {
            case 55:
            case 52:
            case 50:
            case 47:
            case 43:
            case 36:
            case 33:
            case 29:
            case 25:
            case 22:
                self::robotMoveForGroups($groups['playing']);
                break;
        }
    }

    public static function startRound($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $uid = (int)$data['uid'];
        $roomid = (int)($data['roomid'] ?? 0);
        $mode = Common::getDataMode($data, $uid, $client_id);

        $roominfo = Common::activeRoom($roomid);
        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => '房间不存在',
                'info' => []
            ];
        }
        $roomid = (int)$roominfo->id;

        $userinfo = Common::getuserinfo($uid);
        if ((int)$userinfo['roomid'] !== $roomid) {
            if ((int)($userinfo['roomid'] ?? 0) <= 0) {
                Common::enterroom($client_id, $roomid, $userinfo, $mode);
                $userinfo['roomid'] = $roomid;
            } else {
            return [
                'code' => 1054,
                'msg' => '不在当前房间',
                'info' => [
                    'roomid' => $roomid,
                    'mode' => $mode
                ]
            ];
            }
        }

        if ((int)($userinfo['coin'] ?? 0) < 100) {
            return [
                'code' => 1056,
                'msg' => '积分不足',
                'info' => [
                    'default_bet' => 100,
                    'balance' => (int)($userinfo['coin'] ?? 0)
                ]
            ];
        }

        $time = self::roundTimeLeft();
        $currentExpect = Common::getnowexpect();
        $expect = $mode === Common::MODE_AI
            ? self::targetExpectForAiStart($time)
            : self::targetExpectForStart($time);
        self::setRoundReady($expect, $mode, $roomid, $uid);

        $status = self::modeStatusForExpect($roomid, $mode, $expect);
        $waitingNext = (string)$expect !== (string)$currentExpect;
        $status = self::appendActiveBetInfo($status, $expect, $roomid, $mode, $uid);

        return [
            'code' => 1,
            'msg' => $waitingNext ? '已准备下一局' : '本局已准备',
            'info' => array_merge($status, [
                'uid' => $uid,
                'expect' => $expect,
                'current_expect' => $currentExpect,
                'round_status' => $waitingNext ? 'waiting_next' : $status['status'],
                'wait_seconds' => $waitingNext ? $time : 0,
                'time_left' => $time,
                'default_bet' => 100,
                'ready' => true,
                'can_touzhu' => !$waitingNext && self::canOperate() && self::canPlayModeForExpect($roomid, $mode, $expect)
            ])
        ];
    }

    public static function pushRoundStartIfReady($res)
    {
        if (!is_array($res) || (int)($res['code'] ?? 0) !== 1) {
            return;
        }

        $info = $res['info'] ?? [];
        if (($info['round_status'] ?? '') !== 'playing') {
            return;
        }

        $expect = $info['expect'] ?? Common::getnowexpect();
        $mode = Common::normalizeMode($info['mode'] ?? Common::MODE_AI);
        $roomid = (int)($info['roomid'] ?? 0);
        if ($roomid <= 0) {
            return;
        }

        $ready = self::readyPlayersForGroup($expect, $roomid, $mode);
        self::sendToClients($ready['clients'], Common::returndata('game_start', [
            'code' => 1,
            'msg' => self::roundStartMessage(),
            'info' => [
                'expect' => $expect,
                'mode' => $mode,
                'roomid' => $roomid,
                'lock_time' => 15,
                'settle_time' => 4,
                'time_left' => (int)($info['time_left'] ?? self::roundTimeLeft())
            ]
        ]));
    }

    public static function syncRoundStateAfterEnter($client_id, $res)
    {
        if (!is_array($res) || (int)($res['code'] ?? 0) !== 1) {
            return;
        }

        $info = $res['info'] ?? [];
        $roomid = (int)($info['roomid'] ?? 0);
        $mode = Common::normalizeMode($info['mode'] ?? Common::MODE_AI);
        $expect = $info['expect'] ?? Common::getnowexpect();
        $time = self::roundTimeLeft();

        if ($roomid <= 0 || ($info['round_status'] ?? '') !== 'playing') {
            return;
        }

        Gateway::sendToClient($client_id, Common::returndata('timer', [
            'code' => 1,
            'msg' => self::timerMessage(),
            'info' => (int)$time
        ]));
        Gateway::sendToClient($client_id, Common::returndata('updatesmallcoin', [
            'code' => 1,
            'msg' => self::smallRoomPointsMessage(),
            'info' => Common::getroom_coin_list($roomid, $expect, $mode)
        ]));

        if ((int)$time > 15) {
            self::sendRoundEventToClients([$client_id], $expect, $mode, $roomid, 'start', Common::returndata('game_start', [
                'code' => 1,
                'msg' => self::roundStartMessage(),
                'info' => [
                    'expect' => $expect,
                    'mode' => $mode,
                    'roomid' => $roomid,
                    'lock_time' => 15,
                    'settle_time' => 4,
                    'time_left' => (int)$time
                ]
            ]));
        }
    }

    public static function syncClientAfterBet($client_id, $data, $res = null)
    {
        if (!is_array($data) || !is_array($res) || (int)($res['code'] ?? 0) !== 1) {
            return;
        }

        $uid = (int)($data['uid'] ?? 0);
        if ($uid <= 0) {
            return;
        }

        Gateway::sendToClient($client_id, Common::returndata('returngetbalance', User::getbalance($client_id, $data)));

        $roomid = (int)($data['roomid'] ?? 0);
        if ($roomid <= 0) {
            return;
        }

        $mode = Common::getDataMode($data, $uid, $client_id);
        $info = is_array($res) ? ($res['info'] ?? []) : [];
        $expect = $info['expect'] ?? self::activeExpectForUser($uid, $roomid, $mode);

        Gateway::sendToClient($client_id, Common::returndata('updatesmallcoin', [
            'code' => 1,
            'msg' => self::smallRoomPointsMessage(),
            'info' => Common::getroom_coin_list($roomid, $expect, $mode)
        ]));
    }

    public static function changesmallroom($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $mode = Common::getDataMode($data, $data['uid'], $client_id);
        $roomid = (int)($data['roomid'] ?? 0);
        $roominfo = Common::activeRoom($roomid);
        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => '房间不存在',
                'info' => []
            ];
        }
        $roomid = (int)$roominfo->id;
        $tosmallroomid = (int)($data['tosmallroomid'] ?? ($data['smallroomid'] ?? 0));
        $expect = self::activeExpectForUser($data['uid'], $roomid, $mode);
        $expect = self::ensureAiRoundReadyForAction($client_id, $data['uid'], $roomid, $mode, $expect);
        if ((string)$expect !== (string)Common::getnowexpect()) {
            return [
                'code' => 1072,
                'msg' => '本局正在等待开始',
                'info' => self::roundStatusInfo($roomid, $mode, $expect, $data['uid'])
            ];
        }

        if (!self::isRoundReady($expect, $mode, $roomid, $data['uid'])) {
            return [
                'code' => 1072,
                'msg' => '本局还未开始',
                'info' => self::roundStatusInfo($roomid, $mode, $expect, $data['uid'])
            ];
        }

        if (!self::canPlayModeForExpect($roomid, $mode, $expect)) {
            return [
                'code' => 1071,
                'msg' => '正在等待真人玩家',
                'info' => self::modeStatusForExpect($roomid, $mode, $expect)
            ];
        }

        if (!self::canOperate()) {
            return [
                'code' => 1059,
                'msg' => '房间已锁定',
                'info' => []
            ];
        }

        if ($tosmallroomid < 1 || $tosmallroomid > 8) {
            return [
                'code' => 1061,
                'msg' => '房间不存在',
                'info' => []
            ];
        }

        $lockKey = 'killer_bet_lock_' . $expect . '_' . $mode . '_' . $roomid . '_' . $data['uid'];
        $lockToken = Common::acquireLock($lockKey, 5);
        if (!$lockToken) {
            return [
                'code' => 1064,
                'msg' => '请求处理中，请稍候',
                'info' => []
            ];
        }

        try {
            $query = Db::table('wa_touzhu')->where([
                'expect' => $expect,
                'uid' => $data['uid'],
                'roomid' => $roomid,
                'ifyouxiao' => 1,
                'status' => 0
            ]);
            $query = Common::applyModeWhere($query, $mode);
            $next = $query->orderByDesc('id')->first();

            if (!$next) {
                Common::upposition($data['uid'], $tosmallroomid);
                self::broadcastUserPosition($roomid, $mode, $data['uid'], $tosmallroomid);
                return [
                    'code' => 1,
                    'msg' => '位置已切换',
                    'info' => [
                        'smallroomid' => $tosmallroomid,
                        'coin' => 0,
                        'has_bet' => false,
                        'mode' => $mode
                    ]
                ];
            }

            Db::table('wa_touzhu')->where('id', $next->id)->update([
                'tzid' => $tosmallroomid,
                'tzname' => Common::smallroomname($tosmallroomid),
                'addtime' => date('Y/m/d H:i:s', time())
            ]);
        } finally {
            Common::releaseLock($lockKey, $lockToken);
        }

        Common::upposition($data['uid'], $tosmallroomid);
        self::broadcastRoomBetChange($roomid, $mode, $data['uid'], $tosmallroomid, $expect);

        return [
            'code' => 1,
            'msg' => '房间切换成功',
            'info' => [
                'smallroomid' => $tosmallroomid,
                'mode' => $mode
            ]
        ];
    }

    public static function enterroom($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $mode = Common::getDataMode($data, $data['uid'], $client_id);
        $roomid = (int)($data['roomid'] ?? 0);

        $roominfo = Common::activeRoom($roomid);
        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => '房间不存在',
                'info' => []
            ];
        }
        $roomid = (int)$roominfo->id;

        $userinfo = Common::getuserinfo($data['uid']);
        if ($userinfo['coin'] < $roominfo->minprice) {
            return [
                'code' => 1052,
                'msg' => '积分低于房间要求',
                'info' => [
                    'minprice' => (int)$roominfo->minprice
                ]
            ];
        }

        $nums = $mode === Common::MODE_REAL ? self::onlinePlayerCount($roomid, $mode) : Common::getroom_nums($roomid, $mode);
        if ($mode === Common::MODE_REAL && $nums >= $roominfo->maxuser) {
            return [
                'code' => 1053,
                'msg' => '房间已满',
                'info' => []
            ];
        }

        Common::enterroom($client_id, $roomid, $userinfo, $mode);

        $group = Common::roomGroup($roomid, $mode);
        $online = self::onlinePlayerCount($roomid, $mode);
        $sessions = Gateway::getClientSessionsByGroup($group);
        $new = [];
        $seenUids = [];

        foreach ($sessions as $k => $v) {
            $uid = Gateway::getUidByClientId($k);
            if (!$uid) {
                continue;
            }
            if ($mode === Common::MODE_REAL && isset($seenUids[(string)$uid])) {
                continue;
            }
            $seenUids[(string)$uid] = true;
            $v['clientid'] = $k;
            $v['uid'] = $uid;
            $v['userinfo'] = Common::getuserinfo($uid);
            $v['position'] = Common::getposition($uid);
            $v['mode'] = $mode;
            $new[] = $v;
        }

        $robots = Common::joinrobots($roomid, $mode);
        $onlinelist = array_merge($new, $robots);

        $expect = Common::getnowexpect();
        $time = self::roundTimeLeft();
        $readyExpect = $mode === Common::MODE_AI ? self::targetExpectForAiStart($time) : $expect;
        if ($mode === Common::MODE_AI && !self::isRoundReady($readyExpect, $mode, $roomid, $data['uid'])) {
            self::setRoundReady($readyExpect, $mode, $roomid, $data['uid']);
        }
        self::trackActiveClient($client_id, $data['uid'], $roomid, $mode, $readyExpect);

        $killerto = Redis::get('killer_' . $expect);
        $ready = self::isRoundReady($expect, $mode, $roomid, $data['uid']);
        $modeStatus = self::modeStatusForExpect($roomid, $mode, $expect);

        $info = [
            'onlinelist' => $onlinelist,
            'onlinenum' => $online,
            'robotnum' => count($robots),
            'roomid' => $roomid,
            'mode' => $mode,
            'match_status' => $ready ? $modeStatus['status'] : 'idle',
            'round_status' => $ready ? $modeStatus['status'] : 'idle',
            'ready' => $ready,
            'expect' => $expect,
            'round_expect' => $expect,
            'ready_expect' => $readyExpect,
            'time_left' => $time,
            'default_bet' => 100,
            'min_real_players' => self::minRealPlayers(),
            'smallrooms' => Common::getroom_coin_list($roomid, $expect, $mode),
            'selfuserinfo' => $userinfo,
            'killerto' => $killerto ?: '',
            'lock_time' => 15,
            'can_touzhu' => $ready && self::canOperate() && self::canPlayModeForExpect($roomid, $mode, $expect)
        ];
        $info = self::appendActiveBetInfo($info, $expect, $roomid, $mode, $data['uid']);

        Gateway::sendToGroup($group, Common::returndata('user_enter_room', [
            'code' => 1,
            'msg' => '玩家已进入房间',
            'info' => [
                'userinfo' => $userinfo,
                'mode' => $mode
            ]
        ]));

        return [
            'code' => 1,
            'msg' => '进入成功',
            'info' => $info
        ];
    }

    public static function leaveroom($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $roomid = (int)($data['roomid'] ?? 0);
        $mode = Common::getDataMode($data, $data['uid'], $client_id);
        $roominfo = Common::activeRoom($roomid);

        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => '房间不存在',
                'info' => []
            ];
        }
        $roomid = (int)$roominfo->id;

        $userinfo = Common::getuserinfo($data['uid']);
        Common::leaveroom($client_id, $roomid, $userinfo, $mode);
        self::clearActiveClient($client_id);
        self::clearUserRoundReady($roomid, $mode, $data['uid']);

        return [
            'code' => 1,
            'msg' => '离开成功',
            'info' => [
                'uid' => $data['uid'],
                'mode' => $mode
            ]
        ];
    }

    public static function onCloseleaveroom($client_id, $uid)
    {
        $user = Db::table('wa_users')->where('id', $uid)->first();
        if (!$user || !$user->roomid) {
            self::clearActiveClient($client_id);
            return [
                'code' => 1,
                'msg' => '连接已关闭',
                'info' => [
                    'uid' => $uid
                ]
            ];
        }

        $mode = Common::getUserRoomMode($uid);
        return self::leaveroom($client_id, [
            'uid' => $uid,
            'roomid' => $user->roomid,
            'token' => $user->token,
            'mode' => $mode
        ]);
    }

    public static function touzhu($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $roomid = (int)($data['roomid'] ?? 0);
        $smallroomid = (int)($data['smallroomid'] ?? ($data['tosmallroomid'] ?? ($data['tzid'] ?? 0)));
        $coin = (int)$data['coin'];
        $rawCoin = (int)($data['raw_coin'] ?? $coin);
        $mode = Common::getDataMode($data, $data['uid'], $client_id);

        if ($smallroomid < 1 || $smallroomid > 8) {
            return [
                'code' => 1061,
                'msg' => '房间不存在',
                'info' => []
            ];
        }

        if ($coin <= 0) {
            return [
                'code' => 1055,
                'msg' => '下注积分必须大于 0',
                'info' => []
            ];
        }

        $roominfo = Common::activeRoom($roomid);
        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => '房间不存在',
                'info' => []
            ];
        }
        $roomid = (int)$roominfo->id;

        $userinfo = Common::getuserinfo($data['uid']);
        if ((int)$userinfo['roomid'] !== $roomid) {
            return [
                'code' => 1054,
                'msg' => '不在当前房间',
                'info' => []
            ];
        }

        $expect = self::activeExpectForUser($data['uid'], $roomid, $mode);
        $expect = self::ensureAiRoundReadyForAction($client_id, $data['uid'], $roomid, $mode, $expect);
        if ((string)$expect !== (string)Common::getnowexpect()) {
            return [
                'code' => 1072,
                'msg' => '本局正在等待开始',
                'info' => self::roundStatusInfo($roomid, $mode, $expect, $data['uid'])
            ];
        }
        if (!self::isRoundReady($expect, $mode, $roomid, $data['uid'])) {
            return [
                'code' => 1072,
                'msg' => '本局还未开始',
                'info' => self::roundStatusInfo($roomid, $mode, $expect, $data['uid'])
            ];
        }

        $isRobotUser = (int)($userinfo['isrobot'] ?? 0) === 1;
        if (!$isRobotUser && !empty($data['legacy_bet_mapped']) && isset($data['raw_coin'])) {
            $coin = Common::normalizeBetAmount($rawCoin, false, true);
        } else {
            $coin = Common::normalizeBetAmount($coin, $isRobotUser);
        }

        if (!Common::isAllowedBetAmount($coin, $isRobotUser)) {
            return [
                'code' => 1057,
                'msg' => '下注积分无效',
                'info' => [
                    'raw_coin' => $rawCoin,
                    'coin' => $coin,
                    'allowed' => Common::allowedBetAmounts($isRobotUser)
                ]
            ];
        }

        if ($userinfo['coin'] < $coin) {
            return [
                'code' => 1056,
                'msg' => '积分不足',
                'info' => []
            ];
        }

        if (!self::canPlayModeForExpect($roomid, $mode, $expect)) {
            return [
                'code' => 1071,
                'msg' => '正在等待真人玩家',
                'info' => self::modeStatusForExpect($roomid, $mode, $expect)
            ];
        }

        if (!self::canOperate()) {
            return [
                'code' => 1059,
                'msg' => '房间已锁定',
                'info' => []
            ];
        }

        $lockKey = 'killer_bet_lock_' . $expect . '_' . $mode . '_' . $roomid . '_' . $data['uid'];
        $lockToken = Common::acquireLock($lockKey, 5);
        if (!$lockToken) {
            return [
                'code' => 1064,
                'msg' => '下注处理中，请稍候',
                'info' => []
            ];
        }

        try {
            $query = Db::table('wa_touzhu')->where([
                'expect' => $expect,
                'uid' => $data['uid'],
                'roomid' => $roomid,
                'ifyouxiao' => 1,
                'status' => 0
            ]);
            $query = Common::applyModeWhere($query, $mode);
            $exists = $query->orderByDesc('id')->first();

            if ($exists) {
                $sameRoom = (int)$exists->tzid === $smallroomid;
                $sameCoin = (int)$exists->coin === $coin;

                if (!$sameCoin) {
                    return [
                        'code' => 1065,
                        'msg' => '本局下注积分已锁定',
                        'info' => [
                            'id' => $exists->id,
                            'smallroomid' => (int)$exists->tzid,
                            'coin' => (int)$exists->coin,
                            'raw_coin' => $rawCoin,
                            'mode' => $mode,
                            'expect' => $expect,
                            'has_bet' => true,
                            'balance' => (int)($userinfo['coin'] ?? 0)
                        ]
                    ];
                }

                if (!$sameRoom) {
                    Db::table('wa_touzhu')->where('id', $exists->id)->update([
                        'tzid' => $smallroomid,
                        'tzname' => Common::smallroomname($smallroomid),
                        'addtime' => date('Y/m/d H:i:s', time())
                    ]);
                    Common::upposition($data['uid'], $smallroomid);
                    self::broadcastRoomBetChange($roomid, $mode, $data['uid'], $smallroomid, $expect);
                }

                return [
                    'code' => 1,
                    'msg' => $sameRoom ? '已下注' : '房间切换成功',
                    'info' => [
                        'id' => $exists->id,
                        'smallroomid' => $smallroomid,
                        'coin' => (int)$exists->coin,
                        'raw_coin' => $rawCoin,
                        'mode' => $mode,
                        'expect' => $expect,
                        'has_bet' => true,
                        'deducted' => false,
                        'balance' => (int)($userinfo['coin'] ?? 0)
                    ]
                ];
            }

            $touzhudata = Common::appendModeField([
                'uid' => $data['uid'],
                'expect' => $expect,
                'tzid' => $smallroomid,
                'tzname' => Common::smallroomname($smallroomid),
                'coin' => $coin,
                'addtime' => date('Y/m/d H:i:s', time()),
                'status' => 0,
                'roomid' => $roomid,
                'isrobot' => $userinfo['isrobot'],
                'ifyouxiao' => 1
            ], $mode);

            Db::beginTransaction();
            $in = Db::table('wa_touzhu')->insert($touzhudata);
            if (!$in) {
                Db::rollBack();
                return [
                    'code' => 1063,
                    'msg' => '下注失败',
                    'info' => []
                ];
            }

            if (!Common::updateusercoin($data['uid'], $coin, 0)) {
                Db::rollBack();
                return [
                    'code' => 1056,
                    'msg' => '积分不足',
                    'info' => []
                ];
            }

            Common::usercoin_record([
                'uid' => $data['uid'],
                'coin' => $coin,
                'type' => 0,
                'remark' => 'killer room ' . $roomid . ' bet ' . Common::smallroomname($smallroomid) . ' ' . $coin,
                'addtime' => date('Y/m/d H:i:s', time())
            ]);
            Db::commit();
        } catch (\Throwable $e) {
            try {
                Db::rollBack();
            } catch (\Throwable $rollbackError) {
            }

            $existingAfterRollback = self::findActiveBet($expect, $data['uid'], $roomid, $mode);
            if ($existingAfterRollback) {
                return [
                    'code' => 1,
                    'msg' => '已下注',
                    'info' => [
                        'id' => $existingAfterRollback->id,
                        'smallroomid' => (int)$existingAfterRollback->tzid,
                        'coin' => (int)$existingAfterRollback->coin,
                        'raw_coin' => $rawCoin,
                        'mode' => $mode,
                        'expect' => $expect,
                        'has_bet' => true,
                        'deducted' => false,
                        'balance' => (int)($userinfo['coin'] ?? 0)
                    ]
                ];
            }

            return [
                'code' => 1063,
                'msg' => '下注失败',
                'info' => []
            ];
        } finally {
            Common::releaseLock($lockKey, $lockToken);
        }

        Common::upposition($data['uid'], $smallroomid);
        self::broadcastRoomBetChange($roomid, $mode, $data['uid'], $smallroomid, $expect);
        $latest = Common::getuserinfo($data['uid']);

        return [
            'code' => 1,
            'msg' => '下注成功',
            'info' => [
                'smallroomid' => $smallroomid,
                'coin' => $coin,
                'raw_coin' => $rawCoin,
                'mode' => $mode,
                'expect' => $expect,
                'has_bet' => true,
                'deducted' => true,
                'balance' => (int)($latest['coin'] ?? 0)
            ]
        ];
    }

    public static function getrecord($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $list = [];
        for ($i = 1; $i < 9; $i++) {
            $maxid = (int)Db::table('wa_killer_record')->max('id');
            $startid = max(0, $maxid - 100);
            $list[] = [
                'smallroomid' => $i,
                'smallroomname' => Common::smallroomname($i),
                'count' => Db::table('wa_killer_record')
                    ->where('samllroomid', $i)
                    ->where('id', '>', $startid)
                    ->count()
            ];
        }

        $killer = Db::table('wa_killer_record')->orderByDesc('id')->limit(10)->get();
        $myinfo = Common::getmytzinfo($data['uid']);

        return [
            'code' => 1,
            'msg' => '获取成功',
            'info' => [
                'list' => $list,
                'killer' => $killer,
                'myrecord' => $myinfo
            ]
        ];
    }

    protected static function canOperate()
    {
        $time = self::roundTimeLeft();
        return $time > 15;
    }

    protected static function roundTimeLeft()
    {
        return 60 - (int)date('s', time());
    }

    protected static function timerMessage()
    {
        return '本局剩余时间';
    }

    protected static function roundStartMessage()
    {
        return '游戏开始，请选择藏身房间';
    }

    protected static function killerLateMessage()
    {
        return '10秒后杀手出现';
    }

    protected static function killerAppearMessage()
    {
        return '杀手出现，房间锁门';
    }

    protected static function resultMessage()
    {
        return '本局结束，积分已结算';
    }

    protected static function smallRoomPointsMessage()
    {
        return '房间积分已更新';
    }

    protected static function balanceMessage()
    {
        return '获取成功';
    }

    protected static function targetExpectForStart($timeLeft)
    {
        return (int)$timeLeft >= 55 ? Common::getnowexpect() : self::expectAt(time() + 60);
    }

    protected static function targetExpectForAiStart($timeLeft)
    {
        return (int)$timeLeft > 15 ? Common::getnowexpect() : self::expectAt(time() + 60);
    }

    protected static function ensureAiRoundReadyForAction($client_id, $uid, $roomid, $mode, $expect)
    {
        $mode = Common::normalizeMode($mode);
        if ($mode !== Common::MODE_AI) {
            return $expect;
        }

        $time = self::roundTimeLeft();
        if ((int)$time <= 15) {
            return $expect;
        }

        $expect = Common::getnowexpect();
        if (!self::isRoundReady($expect, $mode, $roomid, $uid)) {
            self::setRoundReady($expect, $mode, $roomid, $uid);
        }

        self::trackActiveClient($client_id, $uid, $roomid, $mode, $expect);

        $robotSeedKey = 'killer_ai_robot_seed_' . $expect . '_' . (int)$roomid;
        if (Redis::setnx($robotSeedKey, 1)) {
            Redis::expire($robotSeedKey, 90);
            Common::robotmove($roomid, Common::MODE_AI, false);
        }

        Gateway::sendToClient($client_id, Common::returndata('timer', [
            'code' => 1,
            'msg' => self::timerMessage(),
            'info' => (int)$time
        ]));
        Gateway::sendToClient($client_id, Common::returndata('updatesmallcoin', [
            'code' => 1,
            'msg' => self::smallRoomPointsMessage(),
            'info' => Common::getroom_coin_list($roomid, $expect, $mode)
        ]));
        Gateway::sendToClient($client_id, Common::returndata('game_start', [
            'code' => 1,
            'msg' => self::roundStartMessage(),
            'info' => [
                'expect' => $expect,
                'mode' => $mode,
                'roomid' => (int)$roomid,
                'lock_time' => 15,
                'settle_time' => 4,
                'time_left' => (int)$time
            ]
        ]));

        return $expect;
    }

    protected static function activeExpectForUser($uid, $roomid, $mode)
    {
        $now = time();
        $candidates = [
            Common::getnowexpect(),
            self::expectAt($now + 60),
            self::expectAt($now - 60)
        ];

        foreach (array_unique($candidates) as $expect) {
            if (self::isRoundReady($expect, $mode, $roomid, $uid)) {
                return $expect;
            }
        }

        return Common::getnowexpect();
    }

    protected static function expectAt($timestamp)
    {
        $hour = (int)date('H', $timestamp);
        $min = (int)date('i', $timestamp);
        $index = $hour * 60 + $min;
        if ($index < 1000 && $index > 100) {
            $index = '0' . $index;
        }
        if ($index < 100) {
            $index = '00' . $index;
        }

        return date('Ymd', $timestamp) . $index;
    }

    protected static function minRealPlayers()
    {
        return 2;
    }

    protected static function canPlayMode($roomid, $mode)
    {
        return self::canPlayModeForExpect($roomid, $mode, Common::getnowexpect());
    }

    protected static function canPlayModeForExpect($roomid, $mode, $expect)
    {
        $mode = Common::normalizeMode($mode);
        $ready = self::readyPlayersForGroup($expect, $roomid, $mode);
        if ($mode === Common::MODE_REAL) {
            return count($ready['uids']) >= self::minRealPlayers();
        }

        return count($ready['uids']) > 0;
    }

    protected static function modeStatus($roomid, $mode)
    {
        return self::modeStatusForExpect($roomid, $mode, Common::getnowexpect());
    }

    protected static function modeStatusForExpect($roomid, $mode, $expect)
    {
        $mode = Common::normalizeMode($mode);
        $onlinePlayers = self::onlinePlayersForGroup($roomid, $mode);
        $online = count($onlinePlayers['uids']);
        $ready = self::readyPlayersForGroup($expect, $roomid, $mode);
        $readyCount = count($ready['uids']);
        $minPlayers = $mode === Common::MODE_REAL ? self::minRealPlayers() : 1;
        $status = $readyCount >= $minPlayers ? 'playing' : ($readyCount > 0 ? 'waiting' : 'idle');

        return [
            'mode' => $mode,
            'roomid' => (int)$roomid,
            'online' => $online,
            'ready' => $readyCount,
            'min_players' => $minPlayers,
            'status' => $status
        ];
    }

    protected static function activeRoundGroups($expect = null)
    {
        $expect = $expect ?: Common::getnowexpect();
        $result = [
            'playing' => [],
            'waiting' => []
        ];

        $rooms = Db::table('wa_rooms')->where('status', 1)->get()->toArray();
        $rooms = Common::object_array($rooms);

        foreach ($rooms as $room) {
            $roomid = (int)($room['id'] ?? 0);
            if ($roomid <= 0) {
                continue;
            }

            $aiGroup = Common::roomGroup($roomid, Common::MODE_AI);
            $aiOnlinePlayers = self::onlinePlayersForGroup($roomid, Common::MODE_AI);
            $aiOnline = count($aiOnlinePlayers['uids']);
            $aiReady = self::readyPlayersForGroup($expect, $roomid, Common::MODE_AI);
            $aiPlayers = $aiReady;
            if (count($aiPlayers['uids']) === 0 && $aiOnline > 0 && self::roundTimeLeft() > 15) {
                $aiPlayers = $aiOnlinePlayers;
                foreach ($aiPlayers['uids'] as $uid) {
                    self::setRoundReady($expect, Common::MODE_AI, $roomid, $uid);
                }
            }

            if (count($aiPlayers['uids']) > 0) {
                $result['playing'][] = [
                    'group' => $aiGroup,
                    'mode' => Common::MODE_AI,
                    'roomid' => $roomid,
                    'online' => $aiOnline,
                    'ready' => count($aiPlayers['uids']),
                    'clients' => $aiPlayers['clients'],
                    'uids' => $aiPlayers['uids'],
                    'uid_clients' => $aiPlayers['uid_clients']
                ];
            }

            $realGroup = Common::roomGroup($roomid, Common::MODE_REAL);
            $realOnlinePlayers = self::onlinePlayersForGroup($roomid, Common::MODE_REAL);
            $realOnline = count($realOnlinePlayers['uids']);
            $realReady = self::readyPlayersForGroup($expect, $roomid, Common::MODE_REAL);
            $realReadyCount = count($realReady['uids']);
            if ($realReadyCount >= self::minRealPlayers()) {
                $result['playing'][] = [
                    'group' => $realGroup,
                    'mode' => Common::MODE_REAL,
                    'roomid' => $roomid,
                    'online' => $realOnline,
                    'ready' => $realReadyCount,
                    'clients' => $realReady['clients'],
                    'uids' => $realReady['uids'],
                    'uid_clients' => $realReady['uid_clients']
                ];
            } elseif ($realReadyCount > 0) {
                $result['waiting'][] = [
                    'group' => $realGroup,
                    'mode' => Common::MODE_REAL,
                    'roomid' => $roomid,
                    'online' => $realOnline,
                    'ready' => $realReadyCount,
                    'clients' => $realReady['clients'],
                    'uids' => $realReady['uids'],
                    'uid_clients' => $realReady['uid_clients']
                ];
            }
        }

        return $result;
    }

    protected static function roundReadyKey($expect, $mode, $roomid, $uid)
    {
        return 'killer_round_ready_' . $expect . '_' . Common::normalizeMode($mode) . '_' . (int)$roomid . '_' . (int)$uid;
    }

    protected static function setRoundReady($expect, $mode, $roomid, $uid)
    {
        $key = self::roundReadyKey($expect, $mode, $roomid, $uid);
        Redis::set($key, json_encode([
            'expect' => (string)$expect,
            'mode' => Common::normalizeMode($mode),
            'roomid' => (int)$roomid,
            'uid' => (int)$uid,
            'ready_at' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        Redis::expire($key, 180);
    }

    protected static function isRoundReady($expect, $mode, $roomid, $uid)
    {
        return (bool)Redis::get(self::roundReadyKey($expect, $mode, $roomid, $uid));
    }

    protected static function clearRoundReady($expect, $mode, $roomid, $uid)
    {
        Redis::del(self::roundReadyKey($expect, $mode, $roomid, $uid));
    }

    protected static function clearUserRoundReady($roomid, $mode, $uid)
    {
        self::clearRoundReady(self::expectAt(time() - 60), $mode, $roomid, $uid);
        self::clearRoundReady(Common::getnowexpect(), $mode, $roomid, $uid);
        self::clearRoundReady(self::expectAt(time() + 60), $mode, $roomid, $uid);
    }

    protected static function activeClientKey($clientId)
    {
        return 'killer_active_client_' . $clientId;
    }

    protected static function activeRoomKeyPrefix($roomid, $mode)
    {
        return 'killer_room_active_' . Common::normalizeMode($mode) . '_' . (int)$roomid . '_';
    }

    protected static function activeRoomKey($roomid, $mode, $clientId)
    {
        return self::activeRoomKeyPrefix($roomid, $mode) . $clientId;
    }

    protected static function trackActiveClient($clientId, $uid, $roomid, $mode, $expect = null)
    {
        $clientId = (string)$clientId;
        $uid = (int)$uid;
        $roomid = (int)$roomid;
        $mode = Common::normalizeMode($mode);
        if ($clientId === '' || $uid <= 0 || $roomid <= 0) {
            return;
        }

        self::clearActiveClient($clientId);
        $payload = json_encode([
            'client_id' => $clientId,
            'uid' => $uid,
            'roomid' => $roomid,
            'mode' => $mode,
            'expect' => $expect ? (string)$expect : '',
            'active_at' => time()
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        Redis::set(self::activeClientKey($clientId), $payload);
        Redis::expire(self::activeClientKey($clientId), 180);
        Redis::set(self::activeRoomKey($roomid, $mode, $clientId), $payload);
        Redis::expire(self::activeRoomKey($roomid, $mode, $clientId), 180);
        Redis::set('binduid_' . $clientId, $uid);
    }

    protected static function clearActiveClient($clientId)
    {
        $clientId = (string)$clientId;
        if ($clientId === '') {
            return;
        }

        $raw = Redis::get(self::activeClientKey($clientId));
        if ($raw) {
            $info = json_decode((string)$raw, true);
            if (is_array($info) && !empty($info['roomid'])) {
                Redis::del(self::activeRoomKey($info['roomid'], $info['mode'] ?? Common::MODE_AI, $clientId));
            }
        }

        Redis::del(self::activeClientKey($clientId));
    }

    protected static function activeClientsForRoom($roomid, $mode, $expect = null, $onlyReady = false)
    {
        $mode = Common::normalizeMode($mode);
        $prefix = self::activeRoomKeyPrefix($roomid, $mode);
        $keys = Redis::keys($prefix . '*') ?: [];
        $clients = [];
        $uids = [];
        $uidClients = [];

        foreach ($keys as $key) {
            $key = (string)$key;
            $raw = Redis::get($key);
            if (!$raw) {
                Redis::del($key);
                continue;
            }

            $info = json_decode((string)$raw, true);
            $clientId = is_array($info) && !empty($info['client_id'])
                ? (string)$info['client_id']
                : substr($key, strlen($prefix));
            $uid = is_array($info) && !empty($info['uid'])
                ? (int)$info['uid']
                : (int)Redis::get('binduid_' . $clientId);

            if ($clientId === '' || $uid <= 0) {
                Redis::del($key);
                continue;
            }

            if ($onlyReady && $expect && !self::isRoundReady($expect, $mode, $roomid, $uid)) {
                continue;
            }

            $userinfo = Common::getuserinfo($uid);
            if ((int)($userinfo['isrobot'] ?? 0) === 1) {
                continue;
            }

            Redis::expire($key, 180);
            Redis::expire(self::activeClientKey($clientId), 180);
            $uidKey = (string)$uid;
            $clients[$clientId] = $clientId;
            $uids[$uidKey] = $uid;
            if (!isset($uidClients[$uidKey])) {
                $uidClients[$uidKey] = [];
            }
            $uidClients[$uidKey][] = $clientId;
        }

        return [
            'clients' => array_values($clients),
            'uids' => array_values($uids),
            'uid_clients' => $uidClients
        ];
    }

    protected static function readyPlayersForGroup($expect, $roomid, $mode)
    {
        $mode = Common::normalizeMode($mode);
        $active = self::activeClientsForRoom($roomid, $mode, $expect, true);
        if (!empty($active['clients'])) {
            return $active;
        }

        $sessions = Gateway::getClientSessionsByGroup(Common::roomGroup($roomid, $mode));
        $clients = [];
        $uids = [];
        $uidClients = [];

        foreach ($sessions as $clientId => $session) {
            $uid = Gateway::getUidByClientId($clientId);
            if (!$uid) {
                $uid = Redis::get('binduid_' . $clientId);
            }
            if (!$uid || !self::isRoundReady($expect, $mode, $roomid, $uid)) {
                continue;
            }

            $userinfo = Common::getuserinfo($uid);
            if ((int)($userinfo['isrobot'] ?? 0) === 1) {
                continue;
            }

            $uidKey = (string)$uid;
            $clients[] = $clientId;
            $uids[$uidKey] = (int)$uid;
            if (!isset($uidClients[$uidKey])) {
                $uidClients[$uidKey] = [];
            }
            $uidClients[$uidKey][] = $clientId;
        }

        return [
            'clients' => array_values(array_unique($clients)),
            'uids' => array_values($uids),
            'uid_clients' => $uidClients
        ];
    }

    protected static function onlinePlayersForGroup($roomid, $mode)
    {
        $mode = Common::normalizeMode($mode);
        $active = self::activeClientsForRoom($roomid, $mode);
        if (!empty($active['clients'])) {
            return $active;
        }

        $sessions = Gateway::getClientSessionsByGroup(Common::roomGroup($roomid, $mode));
        $clients = [];
        $uids = [];
        $uidClients = [];

        foreach ($sessions as $clientId => $session) {
            $uid = Gateway::getUidByClientId($clientId);
            if (!$uid) {
                $uid = Redis::get('binduid_' . $clientId);
            }
            if (!$uid) {
                continue;
            }

            $userinfo = Common::getuserinfo($uid);
            if ((int)($userinfo['isrobot'] ?? 0) === 1) {
                continue;
            }

            $uidKey = (string)$uid;
            $clients[] = $clientId;
            $uids[$uidKey] = (int)$uid;
            if (!isset($uidClients[$uidKey])) {
                $uidClients[$uidKey] = [];
            }
            $uidClients[$uidKey][] = $clientId;
        }

        return [
            'clients' => array_values(array_unique($clients)),
            'uids' => array_values($uids),
            'uid_clients' => $uidClients
        ];
    }

    protected static function roundStatusInfo($roomid, $mode, $expect, $uid)
    {
        $status = self::modeStatusForExpect($roomid, $mode, $expect);
        $status['uid'] = (int)$uid;
        $status['expect'] = $expect;
        $status['round_status'] = self::isRoundReady($expect, $mode, $roomid, $uid) ? $status['status'] : 'idle';
        $status['default_bet'] = 100;
        $status['can_touzhu'] = self::isRoundReady($expect, $mode, $roomid, $uid)
            && self::canOperate()
            && self::canPlayModeForExpect($roomid, $mode, $expect);
        return self::appendActiveBetInfo($status, $expect, $roomid, $mode, $uid);
    }

    protected static function appendActiveBetInfo($status, $expect, $roomid, $mode, $uid)
    {
        $activeBet = self::findActiveBet($expect, $uid, $roomid, $mode);
        if ($activeBet) {
            $status['has_bet'] = true;
            $status['bet_id'] = (int)$activeBet->id;
            $status['smallroomid'] = (int)$activeBet->tzid;
            $status['coin'] = (int)$activeBet->coin;
            return $status;
        }

        $status['has_bet'] = false;
        $status['smallroomid'] = 0;
        $status['coin'] = 0;
        return $status;
    }

    protected static function sendToClients($clients, $payload)
    {
        foreach (array_unique($clients ?: []) as $clientId) {
            Gateway::sendToClient($clientId, $payload);
        }
    }

    protected static function syncBalancesForGroup($group)
    {
        foreach (($group['uid_clients'] ?? []) as $uid => $clientIds) {
            $userinfo = Common::getuserinfo($uid);
            self::sendToClients($clientIds, Common::returndata('returngetbalance', [
                'code' => 1,
                'msg' => self::balanceMessage(),
                'info' => (int)($userinfo['coin'] ?? 0)
            ]));
        }
    }

    protected static function markRoundEvent($expect, $mode, $roomid, $event, $clientId = null)
    {
        $key = 'killer_round_event_' . $expect . '_' . Common::normalizeMode($mode) . '_' . (int)$roomid . '_' . $event;
        if ($clientId !== null && $clientId !== '') {
            $key .= '_' . md5((string)$clientId);
        }
        if (!Redis::setnx($key, 1)) {
            return false;
        }
        Redis::expire($key, 180);
        return true;
    }

    protected static function sendRoundEventToClients($clients, $expect, $mode, $roomid, $event, $payload)
    {
        $sent = 0;
        foreach (array_unique($clients ?: []) as $clientId) {
            if (!self::markRoundEvent($expect, $mode, $roomid, $event, $clientId)) {
                continue;
            }
            Gateway::sendToClient($clientId, $payload);
            $sent++;
        }

        return $sent;
    }

    protected static function sendRoundStartForGroups($groups, $expect, $time)
    {
        if ((int)$time <= 15) {
            return;
        }

        foreach ($groups as $group) {
            if (empty($group['clients'])) {
                continue;
            }

            self::sendRoundEventToClients($group['clients'], $expect, $group['mode'], $group['roomid'], 'start', Common::returndata('game_start', [
                'code' => 1,
                'msg' => self::roundStartMessage(),
                'info' => [
                    'expect' => $expect,
                    'mode' => $group['mode'],
                    'roomid' => $group['roomid'],
                    'lock_time' => 15,
                    'settle_time' => 4,
                    'time_left' => (int)$time
                ]
            ]));
        }
    }

    protected static function sendBetReminderForGroups($groups, $expect, $time)
    {
        if ((int)$time > 25 || (int)$time <= 15) {
            return;
        }

        self::robotMoveForGroups($groups);
        foreach ($groups as $group) {
            if (empty($group['clients'])) {
                continue;
            }

            $reminder = [
                'code' => 1,
                'msg' => self::killerLateMessage(),
                'info' => [
                    'expect' => $expect,
                    'mode' => $group['mode'],
                    'roomid' => $group['roomid'],
                    'default_bet' => 100,
                    'default_room' => 'random',
                    'time_left' => (int)$time
                ]
            ];
            self::sendRoundEventToClients($group['clients'], $expect, $group['mode'], $group['roomid'], 'game_killer_10', Common::returndata('game_killer_10', $reminder));
            self::sendRoundEventToClients($group['clients'], $expect, $group['mode'], $group['roomid'], 'bet_reminder', Common::returndata('bet_reminder', [
                'code' => 1,
                'msg' => '请在杀手出现前下注',
                'info' => $reminder['info']
            ]));
        }
    }

    protected static function sendDefaultBetForGroups($groups, $expect, $time)
    {
        if ((int)$time > 18 || (int)$time <= 15) {
            return;
        }

        foreach ($groups as $group) {
            if (empty($group['clients'])) {
                continue;
            }

            self::ensureDefaultBetsForGroup($group, $expect);
        }
    }

    protected static function sendKillerAppearForGroups($groups, $expect, $time)
    {
        if ((int)$time > 15 || (int)$time <= 4) {
            return;
        }

        $room = null;
        foreach ($groups as $group) {
            if (empty($group['clients'])) {
                continue;
            }

            self::ensureDefaultBetsForGroup($group, $expect);
            if ($room === null) {
                $room = Common::killer(false);
            }

            self::sendRoundEventToClients($group['clients'], $expect, $group['mode'], $group['roomid'], 'killerappear', Common::returndata('killerappear', [
                'code' => 1,
                'msg' => self::killerAppearMessage(),
                'info' => [
                    'expect' => $expect,
                    'id' => $room['killer_to_smallroomid'],
                    'mode' => $group['mode'],
                    'roomid' => $group['roomid'],
                    'time_left' => (int)$time
                ]
            ]));
        }
    }

    protected static function sendRoundResultForGroups($groups, $expect, $time)
    {
        if ((int)$time > 4) {
            return;
        }

        $room = null;
        foreach ($groups as $group) {
            if (empty($group['clients']) || !self::markRoundEvent($expect, $group['mode'], $group['roomid'], 'result')) {
                continue;
            }

            self::ensureDefaultBetsForGroup($group, $expect);
            if ($room === null) {
                $room = Common::killer(true);
            }
            $info = self::resultForGroup($room, $group['mode'], $group['roomid']);
            $info['expect'] = $expect;
            $info['round_status'] = 'finished';
            $sentClients = [];
            foreach (($group['uid_clients'] ?? []) as $uid => $clientIds) {
                $clientInfo = $info;
                $clientInfo['self_uid'] = (int)$uid;
                $clientInfo['self_settlement'] = self::settlementForUid($info['settlement'] ?? [], $uid);
                $clientInfo['self_has_bet'] = $clientInfo['self_settlement'] !== null;
                self::sendToClients($clientIds, Common::returndata('result', [
                    'code' => 1,
                    'msg' => self::resultMessage(),
                    'info' => $clientInfo
                ]));
                $sentClients = array_merge($sentClients, $clientIds ?: []);
            }

            $unmatchedClients = array_values(array_diff($group['clients'], array_unique($sentClients)));
            if ($unmatchedClients) {
                $info['self_settlement'] = null;
                $info['self_has_bet'] = false;
                self::sendToClients($unmatchedClients, Common::returndata('result', [
                    'code' => 1,
                    'msg' => self::resultMessage(),
                    'info' => $info
                ]));
            }
            self::syncBalancesForGroup($group);
            self::finishRoundForGroup($group, $expect);
        }
    }

    protected static function robotMoveForGroups($groups)
    {
        foreach ($groups as $group) {
            if (($group['mode'] ?? '') !== Common::MODE_AI || empty($group['clients'])) {
                continue;
            }
            $moved = Common::robotmove((int)$group['roomid'], Common::MODE_AI, false);
            foreach ($moved as $move) {
                self::sendToClients($group['clients'], Common::returndata('usertouzhu', [
                    'code' => 1,
                    'msg' => '机器人位置已更新',
                    'info' => [
                        'uid' => $move['uid'] ?? '',
                        'smallroomid' => $move['smallroomid'] ?? 0,
                        'mode' => Common::MODE_AI
                    ]
                ]));
            }
            if ($moved) {
                self::sendToClients($group['clients'], Common::returndata('updatesmallcoin', [
                    'code' => 1,
                    'msg' => self::smallRoomPointsMessage(),
                    'info' => Common::getroom_coin_list((int)$group['roomid'], Common::getnowexpect(), Common::MODE_AI)
                ]));
            }
        }
    }

    protected static function ensureDefaultBetsForGroup($group, $expect)
    {
        $online = self::onlinePlayersForGroup($group['roomid'] ?? 0, $group['mode'] ?? Common::MODE_AI);
        $uids = [];
        $uidClients = $group['uid_clients'] ?? [];

        foreach (($group['uids'] ?? []) as $uid) {
            $uid = (int)$uid;
            if ($uid > 0) {
                $uids[(string)$uid] = $uid;
            }
        }

        foreach (($online['uids'] ?? []) as $uid) {
            $uid = (int)$uid;
            if ($uid > 0) {
                $uids[(string)$uid] = $uid;
            }
        }

        foreach (($online['uid_clients'] ?? []) as $uid => $clientIds) {
            $uidKey = (string)$uid;
            if (!isset($uidClients[$uidKey])) {
                $uidClients[$uidKey] = [];
            }
            $uidClients[$uidKey] = array_values(array_unique(array_merge($uidClients[$uidKey], $clientIds ?: [])));
        }

        foreach ($uids as $uid) {
            $uidKey = (string)$uid;
            if (self::findActiveBet($expect, $uid, $group['roomid'], $group['mode'])) {
                continue;
            }

            self::placeDefaultBet(
                (int)$uid,
                (int)$group['roomid'],
                $group['mode'],
                $expect,
                $uidClients[$uidKey] ?? []
            );
        }
    }

    protected static function placeDefaultBet($uid, $roomid, $mode, $expect, $clientIds = [])
    {
        $coin = 100;
        $mode = Common::normalizeMode($mode);
        $lockKey = 'killer_bet_lock_' . $expect . '_' . $mode . '_' . $roomid . '_' . $uid;
        $lockToken = Common::acquireLock($lockKey, 5);
        if (!$lockToken) {
            return false;
        }

        try {
            $existing = self::findActiveBet($expect, $uid, $roomid, $mode);
            if ($existing) {
                return true;
            }

            $userinfo = Common::getuserinfo($uid);
            if ((int)($userinfo['coin'] ?? 0) < $coin) {
                self::clearRoundReady($expect, $mode, $roomid, $uid);
                self::sendToClients($clientIds, Common::returndata('default_touzhu_failed', [
                    'code' => 1056,
                    'msg' => '积分不足',
                    'info' => [
                        'expect' => $expect,
                        'roomid' => $roomid,
                        'mode' => $mode,
                        'coin' => $coin,
                        'balance' => (int)($userinfo['coin'] ?? 0)
                    ]
                ]));
                return false;
            }

            $smallroomid = rand(1, 8);
            $touzhudata = Common::appendModeField([
                'uid' => $uid,
                'expect' => $expect,
                'tzid' => $smallroomid,
                'tzname' => Common::smallroomname($smallroomid),
                'coin' => $coin,
                'addtime' => date('Y/m/d H:i:s', time()),
                'status' => 0,
                'roomid' => $roomid,
                'isrobot' => $userinfo['isrobot'] ?? 0,
                'ifyouxiao' => 1
            ], $mode);

            Db::beginTransaction();
            $inserted = Db::table('wa_touzhu')->insert($touzhudata);
            if (!$inserted) {
                Db::rollBack();
                return false;
            }

            if (!Common::updateusercoin($uid, $coin, 0)) {
                Db::rollBack();
                self::sendToClients($clientIds, Common::returndata('default_touzhu_failed', [
                    'code' => 1056,
                    'msg' => '积分不足',
                    'info' => [
                        'expect' => $expect,
                        'roomid' => $roomid,
                        'mode' => $mode,
                        'coin' => $coin,
                        'balance' => (int)($userinfo['coin'] ?? 0)
                    ]
                ]));
                return false;
            }

            Common::usercoin_record([
                'uid' => $uid,
                'coin' => $coin,
                'type' => 0,
                'remark' => 'killer room ' . $roomid . ' default bet ' . Common::smallroomname($smallroomid) . ' ' . $coin,
                'addtime' => date('Y/m/d H:i:s', time())
            ]);
            Db::commit();
        } catch (\Throwable $e) {
            try {
                Db::rollBack();
            } catch (\Throwable $rollbackError) {
            }

            if (self::findActiveBet($expect, $uid, $roomid, $mode)) {
                return true;
            }
            return false;
        } finally {
            Common::releaseLock($lockKey, $lockToken);
        }

        Common::upposition($uid, $smallroomid);
        self::broadcastRoomBetChange($roomid, $mode, $uid, $smallroomid, $expect);
        $latest = Common::getuserinfo($uid);
        self::sendToClients($clientIds, Common::returndata('returngetbalance', [
            'code' => 1,
            'msg' => self::balanceMessage(),
            'info' => (int)($latest['coin'] ?? 0)
        ]));
        self::sendToClients($clientIds, Common::returndata('default_touzhu', [
            'code' => 1,
            'msg' => '已默认下注',
            'info' => [
                'expect' => $expect,
                'roomid' => $roomid,
                'smallroomid' => $smallroomid,
                'coin' => $coin,
                'mode' => $mode,
                'balance' => (int)($latest['coin'] ?? 0),
                'default_bet' => true
            ]
        ]));

        return true;
    }

    protected static function finishRoundForGroup($group, $expect)
    {
        foreach (($group['uids'] ?? []) as $uid) {
            self::clearRoundReady($expect, $group['mode'], $group['roomid'], $uid);
        }
    }

    protected static function carryWaitingGroupToNext($group)
    {
        if (($group['mode'] ?? '') !== Common::MODE_REAL) {
            return;
        }

        $nextExpect = self::expectAt(time() + 60);
        foreach (($group['uids'] ?? []) as $uid) {
            self::setRoundReady($nextExpect, $group['mode'], $group['roomid'], $uid);
        }
    }

    protected static function onlinePlayerCount($roomid, $mode)
    {
        $mode = Common::normalizeMode($mode);
        if ($mode === Common::MODE_REAL) {
            return self::realPlayerCount($roomid);
        }

        return Gateway::getClientCountByGroup(Common::roomGroup($roomid, $mode));
    }

    protected static function realPlayerCount($roomid)
    {
        $sessions = Gateway::getClientSessionsByGroup(Common::roomGroup($roomid, Common::MODE_REAL));
        $uids = [];

        foreach ($sessions as $clientId => $session) {
            $uid = Gateway::getUidByClientId($clientId);
            if (!$uid) {
                continue;
            }

            $userinfo = Common::getuserinfo($uid);
            if ((int)($userinfo['isrobot'] ?? 0) === 1) {
                continue;
            }

            $uids[(string)$uid] = true;
        }

        return count($uids);
    }

    protected static function resultForGroup($room, $mode, $roomid)
    {
        $mode = Common::normalizeMode($mode);
        $filtered = $room;
        $settlement = $room['settlement'] ?? [];
        $groups = $settlement['groups'] ?? [];
        $matched = null;

        foreach ($groups as $group) {
            if (($group['mode'] ?? '') === $mode && (int)($group['roomid'] ?? 0) === (int)$roomid) {
                $matched = $group;
                break;
            }
        }

        if ($matched) {
            $settlement['groups'] = [$matched];
            $settlement['winners'] = $matched['winners'] ?? [];
            $settlement['losers'] = $matched['losers'] ?? [];
            $settlement['winner_count'] = $matched['winner_count'] ?? 0;
            $settlement['loser_count'] = $matched['loser_count'] ?? 0;
            $settlement['reward_total'] = $matched['reward_total'] ?? 0;
            $settlement['real_lost_pool'] = $matched['real_lost_pool'] ?? 0;
            $settlement['killed_room_pool'] = $matched['killed_room_pool'] ?? 0;
            $settlement['survivor_count'] = $matched['survivor_count'] ?? 0;
            $settlement['survivor_coin_total'] = $matched['survivor_coin_total'] ?? 0;
            $settlement['real_winner_coin_total'] = $matched['real_winner_coin_total'] ?? 0;
            $settlement['distributed_bonus_total'] = $matched['distributed_bonus_total'] ?? 0;
            $settlement['winner_share'] = $matched['winner_share'] ?? 0;
        } else {
            $settlement['groups'] = [];
            $settlement['winners'] = [];
            $settlement['losers'] = [];
            $settlement['winner_count'] = 0;
            $settlement['loser_count'] = 0;
            $settlement['reward_total'] = 0;
            $settlement['real_lost_pool'] = 0;
            $settlement['killed_room_pool'] = 0;
            $settlement['survivor_count'] = 0;
            $settlement['survivor_coin_total'] = 0;
            $settlement['real_winner_coin_total'] = 0;
            $settlement['distributed_bonus_total'] = 0;
            $settlement['winner_share'] = 0;
        }

        $filtered['mode'] = $mode;
        $filtered['roomid'] = (int)$roomid;
        $filtered['tzcoin'] = self::killedRoomCoin($roomid, $mode, $room['killer_to_smallroomid'] ?? 0);
        $filtered['settlement'] = $settlement;
        return $filtered;
    }

    protected static function settlementForUid($settlement, $uid)
    {
        $uid = (string)$uid;
        foreach (['winners', 'losers'] as $key) {
            foreach (($settlement[$key] ?? []) as $record) {
                if ((string)($record['uid'] ?? '') === $uid) {
                    return $record;
                }
            }
        }

        return null;
    }

    protected static function killedRoomCoin($roomid, $mode, $smallroomid)
    {
        $coins = Common::getroom_coin_list($roomid, Common::getnowexpect(), $mode);
        foreach ($coins as $item) {
            if ((int)$item['smallroomid'] === (int)$smallroomid) {
                return (int)$item['allcoin'];
            }
        }

        return 0;
    }

    protected static function findActiveBet($expect, $uid, $roomid, $mode)
    {
        $query = Db::table('wa_touzhu')->where([
            'expect' => $expect,
            'uid' => $uid,
            'roomid' => $roomid,
            'ifyouxiao' => 1,
            'status' => 0
        ]);
        $query = Common::applyModeWhere($query, $mode);
        return $query->orderByDesc('id')->first();
    }

    protected static function broadcastUserPosition($roomid, $mode, $uid, $smallroomid)
    {
        Gateway::sendToGroup(Common::roomGroup($roomid, $mode), Common::returndata('usertouzhu', [
            'code' => 1,
            'msg' => '位置已更新',
            'info' => [
                'uid' => $uid,
                'smallroomid' => $smallroomid,
                'mode' => $mode,
                'has_bet' => false
            ]
        ]));
    }

    protected static function broadcastRoomBetChange($roomid, $mode, $uid, $smallroomid, $expect)
    {
        $group = Common::roomGroup($roomid, $mode);

        Gateway::sendToGroup($group, Common::returndata('updatesmallcoin', [
            'code' => 1,
            'msg' => '房间积分已更新',
            'info' => Common::getroom_coin_list($roomid, $expect, $mode)
        ]));

        Gateway::sendToGroup($group, Common::returndata('usertouzhu', [
            'code' => 1,
            'msg' => '下注位置已更新',
            'info' => [
                'uid' => $uid,
                'smallroomid' => $smallroomid,
                'mode' => $mode
            ]
        ]));
    }
}
