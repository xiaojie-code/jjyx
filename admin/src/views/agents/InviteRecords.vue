<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form inline>
        <el-form-item label="用户名/账号">
          <el-input v-model="searchKeyword" placeholder="输入用户名或账号查看邀请关系" style="width: 240px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadTree">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <template v-if="tree">
      <el-card shadow="hover" class="content-card">
        <el-descriptions title="用户信息" :column="3" border>
          <el-descriptions-item label="ID">{{ tree.user.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ tree.user.nickname }}</el-descriptions-item>
          <el-descriptions-item label="账号">{{ tree.user.account }}</el-descriptions-item>
          <el-descriptions-item label="实时直推人数">
            <el-tag type="success" effect="light">{{ directCount }} 人</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="实时团推人数">
            <el-tag type="warning" effect="light">{{ teamCount }} 人</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <div class="stats-grid">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ directCount }}</div>
          <div class="stat-label">实时直推人数</div>
          <div class="stat-desc">注册时填写当前用户邀请码</div>
        </el-card>
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ teamCount }}</div>
          <div class="stat-label">实时团推人数</div>
          <div class="stat-desc">直推用户邀请的新用户</div>
        </el-card>
      </div>

      <el-card shadow="hover" class="content-card">
        <template #header>
          <span class="card-title">直推用户 - {{ directCount }}人</span>
        </template>
        <el-table :data="directInvitees" stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="account" label="账号" />
          <el-table-column prop="registerTime" label="注册时间" width="180" :formatter="dateTimeFormatter" />
        </el-table>
      </el-card>

      <el-card shadow="hover" class="content-card">
        <template #header>
          <span class="card-title">团推用户 - {{ teamCount }}人</span>
        </template>
        <el-table :data="teamInvitees" stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="account" label="账号" />
          <el-table-column prop="invitedBy" label="直推人ID" />
          <el-table-column prop="registerTime" label="注册时间" width="180" :formatter="dateTimeFormatter" />
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const searchKeyword = ref('')
const tree = ref<any>(null)

const directInvitees = computed(() => tree.value?.directInvitees ?? [])
const teamInvitees = computed(() => tree.value?.teamInvitees ?? tree.value?.indirectInvitees ?? [])
const directCount = computed(() => tree.value?.directCount ?? directInvitees.value.length)
const teamCount = computed(() => tree.value?.teamCount ?? teamInvitees.value.length)

async function loadTree() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) { ElMessage.warning('请输入用户名或账号'); return }
  try {
    tree.value = await request.get('/invite/tree', { params: { keyword } }) as any
  } catch (e) { /* handled */ }
}
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 12px; border: none; }
.content-card { border-radius: 12px; border: none; }
.card-title { font-size: 15px; font-weight: 600; color: #1d2129; }
.stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.stat-card { border-radius: 12px; border: none; }
.stat-value { font-size: 28px; line-height: 1; font-weight: 700; color: #409eff; }
.stat-label { margin-top: 10px; font-size: 14px; font-weight: 600; color: #1d2129; }
.stat-desc { margin-top: 6px; font-size: 12px; color: #86909c; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
