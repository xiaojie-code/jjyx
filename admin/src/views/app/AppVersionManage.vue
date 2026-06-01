<template>
  <div class="page-container">
    <el-card shadow="hover" class="toolbar-card">
      <el-button type="primary" @click="openCreate">发布新版本</el-button>
    </el-card>

    <el-card shadow="hover" class="content-card">
      <el-table :data="versions" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="platform" label="平台" width="100" />
        <el-table-column prop="versionName" label="版本名称" width="120" />
        <el-table-column prop="versionCode" label="版本号" width="100" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="强制更新" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.forceUpdate ? 'danger' : 'info'" size="small">
              {{ row.forceUpdate ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="downloadUrl" label="下载地址" min-width="260" show-overflow-tooltip />
        <el-table-column prop="changelog" label="更新内容" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑版本' : '发布新版本'" width="640px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="平台">
          <el-select v-model="form.platform" style="width: 100%">
            <el-option label="Android" value="android" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本名称">
          <el-input v-model="form.versionName" placeholder="例如 1.0.1" />
        </el-form-item>
        <el-form-item label="版本号">
          <el-input-number v-model="form.versionCode" :min="1" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="下载地址">
          <el-input v-model="form.downloadUrl" placeholder="http://101.32.252.79/downloads/jjyx-1.0.1.apk" />
        </el-form-item>
        <el-form-item label="文件大小">
          <el-input-number v-model="form.fileSize" :min="0" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="强制更新">
          <el-switch v-model="form.forceUpdate" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="更新内容">
          <el-input v-model="form.changelog" type="textarea" :rows="5" placeholder="每行一条更新内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAppVersion,
  deleteAppVersion,
  getAppVersions,
  updateAppVersion,
  type AppVersionForm,
} from '@/api/app-version'

const loading = ref(false)
const versions = ref<any[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<AppVersionForm>({
  platform: 'android',
  versionName: '',
  versionCode: 1,
  downloadUrl: '',
  forceUpdate: false,
  changelog: '',
  fileSize: null,
  status: 1,
})

async function loadVersions() {
  loading.value = true
  try {
    const res: any = await getAppVersions()
    versions.value = (res || []).map((item: any) => ({
      ...item,
      forceUpdate: Number(item.forceUpdate) === 1 || item.forceUpdate === true,
      status: Number(item.status),
    }))
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    platform: 'android',
    versionName: '',
    versionCode: 1,
    downloadUrl: '',
    forceUpdate: false,
    changelog: '',
    fileSize: null,
    status: 1,
  })
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, {
    platform: row.platform || 'android',
    versionName: row.versionName || '',
    versionCode: Number(row.versionCode || 1),
    downloadUrl: row.downloadUrl || '',
    forceUpdate: Number(row.forceUpdate) === 1 || row.forceUpdate === true,
    changelog: row.changelog || '',
    fileSize: row.fileSize == null ? null : Number(row.fileSize),
    status: Number(row.status ?? 1),
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.versionName.trim()) {
    ElMessage.warning('请填写版本名称')
    return
  }
  if (!form.downloadUrl.trim()) {
    ElMessage.warning('请填写下载地址')
    return
  }
  if (editingId.value) {
    await updateAppVersion(editingId.value, form)
    ElMessage.success('版本已更新')
  } else {
    await createAppVersion(form)
    ElMessage.success('版本已发布')
  }
  dialogVisible.value = false
  loadVersions()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确认删除版本 ${row.versionName}+${row.versionCode}？`, '提示', { type: 'warning' })
  await deleteAppVersion(row.id)
  ElMessage.success('已删除')
  loadVersions()
}

onMounted(loadVersions)
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar-card,
.content-card {
  border: none;
  border-radius: 12px;
}
</style>
