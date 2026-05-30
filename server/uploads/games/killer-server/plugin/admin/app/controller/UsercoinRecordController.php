<?php

namespace plugin\admin\app\controller;

use support\Request;
use support\Response;
use plugin\admin\app\model\UsercoinRecord;
use plugin\admin\app\controller\Crud;
use support\exception\BusinessException;

/**
 * 金币日志 
 */
class UsercoinRecordController extends Crud
{
    
    /**
     * @var UsercoinRecord
     */
    protected $model = null;

    /**
     * 构造函数
     * @return void
     */
    public function __construct()
    {
        $this->model = new UsercoinRecord;
    }
    
    /**
     * 浏览
     * @return Response
     */
    public function index(): Response
    {
        return view('usercoin-record/index');
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
        return view('usercoin-record/insert');
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
        return view('usercoin-record/update');
    }

}
