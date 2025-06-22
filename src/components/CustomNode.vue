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
  padding: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  min-width: 160px;
  max-width: 220px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.custom-node::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
  z-index: 0;
}

.custom-node:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.node-selected {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2), 0 12px 40px rgba(102, 126, 234, 0.3);
  transform: scale(1.05);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.node-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.node-title {
  font-weight: 700;
  font-size: 15px;
  flex: 1;
  color: #333;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.node-status {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.status-pending {
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  color: #666;
}

.status-running {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  color: #1890ff;
  animation: pulse 2s infinite;
}

.status-completed {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  color: #52c41a;
}

.status-failed {
  background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
  color: #ff4d4f;
}

.status-skipped {
  background: linear-gradient(135deg, #f9f9f9 0%, #f0f0f0 100%);
  color: #999;
}

.node-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
  position: relative;
  z-index: 1;
  font-style: italic;
}

.node-assignee {
  font-size: 11px;
  color: #667eea;
  margin-bottom: 8px;
  font-weight: 600;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-duration {
  font-size: 11px;
  color: #666;
  margin-top: 8px;
  font-weight: 500;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.decision-options {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.option {
  flex: 1;
  text-align: center;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.option.yes {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.option.no {
  background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

/* 节点类型样式 */
.node-type-start {
  border-color: #52c41a;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%);
}

.node-type-start .node-icon {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
}

.node-type-task {
  border-color: #1890ff;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%);
}

.node-type-task .node-icon {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
}

.node-type-decision {
  border-color: #faad14;
  background: linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.05) 100%);
}

.node-type-decision .node-icon {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(250, 173, 20, 0.4);
}

.node-type-end {
  border-color: #ff4d4f;
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 77, 79, 0.05) 100%);
}

.node-type-end .node-icon {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
}

.node-type-parallel {
  border-color: #722ed1;
  background: linear-gradient(135deg, rgba(114, 46, 209, 0.1) 0%, rgba(114, 46, 209, 0.05) 100%);
}

.node-type-parallel .node-icon {
  background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(114, 46, 209, 0.4);
}

.node-type-note {
  border-color: #13c2c2;
  background: linear-gradient(135deg, rgba(19, 194, 194, 0.1) 0%, rgba(19, 194, 194, 0.05) 100%);
}

.node-type-note .node-icon {
  background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(19, 194, 194, 0.4);
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-node {
  animation: fadeIn 0.6s ease-out;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .custom-node {
    padding: 12px;
    min-width: 140px;
    max-width: 180px;
    border-radius: 12px;
  }

  .node-header {
    gap: 8px;
    margin-bottom: 10px;
  }

  .node-icon {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }

  .node-title {
    font-size: 14px;
  }

  .node-status {
    font-size: 9px;
    padding: 3px 6px;
  }

  .node-description {
    font-size: 11px;
    margin-bottom: 6px;
  }

  .node-assignee,
  .node-duration {
    font-size: 10px;
    margin-bottom: 6px;
  }

  .decision-options {
    gap: 6px;
    margin-top: 10px;
  }

  .option {
    padding: 4px 8px;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .custom-node {
    padding: 10px;
    min-width: 120px;
    max-width: 160px;
    border-radius: 10px;
  }

  .node-icon {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .node-title {
    font-size: 13px;
  }

  .node-status {
    font-size: 8px;
    padding: 2px 5px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .custom-node {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .node-title {
    color: #fff;
  }

  .node-description {
    color: #ccc;
  }

  .node-duration {
    color: #ccc;
  }

  .node-icon {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .status-pending {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
    color: #ccc;
  }

  .status-running {
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.2) 0%, rgba(24, 144, 255, 0.1) 100%);
    color: #40a9ff;
  }

  .status-completed {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.2) 0%, rgba(82, 196, 26, 0.1) 100%);
    color: #73d13d;
  }

  .status-failed {
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.2) 0%, rgba(255, 77, 79, 0.1) 100%);
    color: #ff7875;
  }

  .status-skipped {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
    color: #999;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .custom-node:hover {
    transform: none;
  }

  .option:hover {
    transform: none;
  }

  .custom-node:active {
    transform: scale(0.98);
  }

  .option:active {
    transform: scale(0.95);
  }
}
</style>
