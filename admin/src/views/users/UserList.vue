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
            <el-avatar :size="32" :src="row.avatar" icon="UserFilled" />
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
        <el-table-column label="激活" width="70" align="center">
          <template #default="{ row }">
            <el-icon :color="row.isActivated ? '#67c23a' : '#ccc'"><CircleCheckFilled /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column prop="loginTime" label="最近登录" width="180" :formatter="dateTimeFormatter" />
        <el-table-column prop="registerIp" label="注册IP" width="130" />
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
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
        <el-form-item label="用户">
          <el-text>{{ currencyUser?.nickname }} (ID: {{ currencyUser?.id }})</el-text>
        </el-form-item>
        <el-form-item label="货币类型">
          <el-select v-model="currencyType" style="width:100%">
            <el-option label="积分" value="points" />
            <el-option label="金币" value="gold" />
            <el-option label="银币" value="silver" />
            <el-option label="奖励积分" value="reward" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, getUserStats, updateUser, updateUserStatus, addUserCurrency } from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'

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

async function handleAddCurrency() {
  if (currencyAmount.value <= 0) { ElMessage.warning('请输入数量'); return }
  await addUserCurrency(currencyUser.value.id, { type: currencyType.value, amount: currencyAmount.value })
  ElMessage.success('发放成功')
  currencyVisible.value = false
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
