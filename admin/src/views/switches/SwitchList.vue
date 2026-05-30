<template>
  <div class="page-container">
    <el-card shadow="hover" class="content-card">
      <el-table :data="switches" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="featureKey" label="功能标识" width="160" />
        <el-table-column prop="featureName" label="功能名称" width="160" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              active-text="启用"
              inactive-text="禁用"
              @change="(val: boolean) => handleToggle(row.id, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" :formatter="dateTimeFormatter" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const loading = ref(false)
const switches = ref<any[]>([])

async function loadData() {
  loading.value = true
  try {
    const res: any = await request.get('/switches')
    switches.value = res || []
  } finally {
    loading.value = false
  }
}

async function handleToggle(id: number, enabled: boolean) {
  await request.put(`/switches/${id}`, { status: enabled ? 1 : 0 })
  ElMessage.success(enabled ? '已启用' : '已禁用')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.content-card { border-radius: 12px; border: none; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
