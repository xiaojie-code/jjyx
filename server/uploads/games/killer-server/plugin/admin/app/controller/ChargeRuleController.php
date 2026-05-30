<?php

namespace plugin\admin\app\controller;

use support\Request;
use support\Response;
use plugin\admin\app\model\ChargeRule;
use plugin\admin\app\controller\Crud;
use support\exception\BusinessException;

/**
 * 充值规则 
 */
class ChargeRuleController extends Crud
{
    
    /**
     * @var ChargeRule
     */
    protected $model = null;

    /**
     * 构造函数
     * @return void
     */
    public function __construct()
    {
        $this->model = new ChargeRule;
    }
    
    /**
     * 浏览
     * @return Response
     */
    public function index(): Response
    {
        return view('charge-rule/index');
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
        return view('charge-rule/insert');
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
        return view('charge-rule/update');
    }

}
