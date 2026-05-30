<template>
  <div class="page-container">
    <el-card shadow="hover" class="content-card">
      <el-table :data="configs" v-loading="loading" stripe>
        <el-table-column prop="configName" label="配置名称" width="200" />
        <el-table-column prop="configKey" label="配置键" width="240" />
        <el-table-column label="配置值" width="200">
          <template #default="{ row }">
            <el-input
              v-if="editing === row.configKey"
              v-model="editValue"
              size="small"
              @keyup.enter="saveConfig(row.configKey)"
            />
            <span v-else>{{ row.configValue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button v-if="editing === row.configKey" type="primary" link @click="saveConfig(row.configKey)">保存</el-button>
            <el-button v-if="editing === row.configKey" link @click="editing = ''">取消</el-button>
            <el-button v-else type="primary" link @click="startEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

interface ConfigItem { configKey: string; configName: string; configValue: string; description: string }

const configs = ref<ConfigItem[]>([])
const loading = ref(false)
const editing = ref('')
const editValue = ref('')

async function loadConfigs() {
  loading.value = true
  try { configs.value = (await request.get('/configs') as any) || [] }
  finally { loading.value = false }
}

function startEdit(row: ConfigItem) { editing.value = row.configKey; editValue.value = row.configValue }

async function saveConfig(key: string) {
  await request.put(`/configs/${key}`, { value: editValue.value })
  ElMessage.success('配置已更新')
  editing.value = ''
  loadConfigs()
}

onMounted(loadConfigs)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.content-card { border-radius: 12px; border: none; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
