<template>
  <div class="weekly-return-page">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ formatPoints(summary.totalConsumedPoints) }}</div>
          <div class="stat-label">累计消费总积分</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value success">{{ formatPoints(summary.returnedPoints) }}</div>
          <div class="stat-label">已返还积分</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value warning">{{ formatPoints(summary.pendingReturnPoints) }}</div>
          <div class="stat-label">待返还积分</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value primary">{{ summary.pendingUsers || 0 }}</div>
          <div class="stat-label">待返还用户</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">每周返还周期</span>
            <span class="card-subtitle">查看每周消费统计、已返还和待返还总数</span>
          </div>
          <el-button type="primary" :loading="overviewLoading" @click="loadOverview">刷新</el-button>
        </div>
      </template>

      <el-table
        :data="periods"
        v-loading="overviewLoading"
        stripe
        highlight-current-row
        @row-click="selectPeriod"
      >
        <el-table-column label="统计周期" min-width="190">
          <template #default="{ row }">{{ row.weekStartDate }} 至 {{ row.weekEndDate }}</template>
        </el-table-column>
        <el-table-column prop="activeUsers" label="涉及用户" width="90" align="center" />
        <el-table-column label="消费总积分" width="130" align="right">
          <template #default="{ row }">{{ formatPoints(row.totalConsumedPoints) }}</template>
        </el-table-column>
        <el-table-column label="可返还消费" width="130" align="right">
          <template #default="{ row }">{{ formatPoints(row.eligibleConsumedPoints) }}</template>
        </el-table-column>
        <el-table-column label="排除消费" width="120" align="right">
          <template #default="{ row }">{{ formatPoints(row.excludedConsumedPoints) }}</template>
        </el-table-column>
        <el-table-column label="已返还" width="120" align="right">
          <template #default="{ row }">{{ formatPoints(row.returnedPoints) }}</template>
        </el-table-column>
        <el-table-column label="待返还" width="120" align="right">
          <template #default="{ row }">{{ formatPoints(row.pendingReturnPoints) }}</template>
        </el-table-column>
        <el-table-column label="预计总返还" width="130" align="right">
          <template #default="{ row }">{{ formatPoints(row.expectedReturnPoints) }}</template>
        </el-table-column>
        <el-table-column label="返还进度" width="150">
          <template #default="{ row }">
            <el-progress
              :percentage="returnProgress(row)"
              :stroke-width="8"
              :show-text="false"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="periodStatusType(row.status)" size="small">
              {{ periodStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click.stop="selectPeriod(row)">查看用户</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          :current-page="periodPage"
          :page-size="periodPageSize"
          :total="periodTotal"
          layout="total, prev, pager, next"
          @current-change="handlePeriodPageChange"
        />
      </div>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">用户返还明细</span>
            <span class="card-subtitle">{{ selectedPeriodLabel }}</span>
          </div>
        </div>
      </template>

      <el-form :inline="true" class="filter-form" @submit.prevent="loadAccounts">
        <el-form-item label="用户">
          <el-input
            v-model="accountKeyword"
            placeholder="用户ID / 账号 / 昵称"
            clearable
            style="width: 220px"
            @keyup.enter="searchAccounts"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="accountStatus" placeholder="全部" clearable style="width: 130px">
            <el-option label="返还中" :value="0" />
            <el-option label="已完成" :value="1" />
            <el-option label="已跳过" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="accountLoading" @click="searchAccounts">查询</el-button>
          <el-button @click="resetAccountFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="accounts" v-loading="accountLoading" stripe>
        <el-table-column prop="userId" label="用户ID" width="90" align="center" />
        <el-table-column prop="account" label="账号" min-width="140" />
        <el-table-column prop="nickname" label="昵称" min-width="130" />
        <el-table-column label="激活档位" width="100" align="center">
          <template #default="{ row }">{{ row.activationAmount ? `${row.activationAmount}` : '-' }}</template>
        </el-table-column>
        <el-table-column label="上周消费总积分" width="140" align="right">
          <template #default="{ row }">{{ formatPoints(row.lastWeekConsumedPoints) }}</template>
        </el-table-column>
        <el-table-column label="可返还消费" width="130" align="right">
          <template #default="{ row }">{{ formatPoints(row.eligibleConsumedPoints) }}</template>
        </el-table-column>
        <el-table-column label="排除消费" width="120" align="right">
          <template #default="{ row }">{{ formatPoints(row.excludedConsumedPoints) }}</template>
        </el-table-column>
        <el-table-column label="已返还" width="120" align="right">
          <template #default="{ row }">{{ formatPoints(row.returnedPoints) }}</template>
        </el-table-column>
        <el-table-column label="本周待返还" width="130" align="right">
          <template #default="{ row }">{{ formatPoints(row.currentWeekPendingReturnPoints) }}</template>
        </el-table-column>
        <el-table-column label="下次预计" width="120" align="right">
          <template #default="{ row }">{{ formatPoints(row.nextReturnAmount) }}</template>
        </el-table-column>
        <el-table-column label="已返天数" width="90" align="center">
          <template #default="{ row }">{{ row.paidDays || 0 }}/7</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="accountStatusType(row.status)" size="small">
              {{ accountStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDailyDetail(row)">每日明细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          :current-page="accountPage"
          :page-size="accountPageSize"
          :total="accountTotal"
          layout="total, prev, pager, next"
          @current-change="handleAccountPageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dailyVisible" title="每日返还明细" width="820px" destroy-on-close>
      <template v-if="dailyData">
        <el-descriptions :column="3" border class="detail-descriptions">
          <el-descriptions-item label="用户">
            {{ dailyData.account.nickname || dailyData.account.account || dailyData.account.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="统计周期">
            {{ dailyData.account.weekStartDate }} 至 {{ dailyData.account.weekEndDate }}
          </el-descriptions-item>
          <el-descriptions-item label="上周消费">
            {{ formatPoints(dailyData.account.totalConsumedPoints) }}
          </el-descriptions-item>
          <el-descriptions-item label="已返还">
            {{ formatPoints(dailyData.account.returnedPoints) }}
          </el-descriptions-item>
          <el-descriptions-item label="待返还">
            {{ formatPoints(dailyData.account.pendingReturnPoints) }}
          </el-descriptions-item>
          <el-descriptions-item label="下次预计">
            {{ formatPoints(dailyData.account.nextReturnAmount) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-table :data="dailyData.records" v-loading="dailyLoading" stripe>
          <el-table-column prop="dayIndex" label="天数" width="80" align="center" />
          <el-table-column prop="returnDate" label="返还日期" width="120" />
          <el-table-column label="返还前基数" width="130" align="right">
            <template #default="{ row }">{{ formatPoints(row.baseBeforeReturn) }}</template>
          </el-table-column>
          <el-table-column label="返还积分" width="120" align="right">
            <template #default="{ row }">{{ formatPoints(row.returnAmount) }}</template>
          </el-table-column>
          <el-table-column label="返还后基数" width="130" align="right">
            <template #default="{ row }">{{ formatPoints(row.baseAfterReturn) }}</template>
          </el-table-column>
          <el-table-column label="比例" width="110" align="center">
            <template #default="{ row }">
              {{ formatRate(row.multiplier) }} × {{ formatRate(row.dailyRate) }}
            </template>
          </el-table-column>
          <el-table-column prop="currencyLogSn" label="流水号" min-width="180" />
          <el-table-column prop="createdAt" label="发放时间" width="170" />
        </el-table>
        <el-empty v-if="!dailyLoading && !dailyData.records.length" description="暂无每日返还记录" />
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import request from '@/utils/request'

const overviewLoading = ref(false)
const accountLoading = ref(false)
const dailyLoading = ref(false)

const summary = ref<any>({
  periodCount: 0,
  accountCount: 0,
  pendingUsers: 0,
  totalConsumedPoints: 0,
  returnedPoints: 0,
  pendingReturnPoints: 0,
  expectedReturnPoints: 0,
})
const periods = ref<any[]>([])
const periodPage = ref(1)
const periodPageSize = ref(20)
const periodTotal = ref(0)
const selectedPeriodId = ref<number>(0)
const selectedPeriod = ref<any>(null)

const accounts = ref<any[]>([])
const accountPage = ref(1)
const accountPageSize = ref(20)
const accountTotal = ref(0)
const accountKeyword = ref('')
const accountStatus = ref<number | ''>('')

const dailyVisible = ref(false)
const dailyData = ref<any>(null)

const selectedPeriodLabel = computed(() => {
  if (!selectedPeriod.value) return '默认显示最新返还周期'
  return `${selectedPeriod.value.weekStartDate} 至 ${selectedPeriod.value.weekEndDate}`
})

function formatPoints(value: unknown) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  return num.toFixed(6).replace(/\.?0+$/, '')
}

function formatRate(value: unknown) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0%'
  return `${(num * 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

function periodStatusText(status: number) {
  if (Number(status) === 0) return '返还中'
  if (Number(status) === 1) return '已完成'
  if (Number(status) === 2) return '已跳过'
  return '-'
}

function periodStatusType(status: number) {
  if (Number(status) === 0) return 'warning'
  if (Number(status) === 1) return 'success'
  return 'info'
}

function accountStatusText(status: number) {
  return periodStatusText(status)
}

function accountStatusType(status: number) {
  return periodStatusType(status)
}

function returnProgress(row: any) {
  const expected = Number(row.expectedReturnPoints || 0)
  if (expected <= 0) return 0
  return Math.min(100, Math.round((Number(row.returnedPoints || 0) / expected) * 100))
}

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res: any = await request.get('/weekly-point-returns/overview', {
      params: { page: periodPage.value, pageSize: periodPageSize.value },
    })
    summary.value = res.summary || summary.value
    periods.value = res.periods || []
    periodTotal.value = res.total || 0
    if (!selectedPeriodId.value && periods.value.length) {
      selectPeriod(periods.value[0])
    } else if (selectedPeriodId.value) {
      selectedPeriod.value = periods.value.find((item) => item.id === selectedPeriodId.value) || selectedPeriod.value
    }
  } finally {
    overviewLoading.value = false
  }
}

async function loadAccounts() {
  if (!selectedPeriodId.value) {
    accounts.value = []
    accountTotal.value = 0
    return
  }
  accountLoading.value = true
  try {
    const res: any = await request.get('/weekly-point-returns/accounts', {
      params: {
        periodId: selectedPeriodId.value,
        keyword: accountKeyword.value || undefined,
        status: accountStatus.value === '' ? undefined : accountStatus.value,
        page: accountPage.value,
        pageSize: accountPageSize.value,
      },
    })
    accounts.value = res.list || []
    accountTotal.value = res.total || 0
  } finally {
    accountLoading.value = false
  }
}

function selectPeriod(row: any) {
  selectedPeriodId.value = Number(row.id || 0)
  selectedPeriod.value = row
  accountPage.value = 1
  loadAccounts()
}

function handlePeriodPageChange(page: number) {
  periodPage.value = page
  loadOverview()
}

function handleAccountPageChange(page: number) {
  accountPage.value = page
  loadAccounts()
}

function searchAccounts() {
  accountPage.value = 1
  loadAccounts()
}

function resetAccountFilters() {
  accountKeyword.value = ''
  accountStatus.value = ''
  searchAccounts()
}

async function openDailyDetail(row: any) {
  dailyVisible.value = true
  dailyLoading.value = true
  dailyData.value = null
  try {
    dailyData.value = await request.get(`/weekly-point-returns/accounts/${row.id}/daily`)
  } finally {
    dailyLoading.value = false
  }
}

onMounted(loadOverview)
</script>

<style scoped>
.weekly-return-page { display: flex; flex-direction: column; gap: 16px; }
.stat-card { border: none; border-radius: 12px; }
.stat-value { font-size: 24px; font-weight: 700; color: #1f2937; }
.stat-value.success { color: #16a34a; }
.stat-value.warning { color: #d97706; }
.stat-value.primary { color: #2563eb; }
.stat-label { margin-top: 6px; font-size: 13px; color: #909399; }
.content-card { border: none; border-radius: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.card-title { font-size: 16px; font-weight: 600; color: #303133; }
.card-subtitle { margin-left: 12px; font-size: 13px; color: #909399; }
.filter-form { margin-bottom: 12px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.detail-descriptions { margin-bottom: 16px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 12px 0; }
</style>
