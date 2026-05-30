<?php

namespace plugin\webman\gateway;
use support\Db;
use GatewayWorker\Lib\Gateway;
use support\Redis;

class Taosha
{

    // 定时器发送状态
    public static function timer()
    { 

        $time = 60-date('s',time());
        $data=[
            'code'=>1,
            'msg'=>'本局剩余时间',
            'info'=>(int)$time
        ];
        Gateway::sendToAll(Common::returndata('timer',$data));

        switch ($time) {
            case '60':
                $data=[
                    'code'=>1,
                    'msg'=>'游戏开始,请选择藏身房间',
                    'info'=>[]
                ];
                Gateway::sendToAll(Common::returndata('game_start',$data));
                break;
            case "55":  
                Common::robotmove();
                break;
            case "52":  
                Common::robotmove();
                break;            
            case "50":  
                Common::robotmove();
                break;
            case "47":  
                Common::robotmove();
                break;
            case "43":  
                Common::robotmove();
                break;
            case "36":  
                Common::robotmove();
                break;
            case "33":  
                Common::robotmove();
                break;
            case "29":  
                Common::robotmove();
                break;
            case "25":  
                Common::robotmove();
                break;
            case "22":  
                Common::robotmove();
                break;
            
            case '25':
                $data=[
                    'code'=>1,
                    'msg'=>'10秒后杀手出现',
                    'info'=>[]
                ];
                Gateway::sendToAll(Common::returndata('game_killer_10',$data));
                break;
            case '15':
                $room = Common::killer();
                // $roomname =  Common::smallroomname($room['killer_to_smallroomid']);
                $toroom['id'] = $room['killer_to_smallroomid'];
                $data=[
                    'code'=>1,
                    'msg'=>'杀手出现,房间锁门',
                    'info'=>$toroom
                ];
                
                // 开奖  核算每个房间真人投注量,随机开个房间
                // 杀手删掉了杂物间所有人幸存者瓜分66666金币
                
                Gateway::sendToAll(Common::returndata('killerappear',$data));
                break;
            case '4':
                $room = Common::killer();
                $roomname =  Common::smallroomname($room['killer_to_smallroomid']);
                $data=[
                    'code'=>1,
                    'msg'=>'杀手删掉了'.$roomname.'所有人幸存者瓜分'.$room['tzcoin'].'金币',
                    'info'=>$room
                ];
                
                // 开奖  核算每个房间真人投注量,随机开个房间
                // 杀手删掉了杂物间所有人幸存者瓜分66666金币
                
                Gateway::sendToAll(Common::returndata('result',$data));
                break;
        }
       
    }  

    // 切换小房间
    public static function changesmallroom($client_id,$data){
        $checktoken =   Common::checktoken($client_id,$data['uid'],$data['token']);
        if($checktoken==1){

            $expect=Common::getnowexpect();
            $next = Db::table("wa_touzhu")->where(['expect'=>$expect,'uid'=>$data['uid']])->first();
            $userinfo = Common::getuserinfo($data['uid']);
            $touzhudata = [
                'uid'=>$data['uid'],
                'expect'=>$expect,
                'tzid'=>$data['tosmallroomid'],
                'tzname'=>Common::smallroomname($data['tosmallroomid']),
                'coin'=>$next->coin,
                'addtime'=>date("Y/m/d H:i:s",time()),
                'status'=>0,
                'roomid'=>$data['roomid'],
                'isrobot'=>$userinfo['isrobot']
            ];
            // 重新入库
            $in = Db::table("wa_touzhu")->insert($touzhudata);
            // 删除以上记录
            Db::table("wa_touzhu")->where(['id'=>$next->id])->update(['ifyouxiao'=>0]);

            // 发送群组socket 更新房间内
            $res=[
                'code'=>1,
                'msg'=>'小房间投注总额更新',
                'info'=>Common::getroom_coin_list($data['roomid'],$expect)
            ];
            
            Gateway::sendToGroup($data['roomid'],Common::returndata('updatesmallcoin',$res));

            // 发送群组socket 这个用户挪动地方了
            $to['uid']=$data['uid'];
            $to['smallroomid']=$data['smallroomid'];
            $res2=[
                'code'=>1,
                'msg'=>'用户投注挪动了小房间位置',
                'info'=>$to
            ];               
            Gateway::sendToGroup($data['roomid'],Common::returndata('usertouzhu',$res2));
        }
    } 
    


    // 进房间
    public static function enterroom($client_id,$data){
        $checktoken =   Common::checktoken($client_id,$data['uid'],$data['token']);

        if($checktoken==1){
            Common::robotmove();
            // $key = "roominfo";
            // $roominfo = Redis::get($key);
            // if(!$roominfo){
                // $roominfo =Db::table("wa_rooms")->where("status",1)->where("id",$data['roomid'])->get();
            //     Redis::set($key, $roominfo);
            // }

            $roominfo =Db::table("wa_rooms")->where(["status"=>1,'id'=>$data['roomid']])->first();
            // var_dump($data['roomid']);die;
            if(!$roominfo){
                $data=[
                    'code'=>1051,
                    'msg'=>'房间不存在',
                    'info'=>[]
                ];
                return $data;
            }
            $userinfo = Common::getuserinfo($data['uid']);
            // var_dump($userinfo['coin'],$roominfo->minprice);die;
            if($userinfo['coin']<$roominfo->minprice){
                $data=[
                    'code'=>1052,
                    'msg'=>'最低进入房间限制为'.$roominfo->minprice.'金币',
                    'info'=>[]
                ];
                return $data;
            }

            // 查询房间现有人数
            $nums = Common::getroom_nums($data["roomid"]);
            if($nums>$roominfo->maxuser){
                $data=[
                    'code'=>1053,
                    'msg'=>'房间人数已满，请等待',
                    'info'=>[]
                ];
                return $data;               
            }


            // 进入房间
            Common::enterroom($client_id,$data["roomid"],$userinfo);


            // 当前房间在线人数数量
            $online = Gateway::getClientCountByGroup($data["roomid"]);
            // 获取当前房间 所有人在线的信息
            $onlinelist = Gateway::getClientSessionsByGroup($data["roomid"]);
            
            foreach($onlinelist as $k =>$v){
                $v['clientid']=$k;
                $v['uid']=Gateway::getUidByClientId($k);
                $v['userinfo']=Common::getuserinfo($v['uid']);
                // 增加每个人的位置信息
                $v['position']=Common::getposition($v['uid']);
                $new[]=$v;
            }
            // 加入机器人
            $robots = Common::joinrobots();
            
            // 机器人和真人合并数据
            $onlinelist = array_merge($new,$robots);
            // var_dump($onlinelist);die;
            $info['onlinelist']=$onlinelist;
            $info['onlinenum']=$online;
            
            //小房间内的金币数量
            $expect = Common::getnowexpect();
            $info['smallrooms']=Common::getroom_coin_list($data['roomid'],$expect); 
            $info['selfuserinfo']=$userinfo;

            // 获取当前杀手的目的地房间

            $key2 = 'killer_'.$expect;
            $info['killerto'] = Redis::get($key2) ? Redis::get($key2) : '' ;

            // 发送群组socket 更新房间内人员信息

            $res_all=[
                'code'=>1,
                'msg'=>'有用户进入房间',
                'info'=>$userinfo
            ];
            
            Gateway::sendToGroup($data['roomid'],Common::returndata('user_enter_room',$res_all));

            $data=[
                'code'=>1,
                'msg'=>'进入成功',
                'info'=>$info
            ];
            return $data;
        
        }
    }

    // 离开房间
    public static function leaveroom($client_id,$data){
        $checktoken =   Common::checktoken($client_id,$data['uid'],$data['token']);

        if($checktoken==1){
            $roominfo =Db::table("wa_rooms")->where(["status"=>1,'id'=>$data['roomid']])->first();
            // var_dump($data['roomid']);die;
            if(!$roominfo){
                $data=[
                    'code'=>1051,
                    'msg'=>'房间不存在',
                    'info'=>[]
                ];
                return $data;
            }
            $userinfo = Common::getuserinfo($data['uid']);
            Common::leaveroom($client_id,$data["roomid"],$userinfo);
            $leaveuser=[
                'uid'=>$data['uid'],
            ];
            $data=[
                'code'=>1,
                'msg'=>$userinfo['username'].'离开房间',
                'info'=>$leaveuser
            ];
            return $data;
            
        }
    }

    // onCloseleaveroom  关闭连接 退出房间
    public static function onCloseleaveroom($client_id,$uid){
        // $uid = Gateway::getUidByClientId($client_id);
        // var_dump($uid);die;
        $data['uid']=$uid;
        $user=Db::table("wa_users")->where("id",$uid)->first();
        $data['roomid']=$user->roomid;
        $data['token']=$user->token;
        return self::leaveroom($client_id,$data);
    }


    // 投注 
    public static function touzhu($client_id,$data){
        $checktoken =   Common::checktoken($client_id,$data['uid'],$data['token']);
        if($checktoken==1){
            $roominfo =Db::table("wa_rooms")->where(["status"=>1,'id'=>$data['roomid']])->first();
            // var_dump($data['roomid']);die;
            if(!$roominfo){
                $data=[
                    'code'=>1051,
                    'msg'=>'房间不存在',
                    'info'=>[]
                ];
                return $data;
            }
            $userinfo = Common::getuserinfo($data['uid']);
        
            // if($userinfo['roomid'] != $data['roomid']){
            //     $data=[
            //         'code'=>1052,
            //         'msg'=>'您不在此房间内，无法下注',
            //         'info'=>[]
            //     ];
            //     return $data;
            // }
            if($userinfo['coin']<$data['coin']){
                $data=[
                    'code'=>1056,
                    'msg'=>'金币不足',
                    'info'=>[]
                ];
                return $data;
            }

            // 是否在下注有效期内
            $time = 60-date('s',time());
            if($time<=10){
                $data=[
                    'code'=>1059,
                    'msg'=>'房间已锁门,无法更换房间',
                    'info'=>[]
                ];
                return $data;
            }

            $expect=Common::getnowexpect();
            // 判断是否有存在投注记录
            // $ifexit = Db::table("wa_touzhu")->where(["expect"=>$expect,"uid"=>$data['uid']])->first();
            // if($ifexit && $ifexit->tzid !=$data['smallroomid']){
            //     $upifexit = Db::table("wa_touzhu")->where(["id"=>$ifexit['id']])->update(['ifyouxiao'=>0]);
            // }
            // if(!$ifexit){
                $touzhudata = [
                    'uid'=>$data['uid'],
                    'expect'=>$expect,
                    'tzid'=>$data['smallroomid'],
                    'tzname'=>Common::smallroomname($data['smallroomid']),
                    'coin'=>$data['coin'],
                    'addtime'=>date("Y/m/d H:i:s",time()),
                    'status'=>0,
                    'roomid'=>$data['roomid'],
                    'isrobot'=>$userinfo['isrobot'],
                    'ifyouxiao'=>1
                ];
                $in = Db::table("wa_touzhu")->insert($touzhudata);
            
           

            if($in){

                // 更新当前用户的位置position信息
                $position=Common::upposition($data['uid'],$data['smallroomid']);

                // 扣除金币
                Common::updateusercoin($data['uid'],$data['coin'],0);
                // 记录金币消费
                $record = [
                    'uid'=>$data['uid'],
                    'coin'=>$data['coin'],
                    'type'=>0,
                    'remark'=>'房间'.$data['roomid'].'号投注'.Common::smallroomname($data['smallroomid']).$data['coin'].'金币',
                    'addtime'=>date("Y/m/d H:i:s",time())
                ];
                Common::usercoin_record($record);



                // 发送群组socket 更新房间内
                $res=[
                    'code'=>1,
                    'msg'=>'小房间投注总额更新',
                    'info'=>Common::getroom_coin_list($data['roomid'],$expect)
                ];
                
                Gateway::sendToGroup($data['roomid'],Common::returndata('updatesmallcoin',$res));

                // 发送群组socket 这个用户挪动地方了
                $to['uid']=$data['uid'];
                $to['smallroomid']=$data['smallroomid'];
                $res2=[
                    'code'=>1,
                    'msg'=>'用户投注挪动了小房间位置',
                    'info'=>$to
                ];               
                Gateway::sendToGroup($data['roomid'],Common::returndata('usertouzhu',$res2));
                $tz=[
                    'code'=>1,
                    'msg'=>'投注成功',
                    'info'=>[]
                ];
                return $tz;
            
             }
        }
    }


    // 获取投注记录
    public static function getrecord($client_id,$data){
        $checktoken =   Common::checktoken($client_id,$data['uid'],$data['token']);
        if($checktoken==1){
            // 100期内杀手数据
            for($i=1;$i<9;$i++){
                $list[$i-1]['smallroomid']=$i;
                $list[$i-1]['smallroomname']=Common::smallroomname($i);
                $maxid = Db::table("wa_killer_record")->max('id');
                $startid = $maxid-100;
                $list[$i-1]['count']=Db::table("wa_killer_record")->orderByDesc('id',true)->limit(100)->where('samllroomid',$i)->where("id",">",$startid)->count();
                // $new[]=$list;
            }
            // 近10期杀手房间记录
            $killer = Db::table("wa_killer_record")->orderByDesc('id',false)->limit(10)->get();

            // 我的投注记录
            $myinfo = Common::getmytzinfo($data['uid']);
            $rs['list']=$list;
            $rs['killer']=$killer;
            $rs['myrecord']=$myinfo;
            $tz=[
                'code'=>1,
                'msg'=>'获取成功',
                'info'=>$rs
            ];
            return $tz;
        }
    }


}