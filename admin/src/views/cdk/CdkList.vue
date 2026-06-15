<template>
  <div class="page-container">
    <el-tabs v-model="activeTab" class="custom-tabs">
      <el-tab-pane label="CDK列表" name="list">
        <el-card shadow="hover" class="content-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">CDK列表</span>
              <el-button type="primary" icon="Plus" @click="showGenerateDialog">批量生成</el-button>
            </div>
          </template>
          <el-form :inline="true" @submit.prevent="loadCdks" style="margin-bottom: 16px">
            <el-form-item label="状态">
              <el-select v-model="filterStatus" placeholder="全部" clearable style="width:120px">
                <el-option label="未使用" :value="0" />
                <el-option label="已使用" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item label="激活码档位">
              <el-select v-model="filterActivationAmount" placeholder="全部" clearable style="width:150px">
                <el-option label="充值500激活码" :value="500" />
                <el-option label="充值2000激活码" :value="2000" />
              </el-select>
            </el-form-item>
            <el-form-item><el-button type="primary" @click="loadCdks">查询</el-button></el-form-item>
          </el-form>
          <el-table :data="cdkList" v-loading="cdkLoading" stripe>
            <el-table-column prop="id" label="ID" width="60" align="center" />
            <el-table-column prop="code" label="兑换码" width="200">
              <template #default="{ row }">
                <el-text copyable>{{ row.code }}</el-text>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="150" align="center">
              <template #default="{ row }">
                <el-tag :type="activationTagType(row.activationAmount)">
                  {{ activationLabel(row.activationAmount) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="激活码档位" width="110" align="center">
              <template #default="{ row }">
                {{ activationAmountText(row.activationAmount) }}
              </template>
            </el-table-column>
            <el-table-column label="奖励内容">
              <template #default="{ row }">
                <span v-if="row.itemsJson">{{ JSON.stringify(row.itemsJson) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status===0?'info':'success'" size="small">{{ row.status===0?'未使用':'已使用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="usedBy" label="使用者" width="80" align="center" />
            <el-table-column prop="createdAt" label="生成时间" width="180" :formatter="dateTimeFormatter" />
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button v-if="row.status===1" size="small" type="warning" link @click="toggleCdkStatus(row, 0)">恢复</el-button>
                <el-button v-if="row.status===0" size="small" type="danger" link @click="toggleCdkStatus(row, 1)">禁用</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination :current-page="cdkPage" :page-size="20" :total="cdkTotal" layout="total,prev,pager,next" @current-change="(p:number)=>{cdkPage=p;loadCdks()}" />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="CDK类型" name="types">
        <el-card shadow="hover" class="content-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">CDK类型管理</span>
              <el-button type="primary" icon="Plus" @click="showTypeDialog()">新增类型</el-button>
            </div>
          </template>
          <el-table :data="typeList" stripe>
            <el-table-column prop="id" label="ID" width="60" align="center" />
            <el-table-column label="类型名称" width="200">
              <template #default="{ row }">{{ activationLabel(row.activationAmount) }}</template>
            </el-table-column>
            <el-table-column label="激活码档位" width="150" align="center">
              <template #default="{ row }">
                <el-tag v-if="Number(row.activationAmount) === 500" type="warning">充值500激活码</el-tag>
                <el-tag v-else-if="Number(row.activationAmount) === 2000" type="success">充值2000激活码</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="showTypeDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 生成弹窗 -->
    <el-dialog v-model="genVisible" title="批量生成CDK" width="450px" destroy-on-close>
      <el-form :model="genForm" label-width="90px">
        <el-form-item label="激活码档位" required>
          <el-select v-model="genForm.activationAmount" style="width:100%">
            <el-option label="充值500激活码" :value="500" />
            <el-option label="充值2000激活码" :value="2000" />
          </el-select>
        </el-form-item>
        <el-form-item label="生成数量"><el-input-number v-model="genForm.count" :min="1" :max="1000" /></el-form-item>
        <el-form-item label="奖励配置">
          <el-input v-model="genForm.itemsJson" type="textarea" :rows="3" placeholder='[{"item":"points","amount":100}]' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="genVisible=false">取消</el-button>
        <el-button type="primary" @click="handleGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 类型弹窗 -->
    <el-dialog v-model="typeDialogVisible" :title="typeIsEdit?'编辑类型':'新增类型'" width="400px" destroy-on-close>
      <el-form :model="typeForm" label-width="80px">
        <el-form-item label="名称"><el-input v-model="typeForm.name" /></el-form-item>
        <el-form-item label="激活档位" required>
          <el-select v-model="typeForm.activationAmount" style="width:100%">
            <el-option label="充值500激活码" :value="500" />
            <el-option label="充值2000激活码" :value="2000" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="typeForm.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSaveType">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const activeTab = ref('list')

// CDK列表
const cdkLoading = ref(false)
const cdkList = ref<any[]>([])
const cdkPage = ref(1)
const cdkTotal = ref(0)
const filterStatus = ref<number | undefined>(undefined)
const filterActivationAmount = ref<number | undefined>(undefined)

// CDK类型
const typeList = ref<any[]>([])
const typeDialogVisible = ref(false)
const typeIsEdit = ref(false)
const typeEditId = ref(0)
const typeForm = ref({ name: '', description: '', activationAmount: 2000 })

// 生成
const genVisible = ref(false)
const genForm = ref({ activationAmount: 2000, count: 10, itemsJson: '[{"item":"points","amount":100}]' })

async function loadCdks() {
  cdkLoading.value = true
  try {
    const res: any = await request.get('/cdk/list', {
      params: {
        page: cdkPage.value,
        pageSize: 20,
        status: filterStatus.value,
        activationAmount: filterActivationAmount.value,
      },
    })
    cdkList.value = res.list || res || []
    cdkTotal.value = res.total || 0
  } catch {
    cdkList.value = []
    cdkTotal.value = 0
  } finally { cdkLoading.value = false }
}

async function loadTypes() {
  typeList.value = (await request.get('/cdk/types')) as any || []
}

function showGenerateDialog() {
  genForm.value = { activationAmount: 2000, count: 10, itemsJson: '[{"item":"points","amount":100}]' }
  genVisible.value = true
}

async function handleGenerate() {
  try {
    if (![500, 2000].includes(Number(genForm.value.activationAmount))) {
      ElMessage.warning('请选择激活码档位')
      return
    }
    await request.post('/cdk/generate', {
      activationAmount: genForm.value.activationAmount,
      count: genForm.value.count,
      itemsJson: JSON.parse(genForm.value.itemsJson),
    })
    ElMessage.success(`成功生成 ${genForm.value.count} 个${genForm.value.activationAmount}元激活码`)
    genVisible.value = false
    loadTypes()
    loadCdks()
  } catch { ElMessage.error('生成失败，请检查奖励JSON格式') }
}

async function toggleCdkStatus(row: any, status: number) {
  await request.put(`/cdk/${row.id}/status`, { status })
  ElMessage.success('状态已更新')
  loadCdks()
}

function showTypeDialog(row?: any) {
  if (row) {
    typeIsEdit.value = true; typeEditId.value = row.id
    typeForm.value = { name: row.name, description: row.description || '', activationAmount: Number(row.activationAmount || 2000) }
  } else {
    typeIsEdit.value = false; typeEditId.value = 0
    typeForm.value = { name: '', description: '', activationAmount: 2000 }
  }
  typeDialogVisible.value = true
}

async function handleSaveType() {
  if (!typeForm.value.name) { ElMessage.warning('请输入类型名称'); return }
  if (![500, 2000].includes(Number(typeForm.value.activationAmount))) {
    ElMessage.warning('请选择激活档位')
    return
  }
  if (typeIsEdit.value) {
    await request.put(`/cdk/types/${typeEditId.value}`, typeForm.value)
  } else {
    await request.post('/cdk/types', typeForm.value)
  }
  ElMessage.success('保存成功')
  typeDialogVisible.value = false
  loadTypes()
}

onMounted(() => { loadCdks(); loadTypes() })

function activationLabel(amount: unknown) {
  const value = Number(amount)
  if (value === 500) return '充值500激活码'
  if (value === 2000) return '充值2000激活码'
  return '未配置档位'
}

function activationAmountText(amount: unknown) {
  const value = Number(amount)
  return [500, 2000].includes(value) ? `${value}元` : '-'
}

function activationTagType(amount: unknown) {
  return Number(amount) === 500 ? 'warning' : 'success'
}
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.custom-tabs :deep(.el-tabs__header) { margin-bottom: 16px; }
.content-card { border-radius: 12px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 16px; font-weight: 600; color: #1d2129; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 16px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
