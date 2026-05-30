<template>
  <div class="page-container">
    <el-card shadow="hover" class="content-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="聊天记录" name="messages">
          <div class="toolbar">
            <el-input v-model="messageQuery.keyword" placeholder="关键词" clearable style="width: 160px" />
            <el-input v-model="messageQuery.conversationId" placeholder="会话ID" clearable style="width: 120px" />
            <el-input v-model="messageQuery.userId" placeholder="发送人ID" clearable style="width: 120px" />
            <el-select v-model="messageQuery.msgType" placeholder="消息类型" clearable style="width: 120px">
              <el-option label="文字" value="1" />
              <el-option label="语音" value="2" />
              <el-option label="系统" value="3" />
              <el-option label="图片" value="4" />
            </el-select>
            <el-date-picker v-model="messageQuery.dateRange" type="daterange" range-separator="至"
              start-placeholder="开始" end-placeholder="结束" style="width: 240px" value-format="YYYY-MM-DD" />
            <el-button type="primary" @click="msgPage = 1; loadMessages()">查询</el-button>
          </div>
          <el-table :data="messages" v-loading="messageLoading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="conversationId" label="会话" width="80" />
            <el-table-column label="发送人" width="140">
              <template #default="{ row }">{{ row.senderNickname || row.senderAccount || row.senderId }}</template>
            </el-table-column>
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ messageTypeText(row.msgType) }}</template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="240" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="时间" width="180" :formatter="dateTimeFormatter" />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="deleteMessage(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination :current-page="msgPage" :page-size="msgPageSize" :total="msgTotal"
              layout="total, prev, pager, next" @current-change="(p: number) => { msgPage = p; loadMessages() }" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="群会议" name="meetings">
          <div class="toolbar">
            <el-select v-model="meetingQuery.status" placeholder="状态" clearable style="width: 120px">
              <el-option label="进行中" value="1" />
              <el-option label="已结束" value="2" />
            </el-select>
            <el-input v-model="meetingQuery.groupId" placeholder="群ID" clearable style="width: 120px" />
            <el-button type="primary" @click="mtPage = 1; loadMeetings()">查询</el-button>
            <el-button @click="openCleanDialog">清理过期数据</el-button>
          </div>
          <el-table :data="meetings" v-loading="meetingLoading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="groupId" label="群ID" width="70" />
            <el-table-column prop="creatorId" label="发起人" width="80" />
            <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '进行中' : '已结束' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="人数" width="90">
              <template #default="{ row }">{{ onlineCount(row) }}/{{ row.participants?.length || 0 }}</template>
            </el-table-column>
            <el-table-column prop="startedAt" label="开始时间" width="180" :formatter="dateTimeFormatter" />
            <el-table-column label="回放" min-width="140">
              <template #default="{ row }">
                <el-button v-if="row.recordingUrl" type="primary" link size="small" @click="playRecording(row)">播放</el-button>
                <span v-else class="muted-text">未配置</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewMeetingDetail(row)">成员</el-button>
                <el-button v-if="row.status === 1" type="danger" link size="small" @click="endMeeting(row.id)">结束</el-button>
                <el-button type="primary" link size="small" @click="editRecording(row)">回放地址</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination :current-page="mtPage" :page-size="mtPageSize" :total="mtTotal"
              layout="total, prev, pager, next" @current-change="(p: number) => { mtPage = p; loadMeetings() }" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="建群审核" name="groups">
          <div class="toolbar">
            <el-button type="primary" @click="createSystemGroupFn">创建系统总群（沧恒云芯）</el-button>
            <el-button @click="loadPendingGroups">刷新</el-button>
          </div>
          <el-table :data="pendingGroups" v-loading="groupLoading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="群名称" width="200" />
            <el-table-column prop="creatorId" label="创建者ID" width="100" />
            <el-table-column prop="createdAt" label="申请时间" width="180" :formatter="dateTimeFormatter" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="success" link size="small" @click="reviewGroupFn(row.id, 'approve')">通过</el-button>
                <el-button type="danger" link size="small" @click="reviewGroupFn(row.id, 'reject')">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 会议成员详情弹窗 -->
    <el-dialog v-model="detailVisible" title="参会成员明细" width="500px" destroy-on-close>
      <el-table :data="detailParticipants" stripe size="small">
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="account" label="账号" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isKicked" type="danger" size="small">被踢</el-tag>
            <el-tag v-else-if="row.isOnline" type="success" size="small">在线</el-tag>
            <el-tag v-else type="info" size="small">已离开</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="80">
          <template #default="{ row }">
            <span v-if="row.isOwner" style="color:#409eff">群主</span>
            <span v-else-if="row.isCreator" style="color:#e6a23c">发起人</span>
            <span v-else>成员</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="recordingVisible" title="会议回放" width="760px" destroy-on-close>
      <video v-if="currentRecordingUrl" class="recording-player" :src="currentRecordingUrl" controls preload="metadata" />
      <el-empty v-else description="暂无回放地址" />
      <template #footer>
        <el-button @click="recordingVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { dateTimeFormatter } from '@/utils/format'

const activeTab = ref('messages')

// ===== 聊天记录 =====
const messages = ref<any[]>([])
const messageLoading = ref(false)
const msgPage = ref(1)
const msgPageSize = ref(30)
const msgTotal = ref(0)
const messageQuery = reactive({ keyword: '', conversationId: '', userId: '', msgType: '', dateRange: null as [string, string] | null })

// ===== 会议 =====
const meetings = ref<any[]>([])
const meetingLoading = ref(false)
const mtPage = ref(1)
const mtPageSize = ref(20)
const mtTotal = ref(0)
const meetingQuery = reactive({ status: '', groupId: '' })

// ===== 会议详情 =====
const detailVisible = ref(false)
const detailParticipants = ref<any[]>([])
const recordingVisible = ref(false)
const currentRecordingUrl = ref('')

function messageTypeText(type: number) {
  switch (type) {
    case 2: return '语音'
    case 3: return '系统'
    case 4: return '图片'
    case 5: return 'AI'
    default: return '文字'
  }
}

function onlineCount(row: any) {
  return row.participants?.filter((p: any) => p.isOnline).length || 0
}

async function loadMessages() {
  messageLoading.value = true
  try {
    const params: any = { page: msgPage.value, pageSize: msgPageSize.value }
    if (messageQuery.keyword) params.keyword = messageQuery.keyword
    if (messageQuery.conversationId) params.conversationId = messageQuery.conversationId
    if (messageQuery.userId) params.userId = messageQuery.userId
    if (messageQuery.msgType) params.msgType = messageQuery.msgType
    if (messageQuery.dateRange) {
      params.startDate = messageQuery.dateRange[0]
      params.endDate = messageQuery.dateRange[1]
    }
    const res: any = await request.get('/social/messages', { params })
    if (Array.isArray(res)) {
      messages.value = res
      msgTotal.value = res.length
    } else {
      messages.value = res.list || []
      msgTotal.value = res.total || 0
    }
  } finally { messageLoading.value = false }
}

async function loadMeetings() {
  meetingLoading.value = true
  try {
    const params: any = { page: mtPage.value, pageSize: mtPageSize.value }
    if (meetingQuery.status) params.status = meetingQuery.status
    if (meetingQuery.groupId) params.groupId = meetingQuery.groupId
    const res: any = await request.get('/social/meetings', { params })
    if (Array.isArray(res)) {
      meetings.value = res
      mtTotal.value = res.length
    } else {
      meetings.value = res.list || []
      mtTotal.value = res.total || 0
    }
  } finally { meetingLoading.value = false }
}

async function deleteMessage(id: number) {
  await ElMessageBox.confirm('确定删除这条聊天记录？', '确认', { type: 'warning' })
  await request.delete(`/social/messages/${id}`)
  ElMessage.success('已删除')
  loadMessages()
}

async function endMeeting(id: number) {
  await ElMessageBox.confirm('确定强制结束该会议？', '确认', { type: 'warning' })
  await request.put(`/social/meetings/${id}/end`)
  ElMessage.success('会议已结束')
  loadMeetings()
}

async function editRecording(row: any) {
  const { value } = await ElMessageBox.prompt('请输入会议回放地址', '回放地址', {
    inputValue: row.recordingUrl || '',
    confirmButtonText: '保存',
    cancelButtonText: '取消',
  })
  await request.put(`/social/meetings/${row.id}/recording`, { recordingUrl: value })
  ElMessage.success('已保存')
  loadMeetings()
}

function mediaUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/uploads/')) return `${window.location.protocol}//${window.location.hostname}:3001${url}`
  return url
}

function playRecording(row: any) {
  currentRecordingUrl.value = mediaUrl(row.recordingUrl || '')
  recordingVisible.value = true
}

function viewMeetingDetail(row: any) {
  detailParticipants.value = row.participants || []
  detailVisible.value = true
}

async function openCleanDialog() {
  const { value } = await ElMessageBox.prompt('保留最近多少天的数据？', '清理过期数据', {
    inputValue: '7',
    confirmButtonText: '清理',
    cancelButtonText: '取消',
  })
  const res: any = await request.post('/social/clean', { days: Number(value) || 7 })
  const msgCount = res?.messages ?? 0
  const mtCount = res?.meetings ?? 0
  const fileCount = res?.files ?? 0
  ElMessage.success(`清理完成：删除 ${msgCount} 条消息、${mtCount} 个会议、${fileCount} 个文件`)
  loadMessages()
  loadMeetings()
}

// ===== 建群审核 =====
const groupLoading = ref(false)
const pendingGroups = ref<any[]>([])

async function loadPendingGroups() {
  groupLoading.value = true
  try {
    const res: any = await request.get('/groups/pending', { params: { page: 1, pageSize: 50 } })
    pendingGroups.value = res.list || res || []
  } finally { groupLoading.value = false }
}

async function reviewGroupFn(id: number, action: 'approve' | 'reject') {
  await request.post(`/groups/${id}/review`, { action })
  ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
  loadPendingGroups()
}

async function createSystemGroupFn() {
  try {
    await ElMessageBox.confirm('确认创建系统总群"沧恒云芯"？新用户激活后将自动加入此群。', '提示')
    await request.post('/groups/system', { name: '沧恒云芯' })
    ElMessage.success('系统总群创建成功')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || '创建失败')
  }
}

onMounted(() => {
  loadMessages()
  loadMeetings()
  loadPendingGroups()
})
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 16px; }
.content-card { border-radius: 12px; border: none; }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.muted-text { color: #909399; font-size: 12px; }
.recording-player { width: 100%; max-height: 520px; background: #111827; border-radius: 8px; }
:deep(.el-table) { --el-table-border-color: transparent; --el-table-row-hover-bg-color: #f0f5ff; }
:deep(.el-table th.el-table__cell) { background-color: #fafafa; color: #606266; font-weight: 600; }
:deep(.el-table td.el-table__cell) { padding: 12px 0; }
</style>
