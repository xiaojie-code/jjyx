<template>
  <div class="page-container">
    <el-card shadow="hover" class="content-card">
      <div class="config-toolbar">
        <el-tabs v-model="activeCategory" class="category-tabs">
          <el-tab-pane
            v-for="category in categories"
            :key="category.key"
            :name="category.key"
            :label="`${category.name} ${category.count}`"
          />
        </el-tabs>
        <el-input
          v-model="keyword"
          class="config-search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索配置名称、键或说明"
        />
      </div>

      <el-table :data="filteredConfigs" v-loading="loading" stripe>
        <el-table-column prop="categoryName" label="所属模块" width="120">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">{{ row.categoryName }}</el-tag>
          </template>
        </el-table-column>
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
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

interface ConfigItem {
  configKey: string
  configName: string
  configValue: string
  description: string
  category: string
  categoryName: string
}

const categoryOptions = [
  { key: 'points', name: '积分返还' },
  { key: 'currency', name: '币种交易' },
  { key: 'game', name: '游戏奖励' },
  { key: 'recharge', name: '充值管理' },
  { key: 'meeting', name: '会议社交' },
  { key: 'ai', name: '云AI' },
  { key: 'other', name: '其他配置' },
]

const configs = ref<ConfigItem[]>([])
const loading = ref(false)
const editing = ref('')
const editValue = ref('')
const activeCategory = ref('all')
const keyword = ref('')

const categories = computed(() => [
  { key: 'all', name: '全部', count: configs.value.length },
  ...categoryOptions.map((category) => ({
    ...category,
    count: configs.value.filter((item) => item.category === category.key).length,
  })),
])

const filteredConfigs = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return configs.value.filter((item) => {
    if (activeCategory.value !== 'all' && item.category !== activeCategory.value) return false
    if (!query) return true
    return [item.configName, item.configKey, item.configValue, item.description]
      .some((value) => String(value || '').toLowerCase().includes(query))
  })
})

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
.content-card { border-radius: 8px; border: none; }
.config-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
.category-tabs { flex: 1; min-width: 0; }
.config-search { width: 280px; flex: 0 0 280px; }
:deep(.category-tabs .el-tabs__header) { margin-bottom: 0; }
:deep(.category-tabs .el-tabs__content) { display: none; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }

@media (max-width: 900px) {
  .config-toolbar { flex-direction: column; gap: 12px; }
  .config-search { width: 100%; flex-basis: auto; }
}
</style>
