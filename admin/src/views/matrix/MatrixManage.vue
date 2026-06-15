<template>
  <div class="page-container">
    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalMatrices }}</div>
          <div class="stat-label">总矩阵数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:#67c23a">{{ stats.activeMatrices }}</div>
          <div class="stat-label">进行中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:#909399">{{ stats.completedMatrices }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:#e6a23c">{{ stats.totalIncome.toFixed(2) }}</div>
          <div class="stat-label">总收益产出</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tabs -->
    <el-tabs v-model="activeTab">
      <el-tab-pane label="矩阵列表" name="list">
        <el-card shadow="hover" class="content-card">
          <el-form :inline="true" @submit.prevent="loadMatrices" style="margin-bottom:16px">
            <el-form-item label="用户ID">
              <el-input v-model="searchOwnerId" placeholder="矩阵顶点用户ID" clearable style="width:160px" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="searchStatus" placeholder="全部" clearable style="width:120px">
                <el-option label="进行中" :value="1" />
                <el-option label="已完成" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadMatrices">查询</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="matrixList" v-loading="loading" stripe>
            <el-table-column prop="id" label="矩阵ID" width="80" align="center" />
            <el-table-column prop="ownerId" label="顶点用户ID" width="100" align="center" />
            <el-table-column label="顶点用户" width="140">
              <template #default="{ row }">{{ row.ownerNickname || row.ownerAccount }}</template>
            </el-table-column>
            <el-table-column prop="round" label="轮次" width="70" align="center" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '进行中' : '已完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="坑位" width="70" align="center">
              <template #default="{ row }">{{ row.filledCount }}/6</template>
            </el-table-column>
            <el-table-column label="可领取收益" width="110" align="right">
              <template #default="{ row }">{{ Number(row.claimableIncome).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="下轮资金" width="110" align="right">
              <template #default="{ row }">{{ Number(row.nextRoundFund).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" :formatter="dateTimeFormatter" />
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="viewDetail(row.id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination :current-page="page" :page-size="pageSize" :total="total" layout="total,prev,pager,next" @current-change="(p:number)=>{page=p;loadMatrices()}" />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="收益流水" name="incomes">
        <el-card shadow="hover" class="content-card">
          <el-form :inline="true" @submit.prevent="loadIncomes" style="margin-bottom:16px">
            <el-form-item label="用户ID">
              <el-input v-model="incomeOwnerId" placeholder="收益归属用户ID" clearable style="width:160px" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="incomeType" placeholder="全部" clearable style="width:140px">
                <el-option label="可领取" value="claimable" />
                <el-option label="下轮资金" value="next_fund" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadIncomes">查询</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="incomeList" v-loading="incomeLoading" stripe>
            <el-table-column prop="id" label="ID" width="70" align="center" />
            <el-table-column prop="ownerId" label="归属用户" width="90" align="center" />
            <el-table-column label="归属昵称" width="120">
              <template #default="{ row }">{{ row.ownerNickname }}</template>
            </el-table-column>
            <el-table-column prop="matrixId" label="矩阵ID" width="80" align="center" />
            <el-table-column prop="slotNumber" label="坑位" width="60" align="center" />
            <el-table-column prop="fromUserId" label="贡献用户" width="90" align="center" />
            <el-table-column label="贡献昵称" width="120">
              <template #default="{ row }">{{ row.fromUserNickname }}</template>
            </el-table-column>
            <el-table-column label="金额" width="100" align="right">
              <template #default="{ row }">{{ Number(row.amount).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="基数/比例" width="130" align="center">
              <template #default="{ row }">
                {{ Number(row.baseFund || 0).toFixed(2) }} × {{ ((Number(row.rewardRate || 0)) * 100).toFixed(0) }}%
              </template>
            </el-table-column>
            <el-table-column label="档位" width="140" align="center">
              <template #default="{ row }">
                {{ row.ownerActivationAmount || '-' }} / {{ row.fromUserActivationAmount || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.incomeType === 'claimable' ? 'success' : 'warning'" size="small">
                  {{ row.incomeType === 'claimable' ? '可领取' : '下轮资金' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="已领取" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isClaimed ? 'success' : 'info'" size="small">{{ row.isClaimed ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="时间" width="180" :formatter="dateTimeFormatter" />
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination :current-page="incomePage" :page-size="20" :total="incomeTotal" layout="total,prev,pager,next" @current-change="(p:number)=>{incomePage=p;loadIncomes()}" />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 矩阵详情弹窗 -->
    <el-dialog v-model="detailVisible" title="矩阵详情" width="650px" destroy-on-close>
      <template v-if="detailData">
        <el-descriptions :column="3" border style="margin-bottom:16px">
          <el-descriptions-item label="矩阵ID">{{ detailData.matrix.id }}</el-descriptions-item>
          <el-descriptions-item label="顶点用户">{{ detailData.matrix.ownerNickname }} (ID:{{ detailData.matrix.ownerId }})</el-descriptions-item>
          <el-descriptions-item label="轮次">第{{ detailData.matrix.round }}轮</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailData.matrix.status === 1 ? '进行中' : '已完成' }}</el-descriptions-item>
          <el-descriptions-item label="可领取收益">{{ Number(detailData.matrix.claimableIncome).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="下轮资金">{{ Number(detailData.matrix.nextRoundFund).toFixed(2) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 矩阵可视化 -->
        <div class="matrix-visual">
          <div class="matrix-row">
            <div class="matrix-node owner">{{ detailData.matrix.ownerNickname || '顶点' }}<br><small>顶点</small></div>
          </div>
          <div class="matrix-row">
            <div :class="['matrix-node', slotClass(1)]">{{ slotLabel(1) }}<br><small>1号位</small></div>
            <div :class="['matrix-node', slotClass(2)]">{{ slotLabel(2) }}<br><small>2号位</small></div>
          </div>
          <div class="matrix-row">
            <div :class="['matrix-node', slotClass(3)]">{{ slotLabel(3) }}<br><small>3号位</small></div>
            <div :class="['matrix-node', slotClass(4)]">{{ slotLabel(4) }}<br><small>4号位</small></div>
            <div :class="['matrix-node', slotClass(5)]">{{ slotLabel(5) }}<br><small>5号位</small></div>
            <div :class="['matrix-node', slotClass(6)]">{{ slotLabel(6) }}<br><small>6号位</small></div>
          </div>
        </div>

        <!-- 坑位表格 -->
        <el-table :data="detailData.slots" stripe style="margin-top:16px" size="small">
          <el-table-column prop="slotNumber" label="坑位" width="60" align="center" />
          <el-table-column label="用户" width="140">
            <template #default="{ row }">{{ row.userNickname }} ({{ row.userId }})</template>
          </el-table-column>
          <el-table-column label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isNewUser ? 'success' : 'warning'" size="small">{{ row.isNewUser ? '新用户' : '老用户' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="收益" width="90" align="right">
            <template #default="{ row }">{{ Number(row.incomeAmount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="基数/比例" width="130" align="center">
            <template #default="{ row }">
              {{ Number(row.baseFund || 0).toFixed(2) }} × {{ ((Number(row.rewardRate || 0)) * 100).toFixed(0) }}%
            </template>
          </el-table-column>
          <el-table-column label="档位" width="120" align="center">
            <template #default="{ row }">{{ row.sourceActivationAmount || row.userActivationAmount || '-' }}元</template>
          </el-table-column>
          <el-table-column label="收益类型" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.incomeType==='claimable'" style="color:#67c23a">可领取</span>
              <span v-else-if="row.incomeType==='next_fund'" style="color:#e6a23c">下轮资金</span>
              <span v-else style="color:#909399">无</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="入位时间" width="180" :formatter="dateTimeFormatter" />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const activeTab = ref('list')

// 统计
const stats = ref({ totalMatrices: 0, activeMatrices: 0, completedMatrices: 0, totalIncome: 0, claimedIncome: 0 })

// 矩阵列表
const loading = ref(false)
const matrixList = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchOwnerId = ref('')
const searchStatus = ref<number | undefined>(undefined)

// 收益流水
const incomeLoading = ref(false)
const incomeList = ref<any[]>([])
const incomePage = ref(1)
const incomeTotal = ref(0)
const incomeOwnerId = ref('')
const incomeType = ref('')

// 详情
const detailVisible = ref(false)
const detailData = ref<any>(null)

async function loadStats() {
  try { stats.value = (await request.get('/matrix/stats')) as any } catch {}
}

async function loadMatrices() {
  loading.value = true
  try {
    const res: any = await request.get('/matrix/list', {
      params: { ownerId: searchOwnerId.value || undefined, status: searchStatus.value, page: page.value, pageSize: pageSize.value }
    })
    matrixList.value = res.list || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

async function loadIncomes() {
  incomeLoading.value = true
  try {
    const res: any = await request.get('/matrix/incomes', {
      params: { ownerId: incomeOwnerId.value || undefined, incomeType: incomeType.value || undefined, page: incomePage.value, pageSize: 20 }
    })
    incomeList.value = res.list || []
    incomeTotal.value = res.total || 0
  } finally { incomeLoading.value = false }
}

async function viewDetail(matrixId: number) {
  try {
    detailData.value = await request.get(`/matrix/detail/${matrixId}`)
    detailVisible.value = true
  } catch {}
}

function slotClass(num: number) {
  const slot = detailData.value?.slots?.find((s: any) => s.slotNumber === num)
  if (!slot) return 'empty'
  return slot.isNewUser ? 'new-user' : 'old-user'
}

function slotLabel(num: number) {
  const slot = detailData.value?.slots?.find((s: any) => s.slotNumber === num)
  if (!slot) return '空位'
  return slot.userNickname || `用户${slot.userId}`
}

onMounted(() => { loadStats(); loadMatrices(); loadIncomes() })
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.stat-card { text-align: center; border-radius: 12px; border: none; }
.stat-value { font-size: 24px; font-weight: 700; color: #1d2129; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.content-card { border-radius: 12px; border: none; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 16px; }

.matrix-visual { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px; background: #f9fafb; border-radius: 10px; }
.matrix-row { display: flex; gap: 12px; justify-content: center; }
.matrix-node { padding: 10px 16px; border-radius: 8px; text-align: center; font-size: 13px; min-width: 80px; line-height: 1.4; }
.matrix-node.owner { background: #e6f0ff; border: 1px solid #b3d4ff; color: #1d6ce0; }
.matrix-node.new-user { background: #e8f8e8; border: 1px solid #b3e6b3; color: #2d8a2d; }
.matrix-node.old-user { background: #fff8e6; border: 1px solid #ffe6a0; color: #b38600; }
.matrix-node.empty { background: #f5f5f5; border: 1px dashed #d9d9d9; color: #bfbfbf; }

:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 12px 0; }
</style>
