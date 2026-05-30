<template>
  <div class="page-container">
    <el-card shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">转盘抽奖配置</span>
          <el-button type="primary" icon="Plus" @click="showDialog()">新增格子</el-button>
        </div>
      </template>
      <el-alert type="info" :closable="false" style="margin-bottom:16px">
        概率总和应等于1.0，当前总和：{{ totalProbability.toFixed(4) }}
      </el-alert>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="slotIndex" label="序号" width="70" align="center" />
        <el-table-column prop="prizeName" label="奖品名称" width="120" />
        <el-table-column prop="prizeType" label="奖品类型" width="100" />
        <el-table-column prop="prizeAmount" label="奖品数量" width="100" align="right" />
        <el-table-column label="概率" width="100" align="right">
          <template #default="{ row }">{{ (Number(row.probability) * 100).toFixed(2) }}%</template>
        </el-table-column>
        <el-table-column prop="costType" label="消耗类型" width="100" />
        <el-table-column prop="costAmount" label="消耗数量" width="100" align="right" />
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="showDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑格子' : '新增格子'" width="500px" destroy-on-close>
      <el-form :model="form" label-width="90px">
        <el-form-item label="格子序号"><el-input-number v-model="form.slotIndex" :min="1" /></el-form-item>
        <el-form-item label="奖品名称"><el-input v-model="form.prizeName" /></el-form-item>
        <el-form-item label="奖品类型">
          <el-select v-model="form.prizeType" style="width:100%">
            <el-option label="积分" value="points" />
            <el-option label="金币" value="gold" />
            <el-option label="银币" value="silver" />
            <el-option label="物品" value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="奖品数量"><el-input-number v-model="form.prizeAmount" :min="0" /></el-form-item>
        <el-form-item label="中奖概率"><el-input-number v-model="form.probability" :min="0" :max="1" :step="0.01" :precision="4" /></el-form-item>
        <el-form-item label="消耗类型">
          <el-select v-model="form.costType" style="width:100%">
            <el-option label="积分" value="points" />
            <el-option label="金币" value="gold" />
          </el-select>
        </el-form-item>
        <el-form-item label="消耗数量"><el-input-number v-model="form.costAmount" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const list = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)

const defaultForm = { slotIndex: 1, prizeName: '', prizeType: 'points', prizeAmount: 0, probability: 0.1, costType: 'points', costAmount: 10 }
const form = ref({ ...defaultForm })

const totalProbability = computed(() => list.value.reduce((sum, item) => sum + Number(item.probability), 0))

async function loadData() {
  loading.value = true
  try { list.value = (await request.get('/lottery')) as any || [] }
  finally { loading.value = false }
}

function showDialog(row?: any) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.value = { ...row }
  } else {
    isEdit.value = false
    editId.value = 0
    form.value = { ...defaultForm, slotIndex: list.value.length + 1 }
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.prizeName) { ElMessage.warning('请输入奖品名称'); return }
  if (isEdit.value) {
    await request.put(`/lottery/${editId.value}`, form.value)
  } else {
    await request.post('/lottery', form.value)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  loadData()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定删除该格子？', '提示', { type: 'warning' })
  await request.delete(`/lottery/${id}`)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.content-card { border-radius: 12px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 16px; font-weight: 600; color: #1d2129; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
