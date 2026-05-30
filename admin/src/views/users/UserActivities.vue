<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="用户ID">
          <el-input-number v-model="userId" :min="1" />
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="type" placeholder="动态类型" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="activities" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="logContent" label="日志内容" />
        <el-table-column prop="createdAt" label="时间" width="180" :formatter="dateTimeFormatter" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getUserActivities } from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'

const userId = ref(1)
const type = ref('')
const loading = ref(false)
const activities = ref<any[]>([])

async function handleSearch() {
  if (!userId.value) return
  loading.value = true
  try {
    const res: any = await getUserActivities(userId.value, { type: type.value || undefined })
    activities.value = res.list || res || []
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 12px; border: none; }
.content-card { border-radius: 12px; border: none; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
