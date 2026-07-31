<template>
  <div class="page-container">
    <el-card shadow="hover" class="cag-config-card" v-loading="cagLoading">
      <template #header>
        <div class="cag-header">
          <div>
            <div class="cag-title">CAG 兑换配置</div>
            <div class="text-muted">商城银币兑换活动</div>
          </div>
          <div class="cag-header-actions">
            <el-tag :type="cagConfig.isActive ? 'success' : 'info'">
              {{ cagConfig.isActive ? '兑换进行中' : (cagConfig.unavailableReason || '兑换未开启') }}
            </el-tag>
            <el-button type="primary" :loading="cagSaving" @click="saveCagConfig">保存配置</el-button>
          </div>
        </div>
      </template>
      <el-form class="cag-form" label-position="top">
        <el-form-item label="开启CAG兑换">
          <el-switch v-model="cagForm.enabled" inline-prompt active-text="开" inactive-text="关" />
        </el-form-item>
        <el-form-item label="每个CAG所需银币">
          <el-input-number v-model="cagForm.silverPrice" :min="1" :step="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="单用户累计兑换上限">
          <div class="limit-field">
            <el-input-number v-model="cagForm.userLimit" :min="0" :step="1" :precision="0" controls-position="right" />
            <span class="field-hint">0 表示不限制</span>
          </div>
        </el-form-item>
        <el-form-item label="兑换有效期" class="date-range-item">
          <el-date-picker
            v-model="cagDateRange"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            range-separator="至"
            clearable
          />
        </el-form-item>
      </el-form>
      <div class="cag-stats">
        <span>累计兑换 <strong>{{ cagConfig.exchangedQuantity }}</strong> 个</span>
        <span>兑换用户 <strong>{{ cagConfig.exchangedUsers }}</strong> 人</span>
      </div>
    </el-card>

    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="loadOrders">
        <el-form-item label="状态">
          <el-select v-model="status" clearable placeholder="全部" style="width: 130px" @change="loadOrders">
            <el-option label="待审核" :value="0" />
            <el-option label="已确认发货" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select v-model="paymentMethod" clearable placeholder="全部" style="width: 130px" @change="loadOrders">
            <el-option label="银币兑换" value="silver" />
            <el-option label="现金购买" value="cash" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="keyword"
            clearable
            placeholder="订单/用户/商品/收货人/手机号"
            style="width: 260px"
            @keyup.enter="loadOrders"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="stats">
        <el-tag type="warning">待审核 {{ stats.pending }}</el-tag>
        <el-tag type="success">已确认发货 {{ stats.approved }}</el-tag>
        <el-tag type="info">已驳回 {{ stats.rejected }}</el-tag>
      </div>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="orderSn" label="订单号" width="190" show-overflow-tooltip />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div>UID {{ row.userId }}</div>
            <div class="text-muted">{{ row.userNickname || row.userAccount || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="productTitle" label="商品" min-width="180" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column label="支付" width="130">
          <template #default="{ row }">
            <el-tag :type="row.paymentMethod === 'silver' ? 'warning' : 'success'" size="small">
              {{ row.paymentMethod === 'silver' ? '银币兑换' : '现金购买' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140">
          <template #default="{ row }">
            <div v-if="row.paymentMethod === 'silver'">{{ money(row.totalSilverAmount) }} 银币</div>
            <div v-else>¥{{ money(row.totalCashAmount) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="收货信息" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.receiverName }} {{ row.receiverPhone }}</div>
            <div class="text-muted">{{ row.receiverAddress }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'warning' : row.status === 1 ? 'success' : 'danger'">
              {{ row.statusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="物流" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.logisticsCompany || row.logisticsNo">
              {{ row.logisticsCompany || '-' }} {{ row.logisticsNo || '' }}
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="adminRemark" label="备注" min-width="130" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="下单时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button link type="success" @click="openApproveDialog(row)">
                {{ row.productKey === 'cag' ? '确认兑换' : '确认发货' }}
              </el-button>
              <el-button link type="danger" @click="rejectOrder(row)">驳回</el-button>
            </template>
            <span v-else class="text-muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > pageSize"
        class="pager"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="(p:number)=>{page=p;loadOrders()}"
      />
    </el-card>

    <el-dialog
      v-model="approveVisible"
      :title="currentOrder?.productKey === 'cag' ? '确认CAG兑换' : '确认发货'"
      width="520px"
    >
      <el-form label-width="90px">
        <el-form-item label="订单">
          <el-input :model-value="currentOrder?.orderSn || ''" disabled />
        </el-form-item>
        <el-form-item label="商品">
          <el-input :model-value="currentOrder?.productTitle || ''" disabled />
        </el-form-item>
        <el-form-item v-if="currentOrder?.productKey !== 'cag'" label="物流公司">
          <el-input v-model="approveForm.logisticsCompany" placeholder="例如：顺丰/京东/德邦" />
        </el-form-item>
        <el-form-item v-if="currentOrder?.productKey !== 'cag'" label="物流单号">
          <el-input v-model="approveForm.logisticsNo" placeholder="可选填写物流单号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="approveForm.remark" type="textarea" :rows="3" placeholder="可选填写备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewing" @click="approveOrder">
          {{ currentOrder?.productKey === 'cag' ? '确认兑换' : '确认发货' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const loading = ref(false)
const reviewing = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref<number | ''>('')
const paymentMethod = ref('')
const keyword = ref('')
const stats = reactive({ pending: 0, approved: 0, rejected: 0 })
const cagLoading = ref(false)
const cagSaving = ref(false)
const cagDateRange = ref<string[]>([])
const cagForm = reactive({ enabled: false, silverPrice: 1000, userLimit: 1 })
const cagConfig = reactive({
  isActive: false,
  unavailableReason: '',
  exchangedQuantity: 0,
  exchangedUsers: 0,
})

const approveVisible = ref(false)
const currentOrder = ref<any | null>(null)
const approveForm = reactive({
  logisticsCompany: '',
  logisticsNo: '',
  remark: '',
})

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

async function loadCagConfig() {
  cagLoading.value = true
  try {
    const res: any = await request.get('/shop/cag-config')
    cagForm.enabled = Boolean(res.enabled)
    cagForm.silverPrice = Number(res.silverPrice || 1000)
    cagForm.userLimit = Number(res.userLimit || 0)
    cagDateRange.value = res.startAt && res.endAt ? [res.startAt, res.endAt] : []
    cagConfig.isActive = Boolean(res.isActive)
    cagConfig.unavailableReason = res.unavailableReason || ''
    cagConfig.exchangedQuantity = Number(res.exchangedQuantity || 0)
    cagConfig.exchangedUsers = Number(res.exchangedUsers || 0)
  } finally {
    cagLoading.value = false
  }
}

async function saveCagConfig() {
  cagSaving.value = true
  try {
    const range = cagDateRange.value || []
    await request.put('/shop/cag-config', {
      enabled: cagForm.enabled,
      silverPrice: cagForm.silverPrice,
      userLimit: cagForm.userLimit,
      startAt: range[0] || '',
      endAt: range[1] || '',
    })
    ElMessage.success('CAG兑换配置已保存')
    await loadCagConfig()
  } finally {
    cagSaving.value = false
  }
}

async function loadOrders() {
  loading.value = true
  try {
    const res: any = await request.get('/shop/orders', {
      params: {
        status: status.value === '' ? undefined : status.value,
        paymentMethod: paymentMethod.value || undefined,
        keyword: keyword.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
      },
    })
    orders.value = res.list || []
    total.value = Number(res.total || 0)
    stats.pending = Number(res.stats?.pending || 0)
    stats.approved = Number(res.stats?.approved || 0)
    stats.rejected = Number(res.stats?.rejected || 0)
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  status.value = ''
  paymentMethod.value = ''
  keyword.value = ''
  page.value = 1
  loadOrders()
}

function openApproveDialog(row: any) {
  currentOrder.value = row
  approveForm.logisticsCompany = ''
  approveForm.logisticsNo = ''
  approveForm.remark = ''
  approveVisible.value = true
}

async function approveOrder() {
  const order = currentOrder.value
  if (!order) return
  reviewing.value = true
  try {
    await request.put(`/shop/orders/${order.id}/review`, {
      action: 'approve',
      logisticsCompany: approveForm.logisticsCompany,
      logisticsNo: approveForm.logisticsNo,
      remark: approveForm.remark,
    })
    ElMessage.success(order.productKey === 'cag' ? 'CAG兑换已确认' : '订单已确认发货')
    approveVisible.value = false
    loadOrders()
  } finally {
    reviewing.value = false
  }
}

async function rejectOrder(row: any) {
  let value = ''
  try {
    const result = await ElMessageBox.prompt('请填写驳回原因', '驳回商城订单', {
      inputPlaceholder: '例如：未收到付款/商品暂不可发货',
      type: 'warning',
    })
    value = result.value || ''
  } catch {
    return
  }
  await request.put(`/shop/orders/${row.id}/review`, {
    action: 'reject',
    remark: value,
  })
  ElMessage.success(row.paymentMethod === 'silver' ? '已驳回，银币已退回' : '已驳回')
  loadOrders()
}

onMounted(() => {
  loadOrders()
  loadCagConfig()
})
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.cag-config-card,
.search-card,
.content-card { border-radius: 8px; border: none; }
.cag-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.cag-title { color: #303133; font-size: 17px; font-weight: 700; margin-bottom: 4px; }
.cag-header-actions { display: flex; align-items: center; gap: 12px; }
.cag-form { display: grid; grid-template-columns: 150px 220px 250px minmax(360px, 1fr); gap: 16px 24px; align-items: start; }
.cag-form :deep(.el-form-item) { margin-bottom: 4px; }
.cag-form :deep(.el-input-number) { width: 100%; }
.limit-field { display: flex; align-items: center; width: 100%; }
.date-range-item :deep(.el-date-editor) { width: 100%; }
.field-hint { margin-left: 8px; color: #909399; font-size: 12px; white-space: nowrap; }
.cag-stats { display: flex; gap: 28px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #ebeef5; color: #606266; }
.cag-stats strong { color: #303133; font-size: 17px; }
.stats { display: flex; gap: 10px; margin-top: 6px; }
.text-muted { color: #909399; font-size: 13px; }
.pager { margin-top: 16px; justify-content: flex-end; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }

@media (max-width: 1100px) {
  .cag-form { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
  .date-range-item { grid-column: 1 / -1; }
}
</style>
