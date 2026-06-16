<template>
  <div class="asset-page">
    <el-tabs v-model="activeTab" @tab-change="reload">
      <el-tab-pane label="充值审核" name="recharges">
        <div class="toolbar">
          <el-input
            v-model="rechargeKeyword"
            placeholder="用户/付款姓名/手机号/订单ID"
            clearable
            style="width: 240px"
            @keyup.enter="loadRecharges"
          />
          <el-select v-model="rechargeStatus" placeholder="状态" clearable style="width: 140px" @change="loadRecharges">
            <el-option label="待处理" :value="0" />
            <el-option label="已确认" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
          <el-button type="primary" @click="loadRecharges">查询</el-button>
          <el-button @click="resetRecharges">重置</el-button>
          <el-button @click="loadRecharges">刷新</el-button>
        </div>
        <el-table :data="recharges" v-loading="loading" stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="150">
            <template #default="{ row }">{{ row.userNickname || row.userAccount || row.userId }}</template>
          </el-table-column>
          <el-table-column prop="realName" label="付款姓名" width="120" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column label="申请金额" width="120">
            <template #default="{ row }">¥{{ money(row.amount) }}</template>
          </el-table-column>
          <el-table-column label="确认金额" width="120">
            <template #default="{ row }">{{ row.confirmedAmount ? `¥${money(row.confirmedAmount)}` : '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ time(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <template v-if="Number(row.status) === 0">
                <el-button link type="success" @click="openRechargeReview(row)">确认</el-button>
                <el-button link type="danger" @click="reviewRecharge(row, 'reject')">驳回</el-button>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="提现审核" name="withdrawals">
        <div class="toolbar">
          <el-input
            v-model="withdrawKeyword"
            placeholder="用户/收款人/收款账号/订单ID"
            clearable
            style="width: 240px"
            @keyup.enter="loadWithdrawals"
          />
          <el-select v-model="withdrawStatus" placeholder="状态" clearable style="width: 140px" @change="loadWithdrawals">
            <el-option label="待处理" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
          <el-button type="primary" @click="loadWithdrawals">查询</el-button>
          <el-button @click="resetWithdrawals">重置</el-button>
          <el-button @click="loadWithdrawals">刷新</el-button>
        </div>
        <el-table :data="withdrawals" v-loading="loading" stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="150">
            <template #default="{ row }">{{ row.userNickname || row.userAccount || row.userId }}</template>
          </el-table-column>
          <el-table-column label="申请/到账" width="150">
            <template #default="{ row }">¥{{ money(row.amount) }} / ¥{{ money(row.actualAmount) }}</template>
          </el-table-column>
          <el-table-column label="手续费" width="100">
            <template #default="{ row }">¥{{ money(row.fee) }}</template>
          </el-table-column>
          <el-table-column label="收款信息" min-width="220">
            <template #default="{ row }">{{ methodText(row.paymentMethod) }} / {{ row.accountName }} / {{ row.accountNumber }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ time(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <template v-if="Number(row.status) === 0">
                <el-button link type="success" @click="reviewWithdrawal(row, 'approve')">通过</el-button>
                <el-button link type="danger" @click="reviewWithdrawal(row, 'reject')">驳回</el-button>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="资产账户" name="accounts">
        <div class="toolbar">
          <el-input
            v-model="accountKeyword"
            placeholder="用户ID/账号/昵称"
            clearable
            style="width: 240px"
            @keyup.enter="loadAccounts"
          />
          <el-button type="primary" @click="loadAccounts">查询</el-button>
          <el-button @click="resetAccounts">重置</el-button>
          <el-button @click="loadAccounts">刷新</el-button>
        </div>
        <el-table :data="accounts" v-loading="loading" stripe>
          <el-table-column prop="userId" label="用户ID" width="90" />
          <el-table-column label="用户" min-width="150">
            <template #default="{ row }">{{ row.userNickname || row.userAccount || row.userId }}</template>
          </el-table-column>
          <el-table-column label="本金" width="130">
            <template #default="{ row }">¥{{ money(row.principalBalance) }}</template>
          </el-table-column>
          <el-table-column label="利息" width="150">
            <template #default="{ row }">¥{{ money(row.interestBalance, 6) }}</template>
          </el-table-column>
          <el-table-column label="总额" width="150">
            <template #default="{ row }">¥{{ money(Number(row.principalBalance || 0) + Number(row.interestBalance || 0), 6) }}</template>
          </el-table-column>
          <el-table-column label="累计充值" width="130">
            <template #default="{ row }">¥{{ money(row.totalRecharged) }}</template>
          </el-table-column>
          <el-table-column label="累计提现" width="130">
            <template #default="{ row }">¥{{ money(row.totalWithdrawn) }}</template>
          </el-table-column>
          <el-table-column label="最后计息" width="170">
            <template #default="{ row }">{{ time(row.lastInterestDate || row.updatedAt) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="rechargeDialogVisible" title="确认资产包充值" width="420px">
      <el-form label-width="100px">
        <el-form-item label="申请金额">¥{{ money(currentRecharge?.amount) }}</el-form-item>
        <el-form-item label="确认金额">
          <el-input-number v-model="confirmedAmount" :min="500" :max="100000" :step="100" style="width: 180px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="reviewRemark" placeholder="可不填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRecharge">确认到账</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const activeTab = ref('recharges')
const loading = ref(false)
const recharges = ref<any[]>([])
const withdrawals = ref<any[]>([])
const accounts = ref<any[]>([])
const rechargeKeyword = ref('')
const withdrawKeyword = ref('')
const accountKeyword = ref('')
const rechargeStatus = ref<any>('')
const withdrawStatus = ref<any>('')
const rechargeDialogVisible = ref(false)
const currentRecharge = ref<any>(null)
const confirmedAmount = ref(500)
const reviewRemark = ref('')

function money(value: any, digits = 2) {
  const n = Number(value || 0)
  return n.toFixed(n % 1 === 0 ? 0 : digits)
}

function time(value: any) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00:00`
  const date = new Date(raw)
  if (!Number.isNaN(date.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }
  return raw.replace('T', ' ').replace('Z', '').split('.')[0]
}

function statusText(status: any) {
  const v = Number(status)
  if (v === 1) return '已通过'
  if (v === 2) return '已驳回'
  return '待处理'
}

function statusType(status: any) {
  const v = Number(status)
  if (v === 1) return 'success'
  if (v === 2) return 'danger'
  return 'warning'
}

function methodText(method: string) {
  return method === 'bank' ? '银行卡' : '支付宝'
}

async function loadRecharges() {
  loading.value = true
  try {
    const res: any = await request.get('/assets/recharges', {
      params: {
        keyword: rechargeKeyword.value || undefined,
        status: rechargeStatus.value === '' ? undefined : rechargeStatus.value,
      },
    })
    recharges.value = res.list || []
  } finally {
    loading.value = false
  }
}

async function loadWithdrawals() {
  loading.value = true
  try {
    const res: any = await request.get('/assets/withdrawals', {
      params: {
        keyword: withdrawKeyword.value || undefined,
        status: withdrawStatus.value === '' ? undefined : withdrawStatus.value,
      },
    })
    withdrawals.value = res.list || []
  } finally {
    loading.value = false
  }
}

async function loadAccounts() {
  loading.value = true
  try {
    const res: any = await request.get('/assets/accounts', {
      params: { keyword: accountKeyword.value || undefined },
    })
    accounts.value = res.list || []
  } finally {
    loading.value = false
  }
}

function resetRecharges() {
  rechargeKeyword.value = ''
  rechargeStatus.value = ''
  loadRecharges()
}

function resetWithdrawals() {
  withdrawKeyword.value = ''
  withdrawStatus.value = ''
  loadWithdrawals()
}

function resetAccounts() {
  accountKeyword.value = ''
  loadAccounts()
}

function reload() {
  if (activeTab.value === 'recharges') loadRecharges()
  else if (activeTab.value === 'withdrawals') loadWithdrawals()
  else loadAccounts()
}

function openRechargeReview(row: any) {
  currentRecharge.value = row
  confirmedAmount.value = Number(row.amount || 500)
  reviewRemark.value = ''
  rechargeDialogVisible.value = true
}

async function confirmRecharge() {
  if (confirmedAmount.value < 500 || confirmedAmount.value > 100000 || confirmedAmount.value % 100 !== 0) {
    ElMessage.warning('确认金额必须是500到10W之间的100整数倍')
    return
  }
  await request.post(`/assets/recharges/${currentRecharge.value.id}/review`, {
    action: 'approve',
    confirmedAmount: confirmedAmount.value,
    remark: reviewRemark.value,
  })
  ElMessage.success('已确认到账')
  rechargeDialogVisible.value = false
  loadRecharges()
}

async function reviewRecharge(row: any, action: 'reject') {
  const remark = await ElMessageBox.prompt('请输入驳回原因', '驳回充值', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
  }).then((r) => r.value).catch(() => null)
  if (remark === null) return
  await request.post(`/assets/recharges/${row.id}/review`, { action, remark })
  ElMessage.success('已驳回')
  loadRecharges()
}

async function reviewWithdrawal(row: any, action: 'approve' | 'reject') {
  await ElMessageBox.confirm(`确认${action === 'approve' ? '通过' : '驳回'}这笔资产包提现？`, '提示')
  await request.post(`/assets/withdrawals/${row.id}/review`, { action })
  ElMessage.success('处理成功')
  loadWithdrawals()
}

onMounted(loadRecharges)
</script>

<style scoped>
.asset-page {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
