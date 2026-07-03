<template>
  <div class="page-container">
    <el-card shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <span>奖励补账</span>
          <el-tag type="warning" effect="plain">先试算，再执行</el-tag>
        </div>
      </template>

      <el-form :model="form" label-width="110px" class="backfill-form">
        <el-form-item label="补账时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            range-separator="至"
            clearable
          />
        </el-form-item>

        <el-form-item label="补账内容">
          <el-checkbox v-model="form.game">游戏流水奖励</el-checkbox>
          <el-checkbox v-model="form.weekly">每周积分返还</el-checkbox>
        </el-form-item>

        <el-form-item label="单次数量">
          <el-input-number v-model="form.limit" :min="100" :max="20000" :step="500" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="runBackfill(true)">试算</el-button>
          <el-button type="danger" :loading="loading" @click="confirmRun">执行补发</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="result" shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ result.dryRun ? '试算结果' : '执行结果' }}</span>
          <el-tag :type="result.dryRun ? 'info' : 'success'" effect="plain">
            {{ result.dryRun ? '未改动积分' : '已执行' }}
          </el-tag>
        </div>
      </template>

      <div class="result-grid">
        <div v-if="result.game" class="result-block">
          <h3>游戏流水奖励</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="扫描游戏记录">{{ result.game.scannedGameRecords || 0 }}</el-descriptions-item>
            <el-descriptions-item label="可补流水">{{ result.game.candidates || 0 }}</el-descriptions-item>
            <el-descriptions-item label="新增流水">{{ result.game.insertedTurnovers || 0 }}</el-descriptions-item>
            <el-descriptions-item label="流水金额">{{ formatAmount(result.game.turnoverAmount) }}</el-descriptions-item>
            <el-descriptions-item label="奖励笔数">{{ result.game.rewardCount || 0 }}</el-descriptions-item>
            <el-descriptions-item label="奖励积分">{{ formatAmount(result.game.rewardAmount) }}</el-descriptions-item>
            <el-descriptions-item label="跳过记录">{{ result.game.skipped || 0 }}</el-descriptions-item>
            <el-descriptions-item label="失败记录">{{ result.game.failed || 0 }}</el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="result.game.hasMore"
            type="warning"
            show-icon
            :closable="false"
            title="还有更多历史记录，可以继续执行下一批。"
          />
          <el-table
            v-if="result.game.userDetails?.length"
            :data="result.game.userDetails"
            stripe
            class="detail-table"
            max-height="420"
          >
            <el-table-column prop="userId" label="用户ID" width="90" />
            <el-table-column prop="account" label="账号" min-width="130" />
            <el-table-column prop="nickname" label="昵称" min-width="120" />
            <el-table-column label="补发积分" width="120">
              <template #default="{ row }">{{ formatAmount(row.rewardAmount) }}</template>
            </el-table-column>
            <el-table-column prop="rewardCount" label="奖励笔数" width="100" align="center" />
            <el-table-column prop="sourceUserCount" label="下级人数" width="100" align="center" />
            <el-table-column label="关联流水" width="120">
              <template #default="{ row }">{{ formatAmount(row.turnoverAmount) }}</template>
            </el-table-column>
            <el-table-column label="代数范围" width="110">
              <template #default="{ row }">
                {{ row.minGeneration === row.maxGeneration ? `${row.minGeneration}代` : `${row.minGeneration}-${row.maxGeneration}代` }}
              </template>
            </el-table-column>
            <el-table-column label="直推/可拿代数" width="130">
              <template #default="{ row }">{{ row.validDirectCount || 0 }}人 / {{ row.allowedGeneration || 0 }}代</template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="没有符合补发条件的用户" :image-size="72" />
        </div>

        <div v-if="result.weekly" class="result-block">
          <h3>每周积分返还</h3>
          <el-alert
            v-if="result.weekly.reason"
            type="warning"
            show-icon
            :closable="false"
            :title="reasonText(result.weekly.reason)"
          />
          <el-descriptions :column="2" border>
            <el-descriptions-item label="生成周期">{{ result.weekly.createdPeriods || 0 }}</el-descriptions-item>
            <el-descriptions-item label="跳过周期">{{ result.weekly.skippedPeriods || 0 }}</el-descriptions-item>
            <el-descriptions-item label="涉及用户">{{ result.weekly.activeUsers || 0 }}</el-descriptions-item>
            <el-descriptions-item label="可返还消费">{{ formatAmount(result.weekly.eligibleConsumed) }}</el-descriptions-item>
            <el-descriptions-item label="排除消费">{{ formatAmount(result.weekly.excludedConsumed) }}</el-descriptions-item>
            <el-descriptions-item label="补发笔数">{{ result.weekly.paidRecords || 0 }}</el-descriptions-item>
            <el-descriptions-item label="补发积分">{{ formatAmount(result.weekly.paidPoints) }}</el-descriptions-item>
          </el-descriptions>

          <el-table
            v-if="result.weekly.userDetails?.length"
            :data="result.weekly.userDetails"
            stripe
            class="detail-table"
            max-height="420"
          >
            <el-table-column prop="userId" label="用户ID" width="90" />
            <el-table-column prop="account" label="账号" min-width="130" />
            <el-table-column prop="nickname" label="昵称" min-width="120" />
            <el-table-column prop="weekCount" label="周期数" width="90" align="center" />
            <el-table-column label="可返还消费" width="130">
              <template #default="{ row }">{{ formatAmount(row.eligibleConsumed) }}</template>
            </el-table-column>
            <el-table-column label="排除消费" width="120">
              <template #default="{ row }">{{ formatAmount(row.excludedConsumed) }}</template>
            </el-table-column>
            <el-table-column label="应补发积分" width="130">
              <template #default="{ row }">{{ formatAmount(row.returnAmount) }}</template>
            </el-table-column>
            <el-table-column prop="dueDays" label="应补发天数" width="110" align="center" />
          </el-table>

          <el-table
            v-if="result.weekly.periods?.length"
            :data="result.weekly.periods"
            stripe
            class="period-table"
            max-height="360"
          >
            <el-table-column prop="weekStartDate" label="周开始" width="110" />
            <el-table-column prop="weekEndDate" label="周结束" width="110" />
            <el-table-column prop="activeUsers" label="用户数" width="90" align="center" />
            <el-table-column label="可返还消费" width="130">
              <template #default="{ row }">{{ formatAmount(row.eligibleConsumed) }}</template>
            </el-table-column>
            <el-table-column label="排除消费" width="120">
              <template #default="{ row }">{{ formatAmount(row.excludedConsumed) }}</template>
            </el-table-column>
            <el-table-column label="状态">
              <template #default="{ row }">{{ statusText(row.status) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const result = ref<any>(null)
const dateRange = ref<string[]>([])
const form = reactive({
  game: true,
  weekly: true,
  limit: 5000,
})

function buildPayload(dryRun: boolean) {
  return {
    dryRun,
    from: dateRange.value?.[0] || undefined,
    to: dateRange.value?.[1] || undefined,
    game: form.game,
    weekly: form.weekly,
    limit: form.limit,
  }
}

function formatAmount(value: unknown) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toFixed(6).replace(/\.?0+$/, '') : '0'
}

function statusText(status: string) {
  const map: Record<string, string> = {
    preview: '试算',
    created: '已生成',
    already_exists: '已存在',
    switch_disabled: '功能开关关闭',
    invalid_rate: '返还比例配置异常',
    before_feature_start: '早于功能开始时间',
    no_history_consumption: '没有历史消费',
    no_completed_week: '没有已结束周',
    skipped: '已跳过',
  }
  return map[status] || status || '-'
}

function reasonText(reason: string) {
  const map: Record<string, string> = {
    switch_disabled: '每周积分返还功能开关当前关闭，本次补发没有写入统计数据。请先在功能管理中开启“积分返还”，再重新执行补发。',
    invalid_rate: '积分返还倍率或每日比例配置异常，本次没有写入统计数据。',
    before_feature_start: '所选周期早于积分返还功能开始时间，本次没有写入统计数据。',
    no_history_consumption: '所选时间范围内没有可返还的历史积分消费。',
    no_completed_week: '所选时间范围内没有完整结束的一周，暂不能生成周返还统计。',
  }
  return map[reason] || `本次补发未写入统计数据：${reason}`
}

function backfillWarning(data: any) {
  if (data?.weekly?.reason) return reasonText(data.weekly.reason)
  return ''
}

async function runBackfill(dryRun: boolean) {
  if (!form.game && !form.weekly) {
    ElMessage.warning('至少选择一项补账内容')
    return
  }
  loading.value = true
  try {
    result.value = await request.post('/reward-backfill/legacy', buildPayload(dryRun))
    const warning = backfillWarning(result.value)
    if (warning) ElMessage.warning(warning)
    else ElMessage.success(dryRun ? '试算完成' : '补发完成')
  } finally {
    loading.value = false
  }
}

async function confirmRun() {
  await ElMessageBox.confirm(
    '执行后会直接给符合条件的用户补发普通积分，请先确认试算结果没有问题。',
    '确认执行补发',
    { type: 'warning', confirmButtonText: '确认补发', cancelButtonText: '取消' },
  )
  await runBackfill(false)
}
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.content-card { border-radius: 12px; border: none; }
.card-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
.backfill-form { max-width: 760px; }
.result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px; }
.result-block { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.result-block h3 { margin: 0; font-size: 16px; color: #303133; }
.period-table { margin-top: 4px; }
.detail-table { margin-top: 4px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 12px 0; }
</style>
