<template>
  <div class="custom-node" :class="[`node-type-${data.type}`, { 'node-selected': selected }]">
    <div class="node-header">
      <div class="node-icon">
        <span v-if="data.type === 'start'">🚀</span>
        <span v-else-if="data.type === 'task'">📋</span>
        <span v-else-if="data.type === 'decision'">❓</span>
        <span v-else-if="data.type === 'end'">🏁</span>
        <span v-else-if="data.type === 'parallel'">⚡</span>
        <span v-else>📝</span>
      </div>
      <div class="node-title">{{ data.label }}</div>
      <div v-if="data.status" class="node-status" :class="`status-${data.status}`">
        {{ getStatusText(data.status) }}
      </div>
    </div>

    <div v-if="data.description" class="node-description">
      {{ data.description }}
    </div>

    <div v-if="data.assignee" class="node-assignee">
      👤 {{ data.assignee }}
    </div>

    <div v-if="data.type === 'decision'" class="decision-options">
      <div class="option yes">✅ 是</div>
      <div class="option no">❌ 否</div>
    </div>

    <div v-if="data.type === 'task' && data.duration" class="node-duration">
      ⏱️ {{ data.duration }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'

interface WorkflowNodeData {
  label: string
  type: 'start' | 'task' | 'decision' | 'end' | 'parallel' | 'note'
  description?: string
  assignee?: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  duration?: string
  priority?: 'low' | 'medium' | 'high'
}

defineProps<NodeProps<WorkflowNodeData>>()

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    skipped: '已跳过'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.custom-node {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: white;
  min-width: 150px;
  max-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.custom-node:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.node-selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.node-icon {
  font-size: 16px;
}

.node-title {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.node-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.status-pending {
  background-color: #f0f0f0;
  color: #666;
}

.status-running {
  background-color: #e6f7ff;
  color: #1890ff;
}

.status-completed {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-failed {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.status-skipped {
  background-color: #f9f9f9;
  color: #999;
}

.node-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  line-height: 1.4;
}

.node-assignee {
  font-size: 11px;
  color: #1890ff;
  margin-bottom: 6px;
}

.node-duration {
  font-size: 11px;
  color: #666;
  margin-top: 6px;
}

.decision-options {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.option {
  flex: 1;
  text-align: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.option.yes {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.option.no {
  background-color: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

/* 节点类型样式 */
.node-type-start {
  border-color: #52c41a;
  background-color: #f6ffed;
}

.node-type-task {
  border-color: #1890ff;
  background-color: #f0f8ff;
}

.node-type-decision {
  border-color: #faad14;
  background-color: #fffbe6;
}

.node-type-end {
  border-color: #ff4d4f;
  background-color: #fff2f0;
}

.node-type-parallel {
  border-color: #722ed1;
  background-color: #f9f0ff;
}

.node-type-note {
  border-color: #13c2c2;
  background-color: #e6fffb;
}
</style>
