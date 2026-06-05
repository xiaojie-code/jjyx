<?php

namespace plugin\webman\gateway;

use GatewayWorker\Lib\Gateway;
use support\Db;
use support\Redis;

class Taosha
{
    public static function timer()
    {
        $time = 60 - date('s', time());

        $groups = self::activeRoundGroups();
        foreach ($groups['playing'] as $group) {
            Gateway::sendToGroup($group['group'], Common::returndata('timer', [
                'code' => 1,
                'msg' => 'round timer',
                'info' => (int)$time
            ]));
        }

        foreach ($groups['waiting'] as $group) {
            Gateway::sendToGroup($group['group'], Common::returndata('match_waiting', [
                'code' => 1,
                'msg' => 'waiting for real players',
                'info' => [
                    'mode' => Common::MODE_REAL,
                    'roomid' => $group['roomid'],
                    'online' => $group['online'],
                    'min_players' => self::minRealPlayers()
                ]
            ]));
        }

        switch ((int)$time) {
            case 60:
                foreach ($groups['playing'] as $group) {
                    Gateway::sendToGroup($group['group'], Common::returndata('game_start', [
                        'code' => 1,
                        'msg' => 'game start',
                        'info' => [
                            'mode' => $group['mode'],
                            'roomid' => $group['roomid'],
                            'lock_time' => 15,
                            'settle_time' => 4
                        ]
                    ]));
                }
                break;
            case 55:
            case 52:
            case 50:
            case 47:
            case 43:
            case 36:
            case 33:
            case 29:
            case 22:
                Common::robotmoveForActiveRooms();
                break;
            case 25:
                Common::robotmoveForActiveRooms();
                foreach ($groups['playing'] as $group) {
                    Gateway::sendToGroup($group['group'], Common::returndata('game_killer_10', [
                        'code' => 1,
                        'msg' => 'killer appears in 10 seconds',
                        'info' => [
                            'mode' => $group['mode'],
                            'roomid' => $group['roomid']
                        ]
                    ]));
                }
                break;
            case 15:
                $room = Common::killer(false);
                foreach ($groups['playing'] as $group) {
                    Gateway::sendToGroup($group['group'], Common::returndata('killerappear', [
                        'code' => 1,
                        'msg' => 'killer appeared',
                        'info' => [
                            'id' => $room['killer_to_smallroomid'],
                            'mode' => $group['mode'],
                            'roomid' => $group['roomid']
                        ]
                    ]));
                }
                break;
            case 4:
                $room = Common::killer(true);
                foreach ($groups['playing'] as $group) {
                    Gateway::sendToGroup($group['group'], Common::returndata('result', [
                        'code' => 1,
                        'msg' => 'round result',
                        'info' => self::resultForGroup($room, $group['mode'], $group['roomid'])
                    ]));
                }
                break;
        }
    }

    public static function changesmallroom($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $mode = Common::getDataMode($data, $data['uid'], $client_id);
        $roomid = (int)$data['roomid'];
        $tosmallroomid = (int)($data['tosmallroomid'] ?? ($data['smallroomid'] ?? 0));

        if (!self::canPlayMode($roomid, $mode)) {
            return [
                'code' => 1071,
                'msg' => 'waiting for real players',
                'info' => self::modeStatus($roomid, $mode)
            ];
        }

        if (!self::canOperate()) {
            return [
                'code' => 1059,
                'msg' => 'room is locked',
                'info' => []
            ];
        }

        if ($tosmallroomid < 1 || $tosmallroomid > 8) {
            return [
                'code' => 1061,
                'msg' => 'small room not found',
                'info' => []
            ];
        }

        $expect = Common::getnowexpect();
        $lockKey = 'killer_bet_lock_' . $expect . '_' . $mode . '_' . $roomid . '_' . $data['uid'];
        $lockToken = Common::acquireLock($lockKey, 5);
        if (!$lockToken) {
            return [
                'code' => 1064,
                'msg' => 'request is processing',
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
            $next = $query->first();

            if (!$next) {
                Common::upposition($data['uid'], $tosmallroomid);
                self::broadcastUserPosition($roomid, $mode, $data['uid'], $tosmallroomid);
                return [
                    'code' => 1,
                    'msg' => 'position changed',
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
            'msg' => 'change room success',
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
        $roomid = (int)$data['roomid'];

        if ($mode === Common::MODE_AI) {
            Common::robotmove($roomid, $mode);
        }

        $roominfo = Db::table('wa_rooms')->where(['status' => 1, 'id' => $roomid])->first();
        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => 'room not found',
                'info' => []
            ];
        }

        $userinfo = Common::getuserinfo($data['uid']);
        if ($userinfo['coin'] < $roominfo->minprice) {
            return [
                'code' => 1052,
                'msg' => 'coin below room minimum',
                'info' => [
                    'minprice' => (int)$roominfo->minprice
                ]
            ];
        }

        $nums = $mode === Common::MODE_REAL ? self::onlinePlayerCount($roomid, $mode) : Common::getroom_nums($roomid, $mode);
        if ($nums >= $roominfo->maxuser) {
            return [
                'code' => 1053,
                'msg' => 'room is full',
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
        $killerto = Redis::get('killer_' . $expect);

        $info = [
            'onlinelist' => $onlinelist,
            'onlinenum' => $online,
            'robotnum' => count($robots),
            'mode' => $mode,
            'match_status' => self::canPlayMode($roomid, $mode) ? 'playing' : 'waiting',
            'min_real_players' => self::minRealPlayers(),
            'smallrooms' => Common::getroom_coin_list($roomid, $expect, $mode),
            'selfuserinfo' => $userinfo,
            'killerto' => $killerto ?: '',
            'lock_time' => 15,
            'can_touzhu' => self::canOperate() && self::canPlayMode($roomid, $mode)
        ];

        Gateway::sendToGroup($group, Common::returndata('user_enter_room', [
            'code' => 1,
            'msg' => 'user entered room',
            'info' => [
                'userinfo' => $userinfo,
                'mode' => $mode
            ]
        ]));

        return [
            'code' => 1,
            'msg' => 'enter success',
            'info' => $info
        ];
    }

    public static function leaveroom($client_id, $data)
    {
        $checktoken = Common::checktoken($client_id, $data['uid'], $data['token']);
        if ($checktoken != 1) {
            return null;
        }

        $roomid = (int)$data['roomid'];
        $mode = Common::getDataMode($data, $data['uid'], $client_id);
        $roominfo = Db::table('wa_rooms')->where(['status' => 1, 'id' => $roomid])->first();

        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => 'room not found',
                'info' => []
            ];
        }

        $userinfo = Common::getuserinfo($data['uid']);
        Common::leaveroom($client_id, $roomid, $userinfo, $mode);

        return [
            'code' => 1,
            'msg' => 'leave success',
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
            return [
                'code' => 1,
                'msg' => 'connection closed',
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

        $roomid = (int)$data['roomid'];
        $smallroomid = (int)$data['smallroomid'];
        $coin = (int)$data['coin'];
        $mode = Common::getDataMode($data, $data['uid'], $client_id);

        if ($smallroomid < 1 || $smallroomid > 8) {
            return [
                'code' => 1061,
                'msg' => 'small room not found',
                'info' => []
            ];
        }

        if ($coin <= 0) {
            return [
                'code' => 1055,
                'msg' => 'coin must be greater than 0',
                'info' => []
            ];
        }

        $roominfo = Db::table('wa_rooms')->where(['status' => 1, 'id' => $roomid])->first();
        if (!$roominfo) {
            return [
                'code' => 1051,
                'msg' => 'room not found',
                'info' => []
            ];
        }

        $userinfo = Common::getuserinfo($data['uid']);
        if ((int)$userinfo['roomid'] !== $roomid) {
            return [
                'code' => 1054,
                'msg' => 'not in this room',
                'info' => []
            ];
        }

        if ($userinfo['coin'] < $coin) {
            return [
                'code' => 1056,
                'msg' => 'coin not enough',
                'info' => []
            ];
        }

        if (!self::canPlayMode($roomid, $mode)) {
            return [
                'code' => 1071,
                'msg' => 'waiting for real players',
                'info' => self::modeStatus($roomid, $mode)
            ];
        }

        if (!self::canOperate()) {
            return [
                'code' => 1059,
                'msg' => 'room is locked',
                'info' => []
            ];
        }

        $expect = Common::getnowexpect();
        $lockKey = 'killer_bet_lock_' . $expect . '_' . $mode . '_' . $roomid . '_' . $data['uid'];
        $lockToken = Common::acquireLock($lockKey, 5);
        if (!$lockToken) {
            return [
                'code' => 1064,
                'msg' => 'bet request is processing',
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
            $exists = $query->first();

            if ($exists) {
                $sameRoom = (int)$exists->tzid === $smallroomid;
                $sameCoin = (int)$exists->coin === $coin;

                if (!$sameCoin) {
                    return [
                        'code' => 1065,
                        'msg' => 'bet amount is locked in this round',
                        'info' => [
                            'id' => $exists->id,
                            'smallroomid' => (int)$exists->tzid,
                            'coin' => (int)$exists->coin,
                            'mode' => $mode,
                            'has_bet' => true
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
                    'msg' => $sameRoom ? 'already bet' : 'change room success',
                    'info' => [
                        'id' => $exists->id,
                        'smallroomid' => $smallroomid,
                        'coin' => (int)$exists->coin,
                        'mode' => $mode,
                        'has_bet' => true,
                        'deducted' => false
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
            if (!Common::updateusercoin($data['uid'], $coin, 0)) {
                Db::rollBack();
                return [
                    'code' => 1056,
                    'msg' => 'coin not enough',
                    'info' => []
                ];
            }

            $in = Db::table('wa_touzhu')->insert($touzhudata);
            if (!$in) {
                Db::rollBack();
                return [
                    'code' => 1063,
                    'msg' => 'bet failed',
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

            return [
                'code' => 1063,
                'msg' => 'bet failed',
                'info' => []
            ];
        } finally {
            Common::releaseLock($lockKey, $lockToken);
        }

        Common::upposition($data['uid'], $smallroomid);
        self::broadcastRoomBetChange($roomid, $mode, $data['uid'], $smallroomid, $expect);

        return [
            'code' => 1,
            'msg' => 'bet success',
            'info' => [
                'smallroomid' => $smallroomid,
                'coin' => $coin,
                'mode' => $mode,
                'has_bet' => true,
                'deducted' => true
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
            'msg' => 'get success',
            'info' => [
                'list' => $list,
                'killer' => $killer,
                'myrecord' => $myinfo
            ]
        ];
    }

    protected static function canOperate()
    {
        $time = 60 - date('s', time());
        return $time > 15;
    }

    protected static function minRealPlayers()
    {
        return 2;
    }

    protected static function canPlayMode($roomid, $mode)
    {
        $mode = Common::normalizeMode($mode);
        if ($mode !== Common::MODE_REAL) {
            return true;
        }

        return self::realPlayerCount($roomid) >= self::minRealPlayers();
    }

    protected static function modeStatus($roomid, $mode)
    {
        $mode = Common::normalizeMode($mode);
        $online = self::onlinePlayerCount($roomid, $mode);
        return [
            'mode' => $mode,
            'roomid' => (int)$roomid,
            'online' => $online,
            'min_players' => $mode === Common::MODE_REAL ? self::minRealPlayers() : 1,
            'status' => self::canPlayMode($roomid, $mode) ? 'playing' : 'waiting'
        ];
    }

    protected static function activeRoundGroups()
    {
        $result = [
            'playing' => [],
            'waiting' => []
        ];

        $rooms = Db::table('wa_rooms')->where('status', 1)->get();
        $rooms = Common::object_array($rooms);

        foreach ($rooms as $room) {
            $roomid = (int)($room['id'] ?? 0);
            if ($roomid <= 0) {
                continue;
            }

            $aiGroup = Common::roomGroup($roomid, Common::MODE_AI);
            $aiOnline = Gateway::getClientCountByGroup($aiGroup);
            if ($aiOnline > 0) {
                $result['playing'][] = [
                    'group' => $aiGroup,
                    'mode' => Common::MODE_AI,
                    'roomid' => $roomid,
                    'online' => $aiOnline
                ];
            }

            $realGroup = Common::roomGroup($roomid, Common::MODE_REAL);
            $realOnline = self::realPlayerCount($roomid);
            if ($realOnline >= self::minRealPlayers()) {
                $result['playing'][] = [
                    'group' => $realGroup,
                    'mode' => Common::MODE_REAL,
                    'roomid' => $roomid,
                    'online' => $realOnline
                ];
            } elseif ($realOnline > 0) {
                $result['waiting'][] = [
                    'group' => $realGroup,
                    'mode' => Common::MODE_REAL,
                    'roomid' => $roomid,
                    'online' => $realOnline
                ];
            }
        }

        return $result;
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
        } else {
            $settlement['groups'] = [];
            $settlement['winners'] = [];
            $settlement['losers'] = [];
            $settlement['winner_count'] = 0;
            $settlement['loser_count'] = 0;
            $settlement['reward_total'] = 0;
            $settlement['real_lost_pool'] = 0;
        }

        $filtered['mode'] = $mode;
        $filtered['roomid'] = (int)$roomid;
        $filtered['tzcoin'] = self::killedRoomCoin($roomid, $mode, $room['killer_to_smallroomid'] ?? 0);
        $filtered['settlement'] = $settlement;
        return $filtered;
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

    protected static function broadcastUserPosition($roomid, $mode, $uid, $smallroomid)
    {
        Gateway::sendToGroup(Common::roomGroup($roomid, $mode), Common::returndata('usertouzhu', [
            'code' => 1,
            'msg' => 'user position changed',
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
            'msg' => 'small room coins updated',
            'info' => Common::getroom_coin_list($roomid, $expect, $mode)
        ]));

        Gateway::sendToGroup($group, Common::returndata('usertouzhu', [
            'code' => 1,
            'msg' => 'user bet position changed',
            'info' => [
                'uid' => $uid,
                'smallroomid' => $smallroomid,
                'mode' => $mode
            ]
        ]));
    }
}
