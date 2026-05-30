<?php

namespace plugin\admin\app\controller;

use support\Request;
use support\Response;
use plugin\admin\app\model\ChargeUser;
use plugin\admin\app\controller\Crud;
use support\exception\BusinessException;

/**
 * 用户充值 
 */
class ChargeUserController extends Crud
{
    
    /**
     * @var ChargeUser
     */
    protected $model = null;

    /**
     * 构造函数
     * @return void
     */
    public function __construct()
    {
        $this->model = new ChargeUser;
    }
    
    /**
     * 浏览
     * @return Response
     */
    public function index(): Response
    {
        return view('charge-user/index');
    }

    /**
     * 插入
     * @param Request $request
     * @return Response
     * @throws BusinessException
     */
    public function insert(Request $request): Response
    {
        if ($request->method() === 'POST') {
            return parent::insert($request);
        }
        return view('charge-user/insert');
    }

    /**
     * 更新
     * @param Request $request
     * @return Response
     * @throws BusinessException
    */
    public function update(Request $request): Response
    {
        if ($request->method() === 'POST') {
            return parent::update($request);
        }
        return view('charge-user/update');
    }

}
