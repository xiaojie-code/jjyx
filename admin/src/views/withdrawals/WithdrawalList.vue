<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="amount" label="提现金额" width="100">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column label="提现方式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.paymentMethod === 'alipay' ? 'primary' : 'success'" size="small">
              {{ row.paymentMethod === 'alipay' ? '支付宝' : row.paymentMethod === 'bank' ? '银行卡' : row.paymentMethod || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="收款人" width="100" />
        <el-table-column prop="accountNumber" label="收款账号" width="180" show-overflow-tooltip />
        <el-table-column prop="content" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'warning' : row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 0 ? '待审核' : row.status === 1 ? '通过' : '驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button size="small" type="success" link @click="handleReview(row.id, true)">通过</el-button>
              <el-button size="small" type="danger" link @click="handleReview(row.id, false)">驳回</el-button>
            </template>
            <span v-else class="text-muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const dateRange = ref<[Date, Date] | null>(null)

async function loadData() {
  loading.value = true
  try {
    const res: any = await request.get('/withdrawals', { params: {} })
    list.value = res.list || res || []
  } finally {
    loading.value = false
  }
}

async function handleReview(id: number, approve: boolean) {
  const action = approve ? '通过' : '驳回'
  await ElMessageBox.confirm(`确定${action}该提现申请？`, '提示')
  await request.put(`/withdrawals/${id}`, { approve })
  ElMessage.success(`${action}成功`)
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 12px; border: none; }
.content-card { border-radius: 12px; border: none; }
.text-muted { color: #909399; font-size: 13px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
</style>
