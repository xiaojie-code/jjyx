<template>
  <div class="duration-page">
    <section class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">累计游戏时长</div>
        <div class="summary-value">{{ formatDuration(overview.totalSeconds) }}</div>
        <div class="summary-meta">{{ overview.startDate }} 至 {{ overview.endDate }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">活跃用户</div>
        <div class="summary-value blue">{{ overview.activeUsers || 0 }}</div>
        <div class="summary-meta">涉及 {{ overview.activeGames || 0 }} 个游戏</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">游戏会话</div>
        <div class="summary-value">{{ overview.sessionCount || 0 }}</div>
        <div class="summary-meta">进入游戏产生的会话数</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">已奖励铜币</div>
        <div class="summary-value green">{{ formatNumber(overview.rewardedCopper) }}</div>
        <div class="summary-meta">
          每 {{ overview.minutesPerCoin || 15 }} 分钟 1 个，每日最多 {{ overview.dailyMax || 2 }} 个
        </div>
      </div>
    </section>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">用户游戏时长</div>
            <div class="card-subtitle">按用户和日期汇总，可查看每次进入游戏的时长与铜币奖励记录</div>
          </div>
          <el-button :icon="Setting" @click="goToConfig">奖励配置</el-button>
        </div>
      </template>

      <el-form :inline="true" class="filter-form" @submit.prevent="search">
        <el-form-item label="统计日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :clearable="false"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item label="用户">
          <el-input
            v-model="keyword"
            placeholder="用户ID / 账号 / 昵称"
            clearable
            style="width: 210px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="游戏">
          <el-select v-model="gameId" clearable placeholder="全部游戏" style="width: 170px">
            <el-option
              v-for="game in games"
              :key="game.id"
              :label="game.name"
              :value="game.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" :loading="loading" @click="search">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="playDate" label="日期" width="115" />
        <el-table-column prop="userId" label="用户ID" width="90" align="center" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-account">{{ row.account || '-' }}</span>
              <span class="user-nickname">{{ row.nickname || '未设置昵称' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="参与游戏" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">{{ row.gameNames || '-' }}</template>
        </el-table-column>
        <el-table-column label="累计时长" width="140" align="right">
          <template #default="{ row }">
            <span class="duration-text">{{ formatDuration(row.totalSeconds) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sessionCount" label="会话数" width="90" align="center" />
        <el-table-column prop="gameCount" label="游戏数" width="90" align="center" />
        <el-table-column label="奖励铜币" width="105" align="right">
          <template #default="{ row }">
            <el-tag v-if="Number(row.rewardedCopper) > 0" type="success" size="small">
              +{{ formatNumber(row.rewardedCopper) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="latestSessionAt" label="最后进入时间" width="170" />
        <el-table-column label="操作" width="105" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="openSessions(row)">会话明细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" :size="'min(760px, 94vw)'" destroy-on-close>
      <template #header>
        <div>
          <div class="drawer-title">游戏会话明细</div>
          <div class="drawer-subtitle">
            {{ selectedRow?.account || '-' }} · {{ selectedRow?.nickname || '未设置昵称' }} ·
            {{ selectedRow?.playDate || '-' }}
          </div>
        </div>
      </template>

      <div class="detail-summary">
        <div>
          <span>累计时长</span>
          <strong>{{ formatDuration(sessionSummary.totalSeconds) }}</strong>
        </div>
        <div>
          <span>参与游戏</span>
          <strong>{{ sessionSummary.gameCount || 0 }}</strong>
        </div>
        <div>
          <span>奖励铜币</span>
          <strong>{{ formatNumber(sessionSummary.rewardedCopper) }}</strong>
        </div>
      </div>

      <el-table :data="sessions" v-loading="sessionLoading" stripe>
        <el-table-column prop="gameName" label="游戏" min-width="130" />
        <el-table-column label="时长" width="110" align="right">
          <template #default="{ row }">{{ formatDuration(row.durationSeconds) }}</template>
        </el-table-column>
        <el-table-column label="铜币" width="80" align="right">
          <template #default="{ row }">
            {{ Number(row.copperReward) > 0 ? `+${formatNumber(row.copperReward)}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="进入时间" width="165" />
        <el-table-column label="流水" min-width="125" show-overflow-tooltip>
          <template #default="{ row }">{{ row.currencyLogSn || '-' }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper compact">
        <el-pagination
          v-model:current-page="sessionPage"
          :page-size="sessionPageSize"
          :total="sessionTotal"
          layout="total, prev, pager, next"
          @current-change="loadSessions"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Search, Setting, View } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

function localDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function defaultDateRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return [localDate(start), localDate(end)]
}

const dateRange = ref<string[]>(defaultDateRange())
const keyword = ref('')
const gameId = ref<number | ''>('')
const games = ref<any[]>([])
const rows = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const overview = reactive({
  startDate: '',
  endDate: '',
  activeUsers: 0,
  activeGames: 0,
  sessionCount: 0,
  totalSeconds: 0,
  rewardedCopper: 0,
  minutesPerCoin: 15,
  dailyMax: 2,
})

const drawerVisible = ref(false)
const selectedRow = ref<any>(null)
const sessions = ref<any[]>([])
const sessionLoading = ref(false)
const sessionPage = ref(1)
const sessionPageSize = 20
const sessionTotal = ref(0)
const sessionSummary = reactive({ totalSeconds: 0, rewardedCopper: 0, gameCount: 0 })

function queryParams() {
  return {
    startDate: dateRange.value?.[0],
    endDate: dateRange.value?.[1],
    keyword: keyword.value || undefined,
    gameId: gameId.value || undefined,
  }
}

function formatDuration(value: unknown) {
  const totalSeconds = Math.max(0, Math.floor(Number(value || 0)))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}小时${minutes}分`
  if (minutes > 0) return `${minutes}分${seconds}秒`
  return `${seconds}秒`
}

function formatNumber(value: unknown) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

async function loadGames() {
  games.value = (await request.get('/game-duration/games')) || []
}

async function loadData() {
  loading.value = true
  try {
    const params = queryParams()
    const [overviewResult, dailyResult]: any[] = await Promise.all([
      request.get('/game-duration/overview', { params }),
      request.get('/game-duration/daily', {
        params: { ...params, page: page.value, pageSize: pageSize.value },
      }),
    ])
    Object.assign(overview, overviewResult || {})
    rows.value = dailyResult?.list || []
    total.value = Number(dailyResult?.total || 0)
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  loadData()
}

function resetFilters() {
  dateRange.value = defaultDateRange()
  keyword.value = ''
  gameId.value = ''
  search()
}

function goToConfig() {
  router.push('/configs')
}

function openSessions(row: any) {
  selectedRow.value = row
  sessionPage.value = 1
  drawerVisible.value = true
  loadSessions()
}

async function loadSessions() {
  if (!selectedRow.value) return
  sessionLoading.value = true
  try {
    const result: any = await request.get(
      `/game-duration/users/${selectedRow.value.userId}/sessions`,
      {
        params: {
          date: selectedRow.value.playDate,
          gameId: gameId.value || undefined,
          page: sessionPage.value,
          pageSize: sessionPageSize,
        },
      },
    )
    sessions.value = result?.list || []
    sessionTotal.value = Number(result?.total || 0)
    Object.assign(sessionSummary, result?.summary || {})
  } finally {
    sessionLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadGames(), loadData()])
})
</script>

<style scoped>
.duration-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-item {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #ffffff;
}

.summary-label,
.summary-meta,
.card-subtitle,
.drawer-subtitle {
  color: #909399;
  font-size: 13px;
}

.summary-value {
  margin-top: 8px;
  color: #303133;
  font-size: 25px;
  font-weight: 700;
  line-height: 1.2;
}

.summary-value.blue { color: #2563eb; }
.summary-value.green { color: #16a34a; }
.summary-meta { margin-top: 7px; line-height: 1.4; }

.content-card {
  border-radius: 6px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-title,
.drawer-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.card-subtitle,
.drawer-subtitle { margin-top: 5px; }
.filter-form { margin-bottom: 8px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.pagination-wrapper.compact { margin-top: 14px; }

.user-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.user-account { color: #303133; font-weight: 600; }
.user-nickname { color: #909399; font-size: 12px; }
.duration-text { color: #2563eb; font-weight: 600; }

.detail-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #ebeef5;
}

.detail-summary > div {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px;
  background: #fff;
}

.detail-summary span { color: #909399; font-size: 12px; }
.detail-summary strong { color: #303133; font-size: 18px; }

:deep(.el-table th.el-table__cell) {
  background: #f7f8fa;
  color: #606266;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 700px) {
  .summary-grid { grid-template-columns: 1fr; }
  .card-header { align-items: flex-start; flex-direction: column; }
  .detail-summary { grid-template-columns: 1fr; }
}
</style>
