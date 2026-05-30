<?php

namespace plugin\webman\gateway;

use GatewayWorker\Lib\Gateway;
use plugin\webman\gateway\Option;
use plugin\webman\gateway\Taosha;
use Workerman\Timer;
// use support\Request;
use support\Redis;
use support\Db;


class Events
{

    public static function onWorkerStart($worker)
    {

        if($worker->id === 0){  //只有进程id是0的才执行该定时器
            $key = 'timer2';
            $timer = Redis::get($key);
            // echo ("当前定时器状态".$timer);
            if($timer==0){
                Timer::add(1, function(){
                    Taosha::timer();   //定时发送各个时间阶段的通知
                });
                Redis::set($key, 1); // echo('定时器启动');
            }
            
        }
    }
        

    public static function onConnect($client_id)
    {
        // // 向当前client_id发送数据
        // Gateway::sendToAll("$client_id 刚刚上线");
    }

    public static function onWebSocketConnect($client_id, $data)
    { 
        Gateway::sendToAll("$client_id 上线了");
    }

    public static function onMessage($client_id,$message)
    {   
        var_dump($message);
        $data=is_array($message) ? $message : json_decode($message,1);
        // if($data['type'] ? $data['type'] : ''){
        //     exit();
        // }
        
        $action= $data['action'] ? $data['action'] :'other';

        switch ($action) {
            case 'getconfig':
                $config = Option::getconfig();
                Gateway::sendToClient($client_id,Common::returndata('returnconfig',$config));
                break;
            //注册 
            case 'userreg':
                $reg = User::userreg($data['data']);
                
                Gateway::sendToClient($client_id,Common::returndata('returnuserreg',$reg));
                break;
            // 登录
            case 'login':
                $res = User::userlogin($data['data']);
                if($res['code']==1){
                    $key = 'binduid_'.$client_id;  //绑定uid写入redis
                    $useredis = Redis::set($key,$res['info']['userinfo']['id']);
                    Gateway::bindUid($client_id,$res['info']['userinfo']['id']);
                }
                
                Gateway::sendToClient($client_id,Common::returndata('returnlogin',$res));
                break;
            case 'getchargerules':
                $res = User::getchargerules($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('chargerules',$res));
                break;
            case 'charge':
                // 充值
                $res = User::charge($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('payinfo',$res));
                break;
            case 'getdrawrule':
                // 获取提现规则
                $res = User::drawrules($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('drawrules',$res));
                break;
            case 'withdraw':
                // 提现
                $res = User::withdraw($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('withdrawinfo',$res));
                break;

            case 'enterroom':
                $res = Taosha::enterroom($client_id,$data['data']);

                $key = 'binduid_'.$client_id;  //绑定uid写入redis
                $useredis = Redis::set($key,$data['data']['uid']);
                
                Gateway::sendToClient($client_id,Common::returndata('returnenterroom',$res));
                break;
            case 'leaveroom':
                $res = Taosha::leaveroom($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('returnleaveroom',$res));
                break;
            case 'touzhu':
                $res = Taosha::touzhu($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('returntouzhu',$res));
                break;
            case 'robotenterroom':
                
               break;
            case 'changesmallroom':
                $res = Taosha::changesmallroom($client_id,$data['data']);
                // Gateway::sendToClient($client_id,Common::returndata('returnchangesmallroom',$res));
                break;
            case 'getrecord':
                $res = Taosha::getrecord($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('returnrecord',$res));
                break;
            case 'getbalance':
                $res = User::getbalance($client_id,$data['data']);
                Gateway::sendToClient($client_id,Common::returndata('returngetbalance',$res));
                break;
                break;
        }

        // Gateway::sendToClient($client_id, "未定义事件名");
    }

    
    public static function onClose($client_id)
    {
        // 向所有人发送 
        // GateWay::sendToAll("$client_id logout");

        // 离开房间的操作
        // $res = Taosha::onCloseleaveroom($client_id);  
        $key = "binduid_".$client_id;  //房间人数key
        $uid = Redis::get($key);
        // var_dump($key,$uid);die;
        if($uid){
            $res = Taosha::onCloseleaveroom($client_id,$uid); 
            GateWay::sendToAll(Common::returndata('anyleaveroom_toall',$res));
        }
      
    }


}
