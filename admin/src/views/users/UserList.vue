<template>
  <div class="page-container">
    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">总用户数量</div>
        <div class="stat-value">{{ userStats.totalUsers }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">已激活用户</div>
        <div class="stat-value activated">{{ userStats.activatedUsers }}</div>
      </el-card>
    </div>

    <!-- 搜索栏 -->
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input v-model="searchKeyword" placeholder="用户ID/账号/昵称/IP" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户表格 -->
    <el-card shadow="hover" class="content-card">
      <el-table :data="userList" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="头像" width="70" align="center">
          <template #default="{ row }">
            <el-avatar :size="32" :src="resolveAvatarUrl(row.avatar)" icon="UserFilled" />
          </template>
        </el-table-column>
        <el-table-column prop="account" label="账号" width="120" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.userType === 2 ? 'warning' : 'info'" size="small">
              {{ row.userType === 2 ? '运营' : '普通' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="激活" width="110" align="center">
          <template #default="{ row }">
            <template v-if="row.isActivated">
              <el-tag v-if="Number(row.activationAmount) === 500" type="warning" size="small">500档</el-tag>
              <el-tag v-else-if="Number(row.activationAmount) === 2000" type="success" size="small">2000档</el-tag>
              <el-icon v-else color="#67c23a"><CircleCheckFilled /></el-icon>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="当前积分" width="110" align="right">
          <template #default="{ row }">
            {{ formatPoints(row.currency?.points) }}
          </template>
        </el-table-column>
        <el-table-column label="当前金币" width="110" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.currency?.gold) }}
          </template>
        </el-table-column>
        <el-table-column label="原始金币" width="120" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.currency?.totalGoldEarned) }}
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column prop="loginTime" label="最近登录" width="180" :formatter="dateTimeFormatter" />
        <el-table-column prop="registerIp" label="注册IP" width="130" />
        <el-table-column label="操作" width="320" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="success" link @click="openPoints(row)">积分明细</el-button>
            <el-button size="small" type="warning" link @click="handleCurrency(row)">发放货币</el-button>
            <el-button
              size="small"
              :type="row.status === 1 ? 'danger' : 'success'"
              link
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '封禁' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="500px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户ID">
          <el-text>{{ editForm.id }}</el-text>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="editForm.userType">
            <el-radio :value="1">普通</el-radio>
            <el-radio :value="2">运营</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="后台备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 发放货币弹窗 -->
    <el-dialog v-model="currencyVisible" title="发放货币" width="450px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="用户ID">
          <el-text>{{ currencyUser?.id }}</el-text>
        </el-form-item>
        <el-form-item label="昵称">
          <el-text>{{ currencyUser?.nickname || currencyUser?.account || '-' }}</el-text>
        </el-form-item>
        <el-form-item label="货币类型">
          <el-select v-model="currencyType" style="width:100%">
            <el-option label="积分" value="points" />
            <el-option label="金币" value="gold" />
            <el-option label="银币" value="silver" />
            <el-option label="铜币" value="copper" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="currencyAmount" :min="1" :max="999999" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="currencyVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddCurrency">确认发放</el-button>
      </template>
    </el-dialog>

    <!-- 积分明细抽屉 -->
    <el-drawer
      v-model="pointsVisible"
      :title="`${pointsUser?.nickname || pointsUser?.account || '用户'} 的积分信息`"
      size="760px"
      destroy-on-close
    >
      <el-descriptions :column="2" border class="points-summary">
        <el-descriptions-item label="用户ID">{{ pointsUser?.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ pointsUser?.account || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前积分">
          <span class="points-balance">{{ formatPoints(pointsSummary.balance) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="累计收入">{{ formatPoints(pointsSummary.income) }}</el-descriptions-item>
        <el-descriptions-item label="累计支出">{{ formatPoints(pointsSummary.expense) }}</el-descriptions-item>
        <el-descriptions-item label="流水笔数">{{ pointsSummary.logCount }}</el-descriptions-item>
      </el-descriptions>

      <el-table :data="pointsLogs" v-loading="pointsLoading" stripe class="points-table">
        <el-table-column prop="sn" label="流水号" min-width="180" />
        <el-table-column label="变动积分" width="110" align="right">
          <template #default="{ row }">
            <span :class="Number(row.amount) >= 0 ? 'income-amount' : 'expense-amount'">
              {{ Number(row.amount) >= 0 ? '+' : '' }}{{ formatPoints(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="前后余额" width="150" align="right">
          <template #default="{ row }">
            {{ formatPoints(row.beforeBalance) }} → {{ formatPoints(row.afterBalance) }}
          </template>
        </el-table-column>
        <el-table-column prop="logType" label="类型" width="120" />
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="170" :formatter="dateTimeFormatter" />
      </el-table>
      <div class="points-pagination">
        <el-pagination
          :current-page="pointsPage"
          :page-size="pointsPageSize"
          :total="pointsTotal"
          layout="total, prev, pager, next"
          @current-change="handlePointsPageChange"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, getUserStats, updateUser, updateUserStatus, addUserCurrency, getUserPoints, getUserLogs } from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'
import { resolveAvatarUrl } from '@/utils/media'

const loading = ref(false)
const userList = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const userStats = ref({ totalUsers: 0, activatedUsers: 0 })
const searchKeyword = ref('')
const searchStatus = ref<number | undefined>(undefined)

// 编辑
const editVisible = ref(false)
const editForm = ref({ id: 0, userType: 1, remark: '' })

// 发放货币
const currencyVisible = ref(false)
const currencyUser = ref<any>(null)
const currencyType = ref('points')
const currencyAmount = ref(100)

const pointsVisible = ref(false)
const pointsLoading = ref(false)
const pointsUser = ref<any>(null)
const pointsLogs = ref<any[]>([])
const pointsPage = ref(1)
const pointsPageSize = ref(20)
const pointsTotal = ref(0)
const pointsSummary = ref({ balance: 0, income: 0, expense: 0, logCount: 0 })

async function loadUsers() {
  loading.value = true
  try {
    const res: any = await getUserList({
      page: page.value, pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      status: searchStatus.value,
    })
    userList.value = res.list || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

async function loadUserStats() {
  const res: any = await getUserStats()
  userStats.value = {
    totalUsers: res.totalUsers || 0,
    activatedUsers: res.activatedUsers || 0,
  }
}

function handleSearch() { page.value = 1; loadUsers() }
function handleReset() { searchKeyword.value = ''; searchStatus.value = undefined; handleSearch() }
function handlePageChange(p: number) { page.value = p; loadUsers() }
function handleSizeChange(s: number) { pageSize.value = s; page.value = 1; loadUsers() }

function formatAmount(value: unknown) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatPoints(value: unknown) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0'
  return n.toFixed(6).replace(/\.?0+$/, '')
}

function handleEdit(row: any) {
  editForm.value = { id: row.id, userType: row.userType, remark: row.remark || '' }
  editVisible.value = true
}

async function handleSaveEdit() {
  await updateUser(editForm.value.id, { userType: editForm.value.userType, remark: editForm.value.remark })
  ElMessage.success('保存成功')
  editVisible.value = false
  loadUsers()
}

async function handleToggleStatus(row: any) {
  const newStatus = row.status === 1 ? 3 : 1
  const action = newStatus === 3 ? '封禁' : '启用'
  await ElMessageBox.confirm(`确定${action}用户 ${row.nickname}？`, '提示', { type: 'warning' })
  await updateUserStatus(row.id, newStatus)
  ElMessage.success(`${action}成功`)
  loadUsers()
}

function handleCurrency(row: any) {
  currencyUser.value = row
  currencyType.value = 'points'
  currencyAmount.value = 100
  currencyVisible.value = true
}

async function loadPointsDetail() {
  if (!pointsUser.value?.id) return
  pointsLoading.value = true
  try {
    const [summary, logs]: any[] = await Promise.all([
      getUserPoints(pointsUser.value.id),
      getUserLogs(pointsUser.value.id, {
        currencyType: 'points',
        page: pointsPage.value,
        pageSize: pointsPageSize.value,
      }),
    ])
    pointsSummary.value = {
      balance: Number(summary?.balance || 0),
      income: Number(summary?.income || 0),
      expense: Number(summary?.expense || 0),
      logCount: Number(summary?.logCount || 0),
    }
    pointsLogs.value = logs?.list || []
    pointsTotal.value = logs?.total || 0
  } finally {
    pointsLoading.value = false
  }
}

function openPoints(row: any) {
  pointsUser.value = row
  pointsPage.value = 1
  pointsVisible.value = true
  loadPointsDetail()
}

function handlePointsPageChange(pageNumber: number) {
  pointsPage.value = pageNumber
  loadPointsDetail()
}

async function handleAddCurrency() {
  if (currencyAmount.value <= 0) { ElMessage.warning('请输入数量'); return }
  await addUserCurrency(currencyUser.value.id, { type: currencyType.value, amount: currencyAmount.value })
  ElMessage.success('发放成功')
  currencyVisible.value = false
  loadUsers()
}

onMounted(() => {
  loadUsers()
  loadUserStats()
})
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px));
  gap: 16px;
}
.stat-card {
  border-radius: 12px;
  border: none;
}
.stat-label {
  color: #606266;
  font-size: 13px;
}
.stat-value {
  margin-top: 8px;
  color: #303133;
  font-size: 28px;
  font-weight: 700;
}
.stat-value.activated {
  color: #67c23a;
}
.search-card {
  border-radius: 12px;
  border: none;
}
.content-card {
  border-radius: 12px;
  border: none;
}
.points-summary {
  margin-bottom: 18px;
}
.points-balance {
  color: #409eff;
  font-weight: 700;
}
.points-table {
  margin-top: 12px;
}
.income-amount {
  color: #67c23a;
}
.expense-amount {
  color: #f56c6c;
}
.points-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
}
:deep(.el-table) {
  --el-table-border-color: transparent;
  --el-table-row-hover-bg-color: #f0f5ff;
}
:deep(.el-table th.el-table__cell) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 600;
}
:deep(.el-table td.el-table__cell) {
  padding: 14px 0;
}
</style>
