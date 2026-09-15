<template>
  <div class="page-container">
    <div class="summary-strip">
      <div class="summary-item"><span>待处理</span><strong>{{ summary.pending }}</strong></div>
      <div class="summary-item"><span>发送成功</span><strong class="success">{{ summary.success }}</strong></div>
      <div class="summary-item"><span>发送失败</span><strong class="danger">{{ summary.failed }}</strong></div>
      <div class="summary-item"><span>已拒绝</span><strong>{{ summary.rejected }}</strong></div>
    </div>

    <el-card shadow="never" class="search-card">
      <el-form :inline="true" @submit.prevent="loadList">
        <el-form-item label="关键词">
          <el-input v-model="keyword" clearable placeholder="申请ID / 用户ID / 账号 / 昵称 / 手机号"
            style="width: 300px" @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" clearable placeholder="全部" style="width: 140px">
            <el-option label="待处理" :value="0" />
            <el-option label="已重置并发送" :value="1" />
            <el-option label="已拒绝" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="loadList">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <el-table :data="list" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="申请ID" width="90" />
        <el-table-column prop="user_id" label="用户ID" width="90" />
        <el-table-column prop="account" label="账号" min-width="130" />
        <el-table-column prop="nickname" label="昵称" min-width="110" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="申请状态" width="130">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="短信状态" width="110">
          <template #default="{ row }">
            <el-tag :type="smsStatusType(row.sms_status)" effect="plain">
              {{ smsStatusText(row.sms_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sms_attempts" label="发送次数" width="90" align="center" />
        <el-table-column prop="sms_error" label="失败原因" min-width="190" show-overflow-tooltip />
        <el-table-column prop="reject_reason" label="拒绝原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="operator_account" label="操作管理员" width="120" />
        <el-table-column prop="created_at" label="申请时间" width="170" :formatter="dateTimeFormatter" />
        <el-table-column prop="sent_at" label="发送时间" width="170" :formatter="dateTimeFormatter" />
        <el-table-column prop="handled_at" label="处理时间" width="170" :formatter="dateTimeFormatter" />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" type="primary" link
              :loading="sendingId === row.id"
              :disabled="sendingId !== null || Number(row.sms_status) === 1"
              @click="handleReset(row)">
              {{ Number(row.sms_status) === 3 ? '重新发送' : '重置并短信发送' }}
            </el-button>
            <el-button v-if="row.status === 0" type="danger" link
              :disabled="sendingId !== null || Number(row.sms_status) === 1"
              @click="handleReject(row)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getPasswordResetRequests,
  getPasswordResetStats,
  rejectPasswordResetRequest,
  resetPasswordByRequest,
} from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'

const loading = ref(false)
const sendingId = ref<number | null>(null)
const list = ref<any[]>([])
const status = ref<number | undefined>(undefined)
const keyword = ref('')

const summary = reactive({ pending: 0, success: 0, failed: 0, rejected: 0 })

function statusText(value: number) {
  if (Number(value) === 1) return '已重置并发送'
  if (Number(value) === 2) return '已拒绝'
  return '待处理'
}

function statusType(value: number) {
  if (Number(value) === 1) return 'success'
  if (Number(value) === 2) return 'info'
  return 'warning'
}

function smsStatusText(value: number) {
  if (Number(value) === 1) return '发送中'
  if (Number(value) === 2) return '发送成功'
  if (Number(value) === 3) return '发送失败'
  return '待发送'
}

function smsStatusType(value: number) {
  if (Number(value) === 1) return 'warning'
  if (Number(value) === 2) return 'success'
  if (Number(value) === 3) return 'danger'
  return 'info'
}

async function loadList() {
  loading.value = true
  try {
    const [rows, stats] = await Promise.all([
      getPasswordResetRequests({
        status: status.value,
        keyword: keyword.value.trim() || undefined,
      }),
      getPasswordResetStats(),
    ])
    list.value = rows as unknown as any[]
    Object.assign(summary, stats)
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  status.value = undefined
  keyword.value = ''
  loadList()
}

async function handleReset(row: any) {
  const retry = Number(row.sms_status) === 3
  await ElMessageBox.confirm(
    `${retry ? '重新生成临时密码并发送' : '确认重置密码并发送短信'}到 ${row.phone}？短信发送成功后，账号 ${row.account} 的原密码将立即失效。`,
    retry ? '重新发送确认' : '重置并发送确认',
    { type: 'warning', confirmButtonText: retry ? '重新发送' : '确认发送' },
  )
  sendingId.value = row.id
  try {
    const result = await resetPasswordByRequest(row.id) as any
    ElMessage.success(`密码已重置，短信已发送至 ${result.phone}`)
    await loadList()
  } finally {
    sendingId.value = null
  }
}

async function handleReject(row: any) {
  const result = await ElMessageBox.prompt(
    `确认拒绝账号 ${row.account} 的密码重置申请？`,
    '拒绝申请',
    { type: 'warning', inputPlaceholder: '请输入拒绝原因（选填）',
      inputType: 'textarea', confirmButtonText: '确认拒绝' },
  )
  await rejectPasswordResetRequest(row.id, result.value?.trim())
  ElMessage.success('申请已拒绝')
  await loadList()
}

onMounted(loadList)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.summary-strip { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 12px; }
.summary-item { min-height: 72px; padding: 12px 16px; border: 1px solid var(--el-border-color-light);
  border-radius: 6px; background: var(--el-bg-color); display: flex; align-items: center;
  justify-content: space-between; }
.summary-item span { color: var(--el-text-color-secondary); }
.summary-item strong { font-size: 24px; }
.summary-item .success { color: var(--el-color-success); }
.summary-item .danger { color: var(--el-color-danger); }
.search-card, .content-card { border-radius: 6px; }
.search-card :deep(.el-card__body) { padding-bottom: 2px; }
@media (max-width: 900px) {
  .summary-strip { grid-template-columns: repeat(2, minmax(130px, 1fr)); }
}
</style>
