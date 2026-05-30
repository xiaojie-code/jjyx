<template>
  <div class="page-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="status" clearable placeholder="全部" style="width: 140px">
            <el-option label="待处理" :value="0" />
            <el-option label="已重置" :value="1" />
            <el-option label="已拒绝" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
          <el-button @click="status = undefined; loadList()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="list" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="account" label="账号" width="140" />
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column prop="phone" label="手机号" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="new_password" label="新密码" width="140" />
        <el-table-column prop="created_at" label="申请时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column prop="handled_at" label="处理时间" width="180" :formatter="dateTimeFormatter" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 0"
              type="primary"
              link
              @click="handleReset(row)"
            >
              生成随机密码
            </el-button>
            <el-button
              v-if="row.status === 0"
              type="danger"
              link
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getPasswordResetRequests,
  rejectPasswordResetRequest,
  resetPasswordByRequest,
} from '@/api/user'
import { dateTimeFormatter } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const status = ref<number | undefined>(undefined)

function statusText(value: number) {
  if (value === 1) return '已重置'
  if (value === 2) return '已拒绝'
  return '待处理'
}

function statusType(value: number) {
  if (value === 1) return 'success'
  if (value === 2) return 'danger'
  return 'warning'
}

async function loadList() {
  loading.value = true
  try {
    list.value = (await getPasswordResetRequests({
      status: status.value,
    })) as unknown as any[]
  } finally {
    loading.value = false
  }
}

async function handleReset(row: any) {
  await ElMessageBox.confirm(
    `确认重置账号 ${row.account} 的密码？`,
    '提示',
    { type: 'warning' },
  )
  const result = await resetPasswordByRequest(row.id) as any
  await ElMessageBox.alert(
    `账号：${result.account}\n手机号：${result.phone}\n新密码：${result.newPassword}\n\n请线下发送给用户。`,
    '新密码已生成',
    { confirmButtonText: '知道了' },
  )
  loadList()
}

async function handleReject(row: any) {
  await ElMessageBox.confirm(
    `确认拒绝账号 ${row.account} 的重置申请？`,
    '提示',
    { type: 'warning' },
  )
  await rejectPasswordResetRequest(row.id)
  ElMessage.success('已拒绝')
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.search-card,
.content-card {
  border-radius: 12px;
  border: none;
}
</style>
