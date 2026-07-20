<?php

namespace plugin\webman\gateway;

use GatewayWorker\Lib\Gateway;
use plugin\webman\gateway\Option;
use plugin\webman\gateway\Taosha;
use support\Redis;
use Workerman\Timer;

class Events
{
    public static function onWorkerStart($worker)
    {
        Timer::add(1, function () {
            try {
                Taosha::timer();
            } catch (\Throwable $e) {
                self::reportRuntimeError('timer', $e);
            }
        });
    }

    public static function onConnect($client_id)
    {
    }

    public static function onWebSocketConnect($client_id, $data)
    {
        $mode = self::modeFromHandshake($data);
        if ($mode) {
            try {
                Common::setClientSelectedMode($client_id, $mode);
            } catch (\Throwable $e) {
                self::reportRuntimeError('websocket_connect', $e);
            }
        }

        Gateway::sendToClient($client_id, Common::returndata('connected', [
            'client_id' => $client_id,
            'mode' => $mode ?: Common::MODE_AI
        ]));
    }

    public static function onMessage($client_id, $message)
    {
        $data = is_array($message) ? $message : json_decode($message, true);
        if (!is_array($data)) {
            Gateway::sendToClient($client_id, Common::returndata('error', [
                'code' => 400,
                'msg' => '消息格式错误',
                'info' => ''
            ]));
            return;
        }

        $action = $data['action'] ?? 'other';
        $payload = $data['data'] ?? [];
        $payload = self::applyClientMode($client_id, $action, $payload);

        try {
            switch ($action) {
            case 'getconfig':
                $config = Option::getconfig();
                Gateway::sendToClient($client_id, Common::returndata('returnconfig', $config));
                break;
            case 'userreg':
                $reg = User::userreg($payload);
                Gateway::sendToClient($client_id, Common::returndata('returnuserreg', $reg));
                break;
            case 'login':
                $res = User::userlogin($payload);
                if (($res['code'] ?? 0) == 1) {
                    $uid = $res['info']['userinfo']['id'];
                    Redis::set('binduid_' . $client_id, $uid);
                    Gateway::bindUid($client_id, $uid);
                }
                Gateway::sendToClient($client_id, Common::returndata('returnlogin', $res));
                break;
            case 'app_login':
                $res = User::appLogin($payload);
                if (($res['code'] ?? 0) == 1) {
                    $uid = $res['info']['userinfo']['id'];
                    Redis::set('binduid_' . $client_id, $uid);
                    Gateway::bindUid($client_id, $uid);
                }
                Gateway::sendToClient($client_id, Common::returndata('returnlogin', $res));
                break;
            case 'getchargerules':
                $res = User::getchargerules($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('chargerules', $res));
                break;
            case 'charge':
                $res = User::charge($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('payinfo', $res));
                break;
            case 'getdrawrule':
                $res = User::drawrules($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('drawrules', $res));
                break;
            case 'withdraw':
                $res = User::withdraw($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('withdrawinfo', $res));
                break;
            case 'enterroom':
                $res = Taosha::enterroom($client_id, $payload);
                if (($res['code'] ?? 0) == 1 && isset($payload['uid'])) {
                    Redis::set('binduid_' . $client_id, $payload['uid']);
                }
                Gateway::sendToClient($client_id, Common::returndata('returnenterroom', $res));
                Taosha::syncRoundStateAfterEnter($client_id, $res);
                break;
            case 'start_round':
                $res = Taosha::startRound($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('returnstart_round', $res));
                Taosha::pushRoundStartIfReady($res);
                break;
            case 'leaveroom':
                $res = Taosha::leaveroom($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('returnleaveroom', $res));
                break;
            case 'touzhu':
                $res = Taosha::touzhu($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('returntouzhu', $res));
                Taosha::syncClientAfterBet($client_id, $payload, $res);
                break;
            case 'changesmallroom':
                $res = Taosha::changesmallroom($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('returnchangesmallroom', $res));
                break;
            case 'getrecord':
                $res = Taosha::getrecord($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('returnrecord', $res));
                break;
            case 'getbalance':
                $res = User::getbalance($client_id, $payload);
                Gateway::sendToClient($client_id, Common::returndata('returngetbalance', $res));
                break;
            }
        } catch (\Throwable $e) {
            self::reportRuntimeError('message:' . $action, $e);
            $responseAction = in_array($action, ['login', 'app_login'], true)
                ? 'returnlogin'
                : 'error';
            Gateway::sendToClient($client_id, Common::returndata($responseAction, [
                'code' => 503,
                'msg' => '大逃杀服务暂时不可用，请稍后重试',
                'info' => []
            ]));
        }
    }

    public static function onClose($client_id)
    {
        try {
            $uid = Redis::get('binduid_' . $client_id);
            if ($uid) {
                $res = Taosha::onCloseleaveroom($client_id, $uid);
                Gateway::sendToAll(Common::returndata('anyleaveroom_toall', $res));
            }

            Common::clearClientSelectedMode($client_id);
        } catch (\Throwable $e) {
            self::reportRuntimeError('close', $e);
        }
    }

    protected static function reportRuntimeError($scope, \Throwable $error)
    {
        static $lastLoggedAt = [];
        static $lastMessages = [];

        $scope = (string)$scope;
        $message = get_class($error) . ': ' . $error->getMessage();
        $now = time();
        $lastAt = (int)($lastLoggedAt[$scope] ?? 0);
        $lastMessage = (string)($lastMessages[$scope] ?? '');
        if ($message === $lastMessage && $now - $lastAt < 60) {
            return;
        }

        $lastLoggedAt[$scope] = $now;
        $lastMessages[$scope] = $message;
        error_log('[killer][' . $scope . '] ' . $message);
    }

    protected static function applyClientMode($client_id, $action, $payload)
    {
        if (!is_array($payload)) {
            $payload = [];
        }

        $modeActions = ['enterroom', 'start_round', 'leaveroom', 'touzhu', 'changesmallroom', 'getrecord'];
        if (!in_array($action, $modeActions, true)) {
            return $payload;
        }

        if (isset($payload['mode']) || isset($payload['match_mode']) || isset($payload['gameMode'])) {
            $mode = Common::normalizeMode($payload);
            $payload['mode'] = $mode;
            Common::setClientSelectedMode($client_id, $mode);
            return $payload;
        }

        $mode = Common::getClientSelectedMode($client_id);
        if ($mode) {
            $payload['mode'] = $mode;
        }

        return $payload;
    }

    protected static function modeFromHandshake($data)
    {
        if (!is_array($data)) {
            return '';
        }

        $mode = self::modeFromArray($data['get'] ?? []);
        if ($mode) {
            return $mode;
        }

        $server = $data['server'] ?? [];
        if (!is_array($server)) {
            return '';
        }

        $mode = self::modeFromQuery($server['QUERY_STRING'] ?? '');
        if ($mode) {
            return $mode;
        }

        $mode = self::modeFromUrl($server['REQUEST_URI'] ?? '');
        if ($mode) {
            return $mode;
        }

        return self::modeFromUrl($server['HTTP_REFERER'] ?? '');
    }

    protected static function modeFromUrl($url)
    {
        $url = (string)$url;
        if ($url === '') {
            return '';
        }

        $query = parse_url($url, PHP_URL_QUERY);
        return self::modeFromQuery($query ?: '');
    }

    protected static function modeFromQuery($query)
    {
        if (!$query) {
            return '';
        }

        $params = [];
        parse_str((string)$query, $params);
        return self::modeFromArray($params);
    }

    protected static function modeFromArray($data)
    {
        if (!is_array($data)) {
            return '';
        }

        foreach (['mode', 'match_mode', 'matchMode', 'gameMode'] as $key) {
            if (isset($data[$key]) && (string)$data[$key] !== '') {
                return Common::normalizeMode((string)$data[$key]);
            }
        }

        return '';
    }
}
