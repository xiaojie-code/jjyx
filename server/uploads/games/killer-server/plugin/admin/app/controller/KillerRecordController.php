<?php

namespace plugin\admin\app\controller;

use support\Request;
use support\Response;
use plugin\admin\app\model\KillerRecord;
use plugin\admin\app\controller\Crud;
use support\exception\BusinessException;

/**
 * 杀手记录 
 */
class KillerRecordController extends Crud
{
    
    /**
     * @var KillerRecord
     */
    protected $model = null;

    /**
     * 构造函数
     * @return void
     */
    public function __construct()
    {
        $this->model = new KillerRecord;
    }
    
    /**
     * 浏览
     * @return Response
     */
    public function index(): Response
    {
        return view('killer-record/index');
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
        return view('killer-record/insert');
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
        return view('killer-record/update');
    }

}
