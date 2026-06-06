<?php

namespace plugin\webman\gateway;
use support\Db;

class Option
{

    public static function getconfig()
    {   
        $config = Db::table("wa_options")->where("name","system_config")->select("value")->get();
        $config= json_decode($config,1);
        $config = json_decode($config[0]['value'],1);
        // var_dump($config);die;
        $data['title']=$config['logo']['title'];
        $data['banquan']=$config['logo']['banquan'];
        $data['logo']=$config['logo']['siteurl'].$config['logo']['image'];
        $data['gamestatus']=$config['logo']['gamestatus'];
        if(!$data['gamestatus']){
            $data['gamestatus']='off';
        }
        $data['logintype']=$config['logo']['logintype'];
        $data['logintype']=$config['logo']['logintype'];
        $data['paystatus']=$config['logo']['paystatus'];
        if(!$data['paystatus']){
            $data['paystatus']='off';
        }
        $data['duihuanstatus']=$config['logo']['duihuanstatus'];
        if(!$data['duihuanstatus']){
            $data['duihuanstatus']='off';
        }
        $data['bet_amounts']=Common::allowedBetAmounts(false);
        $data['robot_bet_amounts']=Common::allowedBetAmounts(true);
        $info['code']=1;
        $info['msg']='success';

        $info['info']=$data;

        return $info;
    }

}
