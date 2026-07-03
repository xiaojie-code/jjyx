<template>
  <el-container class="layout-container">
    <el-aside width="240px" class="layout-aside">
      <div class="logo">
        <span class="logo-icon">🎮</span>
        <span class="logo-text">竞技游戏平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#1d1e3a"
        text-color="#a3a6b7"
        active-text-color="#ffffff"
        :default-openeds="['user-group']"
      >
        <el-sub-menu index="user-group">
          <template #title>
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </template>
          <el-menu-item index="/users">用户列表</el-menu-item>
          <el-menu-item index="/users/logs">用户流水</el-menu-item>
          <el-menu-item index="/users/activities">用户动态</el-menu-item>
          <el-menu-item index="/users/backpack">用户背包</el-menu-item>
          <el-menu-item index="/users/password-reset">密码重置申请</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/switches">
          <el-icon><Operation /></el-icon>
          <span>功能管理</span>
        </el-menu-item>
        <el-menu-item index="/lottery">
          <el-icon><TrophyBase /></el-icon>
          <span>转盘管理</span>
        </el-menu-item>
        <el-menu-item index="/cdk">
          <el-icon><Ticket /></el-icon>
          <span>CDK管理</span>
        </el-menu-item>
        <el-menu-item index="/withdrawals">
          <el-icon><Money /></el-icon>
          <span>提现管理</span>
        </el-menu-item>
        <el-menu-item index="/recharge">
          <el-icon><CreditCard /></el-icon>
          <span>充值管理</span>
        </el-menu-item>
        <el-menu-item index="/assets">
          <el-icon><Wallet /></el-icon>
          <span>资产包管理</span>
        </el-menu-item>
        <el-menu-item index="/agents">
          <el-icon><Share /></el-icon>
          <span>分销管理</span>
        </el-menu-item>
        <el-menu-item index="/matrix">
          <el-icon><Promotion /></el-icon>
          <span>推广管理</span>
        </el-menu-item>
        <el-menu-item index="/reward-backfill">
          <el-icon><Coin /></el-icon>
          <span>奖励补账</span>
        </el-menu-item>
        <el-menu-item index="/weekly-point-returns">
          <el-icon><DataLine /></el-icon>
          <span>积分返还统计</span>
        </el-menu-item>
        <el-menu-item index="/social">
          <el-icon><ChatDotRound /></el-icon>
          <span>社交管理</span>
        </el-menu-item>
        <el-menu-item index="/invite-records">
          <el-icon><Connection /></el-icon>
          <span>邀请关系</span>
        </el-menu-item>
        <el-menu-item index="/configs">
          <el-icon><Setting /></el-icon>
          <span>系统配置</span>
        </el-menu-item>
        <el-menu-item index="/app-versions">
          <el-icon><Upload /></el-icon>
          <span>App版本管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <span class="header-title">{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" style="background:#667eea" />
              <span class="user-name">管理员</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const menuItems = [
  { path: '/users', title: '用户列表' },
  { path: '/users/logs', title: '用户流水' },
  { path: '/users/activities', title: '用户动态' },
  { path: '/users/backpack', title: '用户背包' },
  { path: '/users/password-reset', title: '密码重置申请' },
  { path: '/switches', title: '功能管理' },
  { path: '/lottery', title: '转盘管理' },
  { path: '/cdk', title: 'CDK管理' },
  { path: '/withdrawals', title: '提现管理' },
  { path: '/recharge', title: '充值管理' },
  { path: '/assets', title: '资产包管理' },
  { path: '/agents', title: '分销管理' },
  { path: '/matrix', title: '推广管理' },
  { path: '/reward-backfill', title: '奖励补账' },
  { path: '/weekly-point-returns', title: '积分返还统计' },
  { path: '/social', title: '社交管理' },
  { path: '/invite-records', title: '邀请关系' },
  { path: '/configs', title: '系统配置' },
  { path: '/app-versions', title: 'App版本管理' },
]

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => {
  const item = menuItems.find((m) => m.path === route.path)
  return item?.title ?? '管理后台'
})

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.layout-aside {
  background: linear-gradient(180deg, #1d1e3a 0%, #2b2d4e 100%);
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}
.layout-aside::-webkit-scrollbar {
  width: 0;
}
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.logo-icon {
  font-size: 28px;
}
.logo-text {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1px;
}
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 0 24px;
  height: 64px;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.user-info:hover {
  background: #f5f7fa;
}
.user-name {
  font-size: 15px;
  color: #4e5969;
}
.layout-main {
  background: #f5f7fa;
  padding: 20px;
}

:deep(.el-menu) {
  border-right: none;
  padding: 8px;
}
:deep(.el-menu-item) {
  border-radius: 8px;
  margin: 2px 0;
  height: 44px;
  line-height: 44px;
}
:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
}
:deep(.el-sub-menu .el-sub-menu__title) {
  border-radius: 8px;
  height: 44px;
  line-height: 44px;
}
</style>
