<template>
  <div class="page-container">
    <el-tabs v-model="activeTab">
      <!-- 充值订单 -->
      <el-tab-pane label="充值订单" name="orders">
        <el-card shadow="hover" class="search-card">
          <el-form :inline="true" @submit.prevent="loadOrders">
            <el-form-item label="状态">
              <el-select v-model="statusFilter" placeholder="全部" clearable style="width: 130px" @change="loadOrders">
                <el-option label="待核实" :value="0" />
                <el-option label="已发码" :value="1" />
                <el-option label="已驳回" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键词">
              <el-input v-model="keyword" placeholder="姓名/手机号/账号" clearable @keyup.enter="loadOrders" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadOrders">查询</el-button>
            </el-form-item>
          </el-form>
          <div class="stats">
            <el-tag type="warning">待核实 {{ stats.pending }}</el-tag>
            <el-tag type="success">已发码 {{ stats.approved }}</el-tag>
            <el-tag type="info">已驳回 {{ stats.rejected }}</el-tag>
          </div>
        </el-card>

        <el-card shadow="hover" class="content-card">
          <el-table :data="orders" v-loading="loading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="account" label="账号" width="120" />
            <el-table-column prop="realName" label="付款人姓名" width="110" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column label="金额" width="90">
              <template #default="{ row }">{{ row.amount != null ? `¥${row.amount}` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="packageName" label="套餐" width="90" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 0 ? 'warning' : row.status === 1 ? 'success' : 'danger'">
                  {{ row.statusText }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="adminRemark" label="备注" min-width="120" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="申请时间" width="180" :formatter="dateTimeFormatter" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 0">
                  <el-button size="small" type="success" link @click="openSendCodeDialog(row)">发送激活码</el-button>
                  <el-button size="small" type="danger" link @click="handleReview(row, 'reject')">驳回</el-button>
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

        <el-dialog v-model="sendCodeDialogVisible" title="发送激活码短信" width="460px">
          <el-form label-width="90px">
            <el-form-item label="付款人姓名">
              <el-input v-model="sendCodeForm.realName" disabled />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="sendCodeForm.phone" disabled />
            </el-form-item>
            <el-form-item label="充值金额">
              <el-input v-model="sendCodeForm.amountText" disabled />
            </el-form-item>
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="系统会根据充值金额自动生成对应档位的激活码，并通过短信发送到该手机号。"
            />
          </el-form>
          <template #footer>
            <el-button @click="sendCodeDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="sendCodeSending" @click="confirmSendCode">
              确认生成并发送
            </el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 收款设置 -->
      <el-tab-pane label="收款设置" name="config">
        <el-card shadow="hover" class="content-card">
          <el-form label-width="110px" style="max-width: 560px">
            <el-form-item label="收款码">
              <div>
                <el-image
                  v-if="cfg.recharge_qrcode"
                  :src="qrcodeUrl"
                  fit="contain"
                  style="width: 200px; height: 200px; border: 1px solid #eee; border-radius: 8px"
                  :preview-src-list="[qrcodeUrl]"
                />
                <div v-else class="qr-placeholder">未上传收款码</div>
                <div style="margin-top: 10px">
                  <el-upload
                    :show-file-list="false"
                    :http-request="handleUploadQrcode"
                    accept="image/*"
                  >
                    <el-button type="primary">上传/更换收款码</el-button>
                  </el-upload>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="收款人姓名">
              <el-input v-model="cfg.recharge_payee_name" placeholder="例如 张三" />
            </el-form-item>
            <el-form-item label="充值套餐">
              <el-input model-value="500,2000" disabled />
            </el-form-item>
            <el-form-item label="充值说明">
              <el-input v-model="cfg.recharge_notice" type="textarea" :rows="4" placeholder="给用户的充值步骤说明" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveConfig">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dateTimeFormatter } from '@/utils/format'
import { resolveMediaUrl } from '@/utils/media'
import {
  getRechargeOrders,
  getRechargeStats,
  reviewRecharge,
  sendRechargeActivationCode,
  uploadRechargeQrcode,
  getConfigs,
  updateConfig,
} from '@/api/recharge'

const activeTab = ref('orders')
const loading = ref(false)
const orders = ref<any[]>([])
const statusFilter = ref<number | ''>('')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const stats = reactive({ pending: 0, approved: 0, rejected: 0 })
const sendCodeDialogVisible = ref(false)
const sendCodeSending = ref(false)
const currentSendCodeOrder = ref<any | null>(null)
const sendCodeForm = reactive({
  realName: '',
  phone: '',
  amountText: '',
})

const cfg = reactive<Record<string, string>>({
  recharge_qrcode: '',
  recharge_payee_name: '',
  recharge_packages: '',
  recharge_notice: '',
})

const qrcodeUrl = computed(() => {
  const v = cfg.recharge_qrcode
  return resolveMediaUrl(v)
})

async function loadOrders() {
  loading.value = true
  try {
    const res: any = await getRechargeOrders({
      status: statusFilter.value === '' ? undefined : statusFilter.value,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    orders.value = res.list || []
    total.value = res.total || 0
    const s: any = await getRechargeStats()
    stats.pending = s.pending || 0
    stats.approved = s.approved || 0
    stats.rejected = s.rejected || 0
  } finally {
    loading.value = false
  }
}

function openSendCodeDialog(row: any) {
  currentSendCodeOrder.value = row
  sendCodeForm.realName = row.realName || ''
  sendCodeForm.phone = row.phone || ''
  sendCodeForm.amountText = row.amount != null ? `${row.amount} 元` : ''
  sendCodeDialogVisible.value = true
}

async function confirmSendCode() {
  const order = currentSendCodeOrder.value
  if (!order) {
    ElMessage.error('请选择充值订单')
    return
  }
  if (!sendCodeForm.realName) {
    ElMessage.error('付款人姓名不能为空')
    return
  }
  if (!sendCodeForm.phone) {
    ElMessage.error('手机号不能为空')
    return
  }

  sendCodeSending.value = true
  try {
    const res: any = await sendRechargeActivationCode(order.id)
    ElMessage.success(res?.code ? `激活码已生成并发送：${res.code}` : '激活码短信已发送')
    sendCodeDialogVisible.value = false
    loadOrders()
  } finally {
    sendCodeSending.value = false
  }
}

async function handleReview(row: any, action: 'approve' | 'reject') {
  let remark = ''
  if (action === 'approve') {
    await ElMessageBox.confirm(
      `确认已收到 ${row.realName}（${row.phone}）的付款，并已通过短信发送激活码？`,
      '确认发码',
      { type: 'success' },
    )
  } else {
    const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回充值申请', {
      inputPlaceholder: '例如：未收到付款',
      type: 'warning',
    })
    remark = value || ''
  }
  await reviewRecharge(row.id, { action, remark })
  ElMessage.success(action === 'approve' ? '已标记为已发码' : '已驳回')
  loadOrders()
}

async function handleUploadQrcode(option: any) {
  const formData = new FormData()
  formData.append('image', option.file)
  try {
    const res: any = await uploadRechargeQrcode(formData)
    cfg.recharge_qrcode = res.url || ''
    ElMessage.success('收款码已上传')
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

async function loadConfig() {
  const res: any = await getConfigs()
  const list = res || []
  for (const item of list) {
    if (item.configKey in cfg) {
      cfg[item.configKey] = item.configValue || ''
    }
  }
}

async function saveConfig() {
  await Promise.all([
    updateConfig('recharge_payee_name', cfg.recharge_payee_name || ''),
    updateConfig('recharge_notice', cfg.recharge_notice || ''),
  ])
  ElMessage.success('设置已保存')
}

onMounted(() => {
  loadOrders()
  loadConfig()
})
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 12px; border: none; }
.content-card { border-radius: 12px; border: none; }
.stats { display: flex; gap: 10px; margin-top: 8px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-muted { color: #909399; font-size: 13px; }
.qr-placeholder {
  width: 200px; height: 200px; display: flex; align-items: center; justify-content: center;
  background: #f5f5f5; border-radius: 8px; color: #aaa; font-size: 13px;
}
</style>
