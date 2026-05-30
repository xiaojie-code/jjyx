<?php

namespace plugin\webman\gateway;
use support\Db;
use GatewayWorker\Lib\Gateway;
use support\Redis;

class Common
{

    // 计算杀手去哪个房间
    static function killer(){
        $expect = Common::getnowexpect();
        
        // $room['killer_to_smallroomid'] = (int)1;
        $key = 'killer_'.$expect;
        $room['killer_to_smallroomid'] = Redis::get($key);
        if(!$room['killer_to_smallroomid']){
            $room['killer_to_smallroomid'] = rand(1,8);  //开出的房间号    需要更新为控制开奖
            Redis::set($key,$room['killer_to_smallroomid']); 
            $record = [
                'samllroomid'=> $room['killer_to_smallroomid'],
                'roomname'=>Common::smallroomname($room['killer_to_smallroomid']),
                'expect'=>$expect,
                'addtime'=>date('Y-m-d H:i:s',time())
            ];
            Db::table("wa_killer_record")->insert($record);

            // 把每个投注记录 改掉杀手的结果
            $touzhus = Db::table("wa_touzhu")->where(['expect'=>$expect])->get();
            $touzhu = Common::object_array($touzhus);
            if($touzhu){
                $handle = Common::handlekiller($touzhu,$expect,$room['killer_to_smallroomid']);
            }
            // 发放瓜分的收益
            // 查询本期 所有投注的人

            // $touzhus = Db::table("wa_touzhu")->where(['expect'=>$expect])->sum("coin"); //本期投注所有金额
            // $guafen = (int)Db::table("wa_touzhu")->where(['expect'=>$expect,'tzid'=>$room['killer_to_smallroomid']])->sum("coin"); //本期 杀手 瓜分金额
            
            // $ifkong = $realuser = (array)Db::table("wa_touzhu")->where(['expect'=>$expect,'isrobot'=>0,'ifyouxiao'=>1])->first();
            // if($ifkong){
            //     $realuser = (array)Db::table("wa_touzhu")->where(['expect'=>$expect,'isrobot'=>0,'ifyouxiao'=>1])->get();   //所有真人投注列表
            //     $touzhu = Common::object_array($realuser);
            //      if($touzhu){
            //         foreach ($touzhu as $k => $v){
            //             // var_dump($v);
            //             $user = Db::table("wa_users")->where('id',$v[0]['uid'])->first();
            //             // var_dump($user);die;
            //             // 投注金额占总金额的多少
            //             $newcoin = $user->coin * $guafen / $touzhus;
            //             Db::table("wa_users")->where(['id'=>$v['uid']])->update(['coin'=>$newcoin]);
            //             // 前端请求余额更新
            //         }
            //    }
            // }
          
            // var_dump($touzhu);
           
        }
        
        // 得改为每个房间的开奖

        
        $room['tzcoin'] = (int)Db::table("wa_touzhu")->where(['expect'=>$expect,'tzid'=>$room['killer_to_smallroomid']])->sum("coin");
        return $room;
    }

    // 处理开奖事宜
    static function handlekiller($list,$expect,$roomid){
       
        $roomname = Common::smallroomname($roomid);
        foreach ($list as $k =>$v){
            // var_dump($v);
            // if($v['tzid']==$roomid){
            //     $up = Db::table("wa_touzhu")->where(['id'=>$v['id'],'ifyouxiao'=>1])->update(['resultid'=>$roomid,'resultname'=>$roomname,'status'=>1]);
            // }else{
            //     $up = Db::table("wa_touzhu")->where(['id'=>$v['id'],'ifyouxiao'=>1])->update(['resultid'=>$roomid,'resultname'=>$roomname,'status'=>2]);
            // }

        }
    }

    static function checktoken($client_id,$uid,$token){
       $user = Db::table('wa_users')->where("id",$uid)->value('token');
    //    var_dump($user,$token);
       if(!$user){
            $data=[
                'code'=>10020,
                'msg'=>'用户不存在',
                'info'=>''
            ];
            Gateway::sendToClient($client_id,Common::returndata('usernotexit',$data));
            exit();
            return 10020;
       }
       if($user && $user!= $token){
        $data=[
            'code'=>700,
            'msg'=>'您的登录已过期，请重新登录',
            'info'=>''
        ];
            Gateway::sendToClient($client_id,Common::returndata('tokenexpire',$data));
            exit();
            return 700;
       }
       return 1;

    }

    static function returndata($action,$data)
    {
        $returndata=[
            'action'=>$action,
            'data'=>$data
        ];
       return json_encode($returndata,JSON_UNESCAPED_SLASHES);
    }

    // 获取开启的支付方式
    static function getpaytypelist(){
        $config = Db::table("wa_options")->where("name","system_config")->select("value")->get();
        $config= json_decode($config,1);
        $config = json_decode($config[0]['value'],1);

        $data['alipay']=$config['menu']['alipaystatus'];
        $data['wxpay']=$config['menu']['wxpaystatus'];
        $data['usdt']=$config['menu']['usdtstatus'];
        return $data;
    }
    static function getbaseconfig(){
        $config = Db::table("wa_options")->where("name","system_config")->select("value")->get();
        $config= json_decode($config,1);
        $config = json_decode($config[0]['value'],1);
        return $config;
    }

    // 获取用户信息
    static function getuserinfo($uid){
        $ifexit = Db::table("wa_users")->where("id",$uid)->first();
        $user['id']=$ifexit->id;
        $user['username']=$ifexit->username;
        $user['nickname']=$ifexit->nickname;
        $user['coin']=$ifexit->score;
        $user['money']=$ifexit->money;
        $user['isrobot']=$ifexit->isrobot;
        $user['status']=$ifexit->status;
        $user['roomid']=$ifexit->roomid;
        return $user;
    }

    // 记录用户金币日志
    static function usercoin_record($data){
        $in = Db::table("wa_usercoin_record")->insert($data);
        if($in){
            return 1;
        }else{
            return 0;
        }
    }

    // 操作用户金币   type : 0 减少  ；  1增加
    static function updateusercoin($uid,$coin,$type ){
        $userinfo = Common::getuserinfo($uid);
        if($type==0){
            $newcoin = $userinfo['coin']-$coin;
        }else{
            $newcoin = $userinfo['coin']+$coin;
        }
        
        $up = Db::table("wa_users")->where("id",$uid)->update(['score'=>$newcoin]);
        if($up){
            return 1;
        }else{
            return 0;
        }
    
    }

    // 更新人员小房间位置信息
    static function upposition($uid,$smallroomid){
        $expect = Common::getnowexpect();
        $key = "position_".$uid; 
        Redis::set($key, $smallroomid);
    }

    static function robotmove(){
        $robots =  Db::table("wa_users")->where(['isrobot'=>1,'roomid'=>0])->get()->toArray();
    
        $list_robots = Common::object_array($robots);
        $expect = Common::getnowexpect();
        // 每次挪动几个机器人
        $nums = rand(2,6);
        $arr = array_rand($list_robots,$nums);
        // var_dump($arr);die;
        foreach($arr as $keyt){
            $list[] = $list_robots[$keyt];
        }
        // var_dump($list);
        $list_robots = $list;
        foreach($list_robots as $k =>$v){
            // 记录机器人当前位置
            $key = "robotpositon_".$expect.'_'.$v['id'];
            $to['smallroomid']=rand(1,8);
            Redis::set($key,$to['smallroomid']);
            $to['uid']=(string)$v['id'];
           
                $res2=[
                    'code'=>1,
                    'msg'=>'用户投注挪动了小房间位置',
                    'info'=>$to
                ];               
            // 广播机器人位置变化信息
            Gateway::sendToGroup(2,Common::returndata('usertouzhu',$res2));
            // 机器人模拟投注   并广播房间内投注数据变化
            $config =self::getbaseconfig();
            // var_dump($config);die;
            $coin = rand($config['logo']['robotmin'],$config['logo']['robotmax']);
            $touzhu=[
                'uid'=>$v['id'],
                'expect'=>$expect,
                'tzid'=>$to['smallroomid'],
                'tzname'=>Common::smallroomname($to['smallroomid']),
                'coin'=>$coin,
                'addtime'=>date('Y-m-d H:i:s',time()),
                'status'=>0,
                'roomid'=>2,
                'isrobot'=>1
            ];
            $iftouzhu = Db::table("wa_touzhu")->where(['expect'=>$expect,'uid'=>$v['id']])->first();
            if($iftouzhu){
                $del = Db::table("wa_touzhu")->where(['expect'=>$expect,'uid'=>$v['id']])->update(['ifyouxiao'=>0]);
               
            }
                
            $in = Db::table("wa_touzhu")->insert($touzhu);
            
            // 发送群组socket 更新房间内
            $res=[
                'code'=>1,
                'msg'=>'小房间投注总额更新',
                'info'=>Common::getroom_coin_list(2,$expect)
            ];
            
            Gateway::sendToGroup(2,Common::returndata('updatesmallcoin',$res));
        }
        
    }
    // 获取机器人位置信息
    static function getrobotposition($uid){
        $expect = Common::getnowexpect();
        $key = "robotpositon_".$expect.'_'.$uid;
    
        $p = Redis::get($key);
        if(!$p){
            return "0";
        }else{
            return $p;
        }
    }    

    // 获取人员房间位置信息
    static function getposition($uid){
        $expect = Common::getnowexpect();
        $key = "position_".$uid; 
        $p = Redis::get($key);
        if(!$p){
            return "0";
        }else{
            return $p;
        }
    }
    static function joinrobots(){
        $robots =  Db::table("wa_users")->where(['isrobot'=>1,'roomid'=>0])->get()->toArray();
        $list_robots = Common::object_array($robots);
        foreach($list_robots as $k=>$v){
            $v['client_id']="7f00000108ff00000003";
            $v['uid']=(string)$v['id'];
            $v['userinfo']=Common::getuserinfo($v['id']);
            // 增加每个人的位置信息
            $v['position']=Common::getrobotposition($v['id']);
            $new[]=$v;
        }
        return $new;
    }


    static  function object_array($array){
        if(is_object($array)){
          $array = (array)$array;
        }
        if(is_array($array)){
          foreach($array as $key=>$value){
            $array[$key] = self::object_array($value);
          }
        }
        return $array;
      }


    // 进入房间
    static function enterroom($client_id,$roomid,$userinfo){
        // 设备绑定UID
        $key = 'binduid_'.$client_id;  //绑定uid写入redis
        $useredis = Redis::set($key,$userinfo['id']);
        Gateway::bindUid($client_id,$userinfo['id']);
        // socket 加入群组
        Gateway::joinGroup($client_id, $roomid);
        // 更新用户所在房间
        self::changeuserroomid($userinfo['id'],$roomid);
        // 增加房间在线人数
        self::uproom_nums($roomid,1,1);

    }

    // 离开房间

    static function leaveroom($client_id,$roomid,$userinfo){

        // socket 离开群组
        Gateway::leaveGroup($client_id, $roomid);
        // 更新用户所在房间
        self::changeuserroomid($userinfo['id'],0);
        // 减少房间在线人数
        self::uproom_nums($roomid,0,1);

    }

    // 更新用户所在房间信息
    static function changeuserroomid($uid,$roomid){
        Db::table("wa_users")->where("id",$uid)->update(['roomid'=>$roomid]);
    }


    // 获取当前房间人数
    static function getroom_nums($roomid){
        $key = "roomnums_".$roomid;  //房间人数key
        $nums = Redis::get($key);
        if(!$nums){
            Redis::set($key, 0);
            return 0;
        }
        return $nums;
    }

    // 获取当前时间的期号
    static function getnowexpect(){
        $hour = date("H");
		$min =date("i");
		// $hour = 1;
		// $min =15;
		$a = $hour*60+$min;

		if($a<1000 && $a>100){
			$a='0'.$a;
		}
		if($a<100){
			$a='00'.$a;
		}
		return date('Ymd').$a;
    }
    // 根据旗号获取时间
    static function gettimebyexpect($expect){
		// var_dump($expect);die;
		// $date = date('Ymd');
		$a = substr($expect,8);
		$year = substr($expect,0,4);
		$month = substr($expect,4,2);
		$day = substr($expect,6,2);
		// var_dump($year,$month,$day);die;
		$date = $year.'/'.$month.'/'.$day;
		// var_dump($date);die;
		if($a[0]=="0"){
			$a = mb_substr($a,1);
		}
		$hour = intval(floor($a/60));
		$min = $a%60;
		$time  = strtotime($date.' '.$hour.':'.$min);
		
		// $time  = $date.' '.$hour.':'.$min;
		return date('Y/m/d H:i',$time);

	}

    // 获取当前房间内某一期的投注金额 小房间金额列表
    static function getroom_coin_list($roomid,$expect){
        for($i=0;$i<9;$i++){
            $room['smallroomid']=$i;
            $room['allcoin'] =  (int)Db::table("wa_touzhu")->where(['roomid'=>$roomid,'tzid'=>$i,'expect'=>$expect,'ifyouxiao'=>1])->sum("coin");
            $new[]=$room;
        }
        return $new;
    }

    // 增加房间在线人数  type:0 减少；  1增加；    num 执行数量
    static function uproom_nums($roomid,$type,$num){
        $key = "roomnums_".$roomid; 
        $nums = Redis::get($key);
        if($type==1){
            if(!$nums){
                Redis::set($key, 1);
                return 1;
            }else{
                $nums = $nums+$num;
                Redis::set($key, $nums);
                return $nums;
            }
        }else{
            if(!$nums){
                Redis::set($key, 0);
                return 1;
            }else{
                if($nums>$num){
                    $nums = $nums-$num;
                }else{
                    $nums = 0;
                }
                
                Redis::set($key, $nums);
                return $nums;
            }
        }
    }

    // 获取小房间的名字
    static function smallroomname($id){
        switch ($id) {
            case '0':
                $name = "开始位置";
                break;
            case '1':
                $name = "厂长室";
                break;
            case '2':
                $name = "休息室";
                break;
            case '3':
                $name = "杂物间";
                break;
            case '4':
                $name = "谈话室";
                break;
            case '5':
                $name = "茶水间";
                break;
            case '6':
                $name = "工作室";
                break;
            case '7':
                $name = "洗衣房";
                break;
            case '8':
                $name = "音乐室";
                break;
          
        }
        // var_dump($id,$name);
        $result = isset($name) ? $name : '';
        return $result;
    }

    // 获取我的投注记录
    static function getmytzinfo($uid){
        $info['allcoin']=(string)Db::table("wa_touzhu")->where(['uid'=>$uid,'ifyouxiao'=>1])->sum("coin");
        $info['reward']=(string)Db::table("wa_touzhu")->where(['uid'=>$uid,'ifyouxiao'=>1,'status'=>1])->sum("rewards");
        $info['list']=Db::table("wa_touzhu")->where(['uid'=>$uid,'ifyouxiao'=>1])->orderByDesc('id',true)->limit(60)->get();
        return $info;
    }


}