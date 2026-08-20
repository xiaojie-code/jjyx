<template>
  <div class="page-container">
    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">所有用户成功提现总额</div>
        <div class="stat-value">¥{{ money(stats.successTotal) }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">当前筛选成功提现</div>
        <div class="stat-value filtered">¥{{ money(stats.filteredSuccessTotal) }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">匹配用户成功提现</div>
        <div class="stat-value user-total">¥{{ money(stats.matchedUserSuccessTotal) }}</div>
        <div class="stat-tip">{{ stats.matchedUserCount ? `匹配 ${stats.matchedUserCount} 个用户` : '输入用户ID/账号/昵称后查看' }}</div>
      </el-card>
    </div>

    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item label="用户">
          <el-input
            v-model="keyword"
            clearable
            placeholder="用户ID/账号/昵称/收款信息"
            style="width: 240px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" clearable placeholder="全部" style="width: 120px">
            <el-option label="待审核" :value="0" />
            <el-option label="通过" :value="1" />
            <el-option label="驳回" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="userId" label="用户ID" width="90" />
        <el-table-column label="昵称" width="140">
          <template #default="{ row }">{{ row.userNickname || row.userAccount || '-' }}</template>
        </el-table-column>
        <el-table-column label="提现金额" width="110">
          <template #default="{ row }">¥{{ money(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="该用户成功提现" width="140">
          <template #default="{ row }">¥{{ money(row.userSuccessWithdrawn) }}</template>
        </el-table-column>
        <el-table-column label="提现方式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.paymentMethod === 'alipay' ? 'primary' : 'success'" size="small">
              {{ row.paymentMethod === 'alipay' ? '支付宝' : row.paymentMethod === 'bank' ? '银行卡' : row.paymentMethod || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="收款人" width="110" />
        <el-table-column prop="accountNumber" label="收款账号" width="180" show-overflow-tooltip />
        <el-table-column label="铜币消耗" width="110">
          <template #default="{ row }">
            {{ Number(row.copperCost || 0) }}
            <span v-if="row.copperRefundLogId" class="text-muted">已退回</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
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
const keyword = ref('')
const status = ref<number | ''>('')
const dateRange = ref<[string, string] | null>(null)
const stats = ref({
  successTotal: 0,
  filteredSuccessTotal: 0,
  matchedUserSuccessTotal: 0,
  matchedUserCount: 0,
})

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

async function loadData() {
  loading.value = true
  try {
    const res: any = await request.get('/withdrawals', {
      params: {
        keyword: keyword.value || undefined,
        status: status.value === '' ? undefined : status.value,
        startDate: dateRange.value?.[0],
        endDate: dateRange.value?.[1],
      },
    })
    list.value = res.list || []
    stats.value = {
      successTotal: Number(res.stats?.successTotal || 0),
      filteredSuccessTotal: Number(res.stats?.filteredSuccessTotal || 0),
      matchedUserSuccessTotal: Number(res.stats?.matchedUserSuccessTotal || 0),
      matchedUserCount: Number(res.stats?.matchedUserCount || 0),
    }
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  keyword.value = ''
  status.value = ''
  dateRange.value = null
  loadData()
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
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.stat-card,
.search-card,
.content-card { border-radius: 12px; border: none; }
.stat-label { color: #606266; font-size: 14px; margin-bottom: 10px; }
.stat-value { font-size: 28px; font-weight: 700; color: #303133; }
.stat-value.filtered { color: #409eff; }
.stat-value.user-total { color: #67c23a; }
.stat-tip { margin-top: 6px; color: #909399; font-size: 12px; }
.text-muted { color: #909399; font-size: 13px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 14px 0; }
@media (max-width: 1100px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
