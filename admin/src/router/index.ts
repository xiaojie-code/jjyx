import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/LoginPage.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/users',
      children: [
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/users/UserList.vue'),
          meta: { title: '用户管理', icon: 'User' },
        },
        {
          path: 'users/logs',
          name: 'UserLogs',
          component: () => import('@/views/users/UserLogs.vue'),
          meta: { title: '用户流水' },
        },
        {
          path: 'users/activities',
          name: 'UserActivities',
          component: () => import('@/views/users/UserActivities.vue'),
          meta: { title: '用户动态' },
        },
        {
          path: 'users/backpack',
          name: 'UserBackpack',
          component: () => import('@/views/users/UserBackpack.vue'),
          meta: { title: '用户背包' },
        },
        {
          path: 'users/password-reset',
          name: 'PasswordResetRequests',
          component: () => import('@/views/users/PasswordResetRequests.vue'),
          meta: { title: '密码重置申请' },
        },
        {
          path: 'switches',
          name: 'Switches',
          component: () => import('@/views/switches/SwitchList.vue'),
          meta: { title: '功能管理', icon: 'Operation' },
        },
        {
          path: 'lottery',
          name: 'Lottery',
          component: () => import('@/views/lottery/LotteryConfig.vue'),
          meta: { title: '转盘管理', icon: 'TrophyBase' },
        },
        {
          path: 'cdk',
          name: 'CDK',
          component: () => import('@/views/cdk/CdkList.vue'),
          meta: { title: 'CDK管理', icon: 'Ticket' },
        },
        {
          path: 'withdrawals',
          name: 'Withdrawals',
          component: () => import('@/views/withdrawals/WithdrawalList.vue'),
          meta: { title: '提现管理', icon: 'Money' },
        },
        {
          path: 'recharge',
          name: 'RechargeManage',
          component: () => import('@/views/recharge/RechargeManage.vue'),
          meta: { title: '充值管理', icon: 'CreditCard' },
        },
        {
          path: 'agents',
          name: 'Agents',
          component: () => import('@/views/agents/AgentList.vue'),
          meta: { title: '分销管理', icon: 'Share' },
        },
        {
          path: 'matrix',
          name: 'Matrix',
          component: () => import('@/views/matrix/MatrixManage.vue'),
          meta: { title: '推广管理', icon: 'Promotion' },
        },
        {
          path: 'social',
          name: 'SocialManage',
          component: () => import('@/views/social/SocialManage.vue'),
          meta: { title: '社交管理', icon: 'ChatDotRound' },
        },
        {
          path: 'invite-records',
          name: 'InviteRecords',
          component: () => import('@/views/agents/InviteRecords.vue'),
          meta: { title: '邀请关系' },
        },
        {
          path: 'configs',
          name: 'Configs',
          component: () => import('@/views/configs/SystemConfig.vue'),
          meta: { title: '系统配置', icon: 'Setting' },
        },
        {
          path: 'app-versions',
          name: 'AppVersions',
          component: () => import('@/views/app/AppVersionManage.vue'),
          meta: { title: 'App版本管理', icon: 'Upload' },
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const token = getToken()
  if (to.meta.requiresAuth === false) {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router
