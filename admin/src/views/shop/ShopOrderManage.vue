<template>
  <div class="page-container">
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
              <el-button link type="success" @click="openApproveDialog(row)">确认发货</el-button>
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

    <el-dialog v-model="approveVisible" title="确认发货" width="520px">
      <el-form label-width="90px">
        <el-form-item label="订单">
          <el-input :model-value="currentOrder?.orderSn || ''" disabled />
        </el-form-item>
        <el-form-item label="商品">
          <el-input :model-value="currentOrder?.productTitle || ''" disabled />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-input v-model="approveForm.logisticsCompany" placeholder="例如：顺丰/京东/德邦" />
        </el-form-item>
        <el-form-item label="物流单号">
          <el-input v-model="approveForm.logisticsNo" placeholder="可选填写物流单号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="approveForm.remark" type="textarea" :rows="3" placeholder="可选填写备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewing" @click="approveOrder">确认发货</el-button>
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
    ElMessage.success('订单已确认发货')
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

onMounted(loadOrders)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card,
.content-card { border-radius: 12px; border: none; }
.stats { display: flex; gap: 10px; margin-top: 6px; }
.text-muted { color: #909399; font-size: 13px; }
.pager { margin-top: 16px; justify-content: flex-end; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
</style>
