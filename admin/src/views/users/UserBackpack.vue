<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="用户ID">
          <el-input-number v-model="userId" :min="1" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="itemType" label="物品类型" width="120" />
        <el-table-column prop="itemConstId" label="物品ID" width="100" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="createdAt" label="获得时间" width="180" :formatter="dateTimeFormatter" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getUserBackpack } from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'

const userId = ref(1)
const loading = ref(false)
const items = ref<any[]>([])

async function handleSearch() {
  if (!userId.value) return
  loading.value = true
  try {
    const res: any = await getUserBackpack(userId.value)
    items.value = res || []
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
