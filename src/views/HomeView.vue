<script setup lang="ts">
import { ref, markRaw, onMounted, computed } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge, type Connection, ConnectionLineType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import CustomNode from '../components/CustomNode.vue'
import CustomEdge from '../components/CustomEdge.vue'
import NodeSelector from '../components/NodeSelector.vue'
import WorkflowTemplates from '../components/WorkflowTemplates.vue'
import { toPng } from 'html-to-image'
import dagre from 'dagre'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

interface WorkflowNodeData {
  label: string
  type: 'start' | 'task' | 'decision' | 'end' | 'parallel' | 'note'
  description?: string
  assignee?: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  duration?: string
  priority?: 'low' | 'medium' | 'high'
}

const nodeTypes = { custom: markRaw(CustomNode) }
const edgeTypes = { custom: markRaw(CustomEdge) }

const nodes = ref<Node<WorkflowNodeData>[]>([
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: '开始',
      type: 'start',
      status: 'completed'
    },
  },
])
const edges = ref<Edge[]>([])
let idCounter = 2

const {
  addNodes,
  removeNodes,
  addEdges,
  removeEdges,
  onNodeDrag,
  onNodeDragStop,
  findNode,
  getNodes,
  getElements,
  vueFlowRef,
  toObject,
} = useVueFlow()

// 工作流状态
const workflowStatus = ref<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle')
const showNodeSelector = ref(false)
const showTemplates = ref(false)
const selectedNode = ref<Node<WorkflowNodeData> | null>(null)
const contextMenuRef = ref<{ x: number; y: number; nodeId: string | null } | null>(null)

// 计算属性
const totalNodes = computed(() => nodes.value.length)
const completedNodes = computed(() =>
  nodes.value.filter(n => n.data?.status === 'completed').length
)

const canStartWorkflow = computed(() =>
  workflowStatus.value === 'idle' || workflowStatus.value === 'paused'
)

const canPauseWorkflow = computed(() => workflowStatus.value === 'running')

// 工作流控制
const startWorkflow = () => {
  workflowStatus.value = 'running'
  // 找到开始节点并设置为运行状态
  const startNode = nodes.value.find(n => n.data?.type === 'start')
  if (startNode && startNode.data) {
    startNode.data.status = 'running'
  }
  // 这里可以添加工作流执行逻辑
}

const pauseWorkflow = () => {
  workflowStatus.value = 'paused'
}

const resetWorkflow = () => {
  workflowStatus.value = 'idle'
  nodes.value.forEach(node => {
    if (node.data) {
      if (node.data.type !== 'start') {
        node.data.status = 'pending'
      } else {
        node.data.status = 'completed'
      }
    }
  })
}

const getWorkflowStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    idle: '待启动',
    running: '执行中',
    paused: '已暂停',
    completed: '已完成',
    failed: '执行失败'
  }
  return statusMap[status] || status
}

// 节点操作
const addNodeFromSelector = (nodeData: any) => {
  const id = String(idCounter++)
  const newNode = {
    id,
    type: 'custom',
    position: { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 },
    data: {
      ...nodeData,
      status: nodeData.type === 'start' ? 'completed' : 'pending'
    },
  }
  addNodes([newNode])
  pushToUndo()
}

const handleNodeClick = (event: any) => {
  selectedNode.value = event.node
}

const handleEdgeClick = (event: any) => {
  // 可以在这里添加边的编辑功能
  console.log('Edge clicked:', event.edge)
}

const updateNode = () => {
  if (selectedNode.value) {
    // 节点数据会自动更新，因为使用了v-model
    selectedNode.value = null
    pushToUndo()
  }
}

// 拖动自动连接
onNodeDragStop(({ node }) => {
  const target = findNearbyNode(node)
  if (target && target.id !== node.id) {
    const exists = edges.value.some(e => e.source === node.id && e.target === target.id)
    if (!exists) {
      addEdges([{ id: `e-${node.id}-${target.id}`, source: node.id, target: target.id }])
      pushToUndo()
    }
  }
})

onNodeDrag(({ node }) => {
  const target = findNearbyNode(node)
  highlightNode(target?.id)
})

function findNearbyNode(draggedNode: Node): Node | null {
  const radius = 100
  return nodes.value.find(n =>
    n.id !== draggedNode.id &&
    Math.hypot(n.position.x - draggedNode.position.x, n.position.y - draggedNode.position.y) < radius
  ) || null
}

function highlightNode(id?: string) {
  nodes.value = nodes.value.map(n => ({
    ...n,
    style: {
      ...(n.style || {}),
      border: id === n.id ? '2px dashed #52c41a' : '1px solid #ccc',
      boxShadow: id === n.id ? '0 0 10px #52c41a' : 'none',
    },
  }))
}

const deleteSelected = () => {
  const selectedNodes = getNodes.value.filter((n: Node) => (n as any).selected)
  const selectedEdges = edges.value.filter((e: Edge) => (e as any).selected)
  if (selectedNodes.length) removeNodes(selectedNodes.map((n: Node) => n.id))
  if (selectedEdges.length) removeEdges(selectedEdges.map((e: Edge) => e.id))
  if (selectedNodes.length || selectedEdges.length) pushToUndo()
}

// 快捷键支持
onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete') deleteSelected()
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo()
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo()
  })
})

// 撤销/重做支持
const history = ref<{ nodes: Node[]; edges: Edge[] }[]>([])
const future = ref<{ nodes: Node[]; edges: Edge[] }[]>([])
const pushToUndo = () => {
  history.value.push({
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value)),
  })
  future.value = []
}
const undo = () => {
  if (!history.value.length) return
  future.value.push({ nodes: nodes.value, edges: edges.value })
  const prev = history.value.pop()
  if (prev) {
    nodes.value = prev.nodes
    edges.value = prev.edges
  }
}
const redo = () => {
  if (!future.value.length) return
  history.value.push({ nodes: nodes.value, edges: edges.value })
  const next = future.value.pop()
  if (next) {
    nodes.value = next.nodes
    edges.value = next.edges
  }
}

// 导入导出 JSON
const saveToJSON = () => {
  const data = {
    nodes: nodes.value,
    edges: edges.value,
    workflowStatus: workflowStatus.value
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'workflow-diagram.json'
  link.click()
  URL.revokeObjectURL(url)
}

const loadFromJSON = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const result = JSON.parse(e.target?.result as string)
      nodes.value = result.nodes || []
      edges.value = result.edges || []
      workflowStatus.value = result.workflowStatus || 'idle'
      pushToUndo()
    } catch {
      alert('❌ JSON 解析失败')
    }
  }
  reader.readAsText(file)
}

// 导出图片
const exportAsImage = () => {
  const el = document.querySelector('.vue-flow')
  if (!el) return
  toPng(el as HTMLElement).then((url) => {
    const link = document.createElement('a')
    link.href = url
    link.download = 'workflow-diagram.png'
    link.click()
  })
}

// 自动布局
const layoutFlow = () => {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR' })
  g.setDefaultEdgeLabel(() => ({}))
  nodes.value.forEach((n) => g.setNode(n.id, { width: 150, height: 50 }))
  edges.value.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  nodes.value = nodes.value.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - 75, y: pos.y - 25 } }
  })
}

// 右键菜单
const onContextMenu = (e: MouseEvent, nodeId: string) => {
  e.preventDefault()
  contextMenuRef.value = { x: e.clientX, y: e.clientY, nodeId }
}

const handleMenu = (action: string) => {
  if (!contextMenuRef.value) return
  const { nodeId } = contextMenuRef.value
  const node = nodes.value.find(n => n.id === nodeId)

  if (action === 'edit' && node) {
    selectedNode.value = node
  } else if (action === 'delete' && nodeId) {
    removeNodes([nodeId])
  } else if (action === 'add' && nodeId) {
    showNodeSelector.value = true
  }
  contextMenuRef.value = null
}

// 连线时处理
const handleConnect = (connection: Connection) => {
  const { source, target } = connection
  if (!source || !target) return

  const exists = edges.value.some((e) => e.source === source && e.target === target)
  if (!exists) {
    // 创建新的边，使用自定义类型
    const newEdge = {
      id: `e-${source}-${target}`,
      source,
      target,
      type: 'custom',
      data: { label: '' }, // 可以在这里添加连线标签
      style: {
        stroke: '#1890ff',
        strokeWidth: 2
      }
    }
    edges.value.push(newEdge)
    pushToUndo()
  }
}

const getNodeColor = (node: Node) => {
  const status = (node as Node<WorkflowNodeData>).data?.status
  switch (status) {
    case 'completed': return '#52c41a'
    case 'running': return '#1890ff'
    case 'failed': return '#ff4d4f'
    case 'skipped': return '#999'
    default: return '#d9d9d9'
  }
}

const loadTemplate = (template: any) => {
  // 重置当前工作流
  nodes.value = template.nodes
  edges.value = template.edges
  workflowStatus.value = 'idle'

  // 更新ID计数器
  const maxId = Math.max(...template.nodes.map((n: any) => parseInt(n.id)), 0)
  idCounter = maxId + 1

  // 保存到历史记录
  pushToUndo()

  console.log('模板加载完成:', template.name)
}

// 默认边配置
const defaultEdgeOptions = {
  type: 'custom' as const,
  style: {
    stroke: '#1890ff',
    strokeWidth: 2,
    strokeDasharray: 'none'
  },
  animated: false,
  labelBgStyle: {
    fill: '#fff',
    fillOpacity: 0.8
  },
  labelBgPadding: [4, 4] as [number, number],
  labelBgBorderRadius: 4
}
</script>

<template>
  <div class="flow-container">
    <div class="toolbar">
      <div class="toolbar-left">
        <button @click="showNodeSelector = true" class="btn btn-primary">➕ 添加节点</button>
        <button @click="showTemplates = true" class="btn btn-secondary">📋 模板</button>
        <button @click="deleteSelected" class="btn btn-danger">🗑 删除选中</button>
        <button @click="undo" class="btn btn-secondary">↩️ 撤销</button>
        <button @click="redo" class="btn btn-secondary">↪️ 重做</button>
      </div>

      <div class="toolbar-center">
        <button @click="startWorkflow" :disabled="!canStartWorkflow" class="btn btn-success">
          ▶️ 启动工作流
        </button>
        <button @click="pauseWorkflow" :disabled="!canPauseWorkflow" class="btn btn-warning">
          ⏸️ 暂停
        </button>
        <button @click="resetWorkflow" class="btn btn-secondary">🔄 重置</button>
      </div>

      <div class="toolbar-right">
        <button @click="saveToJSON" class="btn btn-secondary">💾 保存</button>
        <label for="file-upload" class="btn btn-secondary">📁 导入</label>
        <input id="file-upload" type="file" @change="loadFromJSON" accept=".json" />
        <button @click="exportAsImage" class="btn btn-secondary">🖼️ 导出图片</button>
        <button @click="layoutFlow" class="btn btn-secondary">📐 自动布局</button>
      </div>
    </div>

    <div class="workflow-info" v-if="workflowStatus">
      <div class="status-indicator" :class="`status-${workflowStatus}`">
        {{ getWorkflowStatusText(workflowStatus) }}
      </div>
      <div class="progress-info">
        已完成: {{ completedNodes }}/{{ totalNodes }} 节点
      </div>
    </div>

    <VueFlow v-model:nodes="nodes" v-model:edges="edges" :node-types="nodeTypes" :edge-types="edgeTypes"
      :fit-view-on-init="true" :connection-line-style="{ stroke: '#667eea', strokeWidth: 3 }"
      :connection-line-type="ConnectionLineType.SmoothStep" :default-edge-options="defaultEdgeOptions"
      @connect="handleConnect" @node-click="handleNodeClick" @edge-click="handleEdgeClick" class="vue-flow">
      <!-- 定义箭头标记 -->
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6"
          orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#667eea" />
        </marker>
      </defs>

      <Background variant="dots" :gap="12" :size="1" />
      <MiniMap :node-color="getNodeColor" />
      <Controls />
    </VueFlow>

    <!-- 节点选择器 -->
    <NodeSelector v-if="showNodeSelector" @close="showNodeSelector = false" @add-node="addNodeFromSelector" />

    <!-- 工作流模板 -->
    <WorkflowTemplates v-if="showTemplates" @close="showTemplates = false" @select-template="loadTemplate" />

    <!-- 节点编辑面板 -->
    <div v-if="selectedNode && selectedNode.data" class="node-panel">
      <div class="panel-header">
        <h3>编辑节点</h3>
        <button @click="selectedNode = null" class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label>节点名称</label>
          <input v-model="selectedNode.data.label" type="text" class="input" />
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="selectedNode.data.description" class="input"></textarea>
        </div>
        <div v-if="selectedNode.data.type === 'task'" class="form-group">
          <label>负责人</label>
          <input v-model="selectedNode.data.assignee" type="text" class="input" />
        </div>
        <div v-if="selectedNode.data.type === 'task'" class="form-group">
          <label>预计时长</label>
          <input v-model="selectedNode.data.duration" type="text" class="input" />
        </div>
        <div v-if="selectedNode.data.type === 'task'" class="form-group">
          <label>状态</label>
          <select v-model="selectedNode.data.status" class="input">
            <option value="pending">待处理</option>
            <option value="running">执行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="skipped">已跳过</option>
          </select>
        </div>
        <div class="form-actions">
          <button @click="updateNode" class="btn btn-primary">保存</button>
          <button @click="selectedNode = null" class="btn btn-secondary">取消</button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-if="contextMenuRef" class="context-menu"
      :style="{ top: contextMenuRef.y + 'px', left: contextMenuRef.x + 'px' }">
      <div @click="handleMenu('edit')">✏️ 编辑节点</div>
      <div @click="handleMenu('add')">➕ 添加子节点</div>
      <div @click="handleMenu('delete')">🗑 删除该节点</div>
    </div>
  </div>
</template>

<style>
.flow-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.flow-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  pointer-events: none;
  z-index: 0;
}

.toolbar {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  position: relative;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar button {
  @extend .btn;
  font-size: 13px;
  padding: 10px 16px;
  min-height: 40px;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 11px;
}

.toolbar input[type="file"] {
  display: none;
}

.toolbar input[type="file"] + label {
  @extend .btn;
  @extend .btn-secondary;
  cursor: pointer;
  margin: 0;
}

.workflow-info {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.status-indicator {
  font-weight: 600;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

.status-idle {
  color: #666;
}

.status-running {
  color: #1890ff;
}

.status-paused {
  color: #faad14;
}

.status-completed {
  color: #52c41a;
}

.status-failed {
  color: #ff4d4f;
}

.progress-info {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.7);
  padding: 6px 12px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.vue-flow {
  flex: 1;
  background: rgba(250, 250, 250, 0.8);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 5;
}

.vue-flow .vue-flow__node.selected {
  border: 3px solid #667eea;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
  transform: scale(1.02);
}

/* 连线样式优化 */
.vue-flow .vue-flow__edge {
  pointer-events: all;
}

.vue-flow .vue-flow__edge-path {
  stroke: #667eea;
  stroke-width: 3;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3));
}

.vue-flow .vue-flow__edge:hover .vue-flow__edge-path {
  stroke: #764ba2;
  stroke-width: 4;
  filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.5));
}

.vue-flow .vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #ff6b6b;
  stroke-width: 4;
  filter: drop-shadow(0 4px 8px rgba(255, 107, 107, 0.5));
}

/* 连接线样式 */
.vue-flow .vue-flow__connection-line {
  stroke: #667eea;
  stroke-width: 3;
  stroke-dasharray: 8 8;
  filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3));
}

.vue-flow .vue-flow__connection-line:hover {
  stroke: #764ba2;
  stroke-width: 4;
  filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.5));
}

.node-panel {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideIn 0.3s ease-out;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px 16px 0 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  transform: scale(1.1);
}

.panel-content {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea,
.form-group select {
  @extend .input;
  font-size: 14px;
  border-radius: 10px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background: rgba(255, 255, 255, 1);
}

.form-group textarea {
  height: 80px;
  resize: vertical;
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.form-actions button {
  @extend .btn;
  font-size: 13px;
  padding: 10px 20px;
  min-height: 40px;
}

.context-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 0;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  animation: fadeIn 0.2s ease-out;
  min-width: 160px;
}

.context-menu div {
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s ease;
  margin: 0 8px;
}

.context-menu div:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  transform: translateX(4px);
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .toolbar {
    padding: 12px 16px;
    flex-direction: column;
    gap: 8px;
  }

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .toolbar button {
    font-size: 11px;
    padding: 8px 12px;
    min-height: 36px;
  }

  .workflow-info {
    padding: 10px 16px;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .node-panel {
    right: 10px;
    left: 10px;
    width: auto;
    max-width: none;
    transform: translateY(-50%);
  }

  .panel-content {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .toolbar button {
    font-size: 10px;
    padding: 6px 10px;
    min-height: 32px;
  }

  .status-indicator {
    font-size: 12px;
    padding: 4px 8px;
  }

  .progress-info {
    font-size: 11px;
    padding: 4px 8px;
  }

  .node-panel {
    top: 10px;
    right: 10px;
    left: 10px;
    bottom: 10px;
    transform: none;
    max-height: none;
  }

  .panel-header {
    padding: 16px 20px;
  }

  .panel-header h3 {
    font-size: 16px;
  }

  .panel-content {
    padding: 16px 20px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .flow-container {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  }

  .toolbar {
    background: rgba(0, 0, 0, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .workflow-info {
    background: rgba(0, 0, 0, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .status-indicator {
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
  }

  .progress-info {
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
  }

  .vue-flow {
    background: rgba(0, 0, 0, 0.6);
  }

  .node-panel {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .panel-header {
    background: rgba(0, 0, 0, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .panel-header h3 {
    color: #fff;
  }

  .form-group label {
    color: #fff;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    background: rgba(0, 0, 0, 0.8);
  }

  .context-menu {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .context-menu div {
    color: #fff;
  }

  .context-menu div:hover {
    background: rgba(102, 126, 234, 0.2);
  }
}
</style>
