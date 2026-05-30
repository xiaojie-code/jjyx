<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item label="代理ID">
          <el-input v-model="searchId" placeholder="输入代理ID" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="agents" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="level" label="阶级" width="80" />
        <el-table-column prop="pointsEarned" label="积分收益" width="100" />
        <el-table-column prop="pointsConsumed" label="积分消耗" width="100" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column prop="createdAt" label="注册时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewUsers(row.id)">查看旗下</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="usersVisible" title="旗下用户" width="600px">
      <el-table :data="subUsers" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="createdAt" label="注册时间" :formatter="dateTimeFormatter" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const loading = ref(false)
const agents = ref<any[]>([])
const searchId = ref('')
const usersVisible = ref(false)
const subUsers = ref<any[]>([])

async function loadData() {
  loading.value = true
  try { agents.value = (await request.get('/agents', { params: { id: searchId.value || undefined } })) as any || [] }
  finally { loading.value = false }
}

async function viewUsers(agentId: number) {
  subUsers.value = (await request.get(`/agents/${agentId}/users`)) as any || []
  usersVisible.value = true
}

onMounted(loadData)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 12px; border: none; }
.content-card { border-radius: 12px; border: none; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
