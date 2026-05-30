<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="用户ID">
          <el-input-number v-model="userId" :min="1" />
        </el-form-item>
        <el-form-item label="流水号">
          <el-input v-model="sn" placeholder="流水号" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="sn" label="流水号" width="220" />
        <el-table-column prop="currencyType" label="货币类型" width="100" />
        <el-table-column prop="amount" label="变动数量" width="100" />
        <el-table-column prop="beforeBalance" label="操作前" width="100" />
        <el-table-column prop="afterBalance" label="操作后" width="100" />
        <el-table-column prop="logType" label="操作类型" width="120" />
        <el-table-column prop="createdAt" label="时间" width="180" :formatter="dateTimeFormatter" />
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="page"
          :page-size="20"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="(p: number) => { page = p; handleSearch() }"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getUserLogs } from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'

const userId = ref(1)
const sn = ref('')
const loading = ref(false)
const logs = ref<any[]>([])
const page = ref(1)
const total = ref(0)

async function handleSearch() {
  if (!userId.value) return
  loading.value = true
  try {
    const res: any = await getUserLogs(userId.value, { sn: sn.value || undefined, page: page.value, pageSize: 20 })
    logs.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 12px; border: none; }
.content-card { border-radius: 12px; border: none; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 16px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
