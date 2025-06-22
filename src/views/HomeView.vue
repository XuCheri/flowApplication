<script setup lang="ts">
import { ref, markRaw, onMounted, computed } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge, ConnectionLineType } from '@vue-flow/core'
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
  nodes.value.filter(n => n.data.status === 'completed').length
)

const canStartWorkflow = computed(() =>
  workflowStatus.value === 'idle' || workflowStatus.value === 'paused'
)

const canPauseWorkflow = computed(() => workflowStatus.value === 'running')

// 工作流控制
const startWorkflow = () => {
  workflowStatus.value = 'running'
  // 找到开始节点并设置为运行状态
  const startNode = nodes.value.find(n => n.data.type === 'start')
  if (startNode) {
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
    if (node.data.type !== 'start') {
      node.data.status = 'pending'
    } else {
      node.data.status = 'completed'
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
const handleConnect = ({ source, target, sourceHandle, targetHandle }: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => {
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
  const status = (node as Node<WorkflowNodeData>).data.status
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
        <button @click="showNodeSelector = true" class="btn-primary">➕ 添加节点</button>
        <button @click="showTemplates = true" class="btn-secondary">📋 模板</button>
        <button @click="deleteSelected">🗑 删除选中</button>
        <button @click="undo">↩️ 撤销</button>
        <button @click="redo">↪️ 重做</button>
      </div>

      <div class="toolbar-center">
        <button @click="startWorkflow" :disabled="!canStartWorkflow" class="btn-success">
          ▶️ 启动工作流
        </button>
        <button @click="pauseWorkflow" :disabled="!canPauseWorkflow" class="btn-warning">
          ⏸️ 暂停
        </button>
        <button @click="resetWorkflow" class="btn-secondary">🔄 重置</button>
      </div>

      <div class="toolbar-right">
        <button @click="saveToJSON">💾 保存</button>
        <input type="file" @change="loadFromJSON" />
        <button @click="exportAsImage">🖼️ 导出图片</button>
        <button @click="layoutFlow">📐 自动布局</button>
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
      :fit-view-on-init="true" :connection-line-style="{ stroke: '#1890ff', strokeWidth: 2 }"
      :connection-line-type="ConnectionLineType.SmoothStep" :default-edge-options="defaultEdgeOptions"
      @connect="handleConnect" @node-click="handleNodeClick" @edge-click="handleEdgeClick" class="vue-flow">
      <!-- 定义箭头标记 -->
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6"
          orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1890ff" />
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
    <div v-if="selectedNode" class="node-panel">
      <div class="panel-header">
        <h3>编辑节点</h3>
        <button @click="selectedNode = null" class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label>节点名称</label>
          <input v-model="selectedNode.data.label" type="text" />
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="selectedNode.data.description"></textarea>
        </div>
        <div v-if="selectedNode.data.type === 'task'" class="form-group">
          <label>负责人</label>
          <input v-model="selectedNode.data.assignee" type="text" />
        </div>
        <div v-if="selectedNode.data.type === 'task'" class="form-group">
          <label>预计时长</label>
          <input v-model="selectedNode.data.duration" type="text" />
        </div>
        <div v-if="selectedNode.data.type === 'task'" class="form-group">
          <label>状态</label>
          <select v-model="selectedNode.data.status">
            <option value="pending">待处理</option>
            <option value="running">执行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="skipped">已跳过</option>
          </select>
        </div>
        <div class="form-actions">
          <button @click="updateNode" class="btn-primary">保存</button>
          <button @click="selectedNode = null" class="btn-secondary">取消</button>
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
}

.toolbar {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-primary,
.btn-secondary,
.btn-success,
.btn-warning {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #40a9ff;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e8e8e8;
}

.btn-success {
  background-color: #52c41a;
  color: white;
}

.btn-success:hover {
  background-color: #73d13d;
}

.btn-success:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.btn-warning {
  background-color: #faad14;
  color: white;
}

.btn-warning:hover {
  background-color: #ffc53d;
}

.btn-warning:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.workflow-info {
  padding: 8px 16px;
  background: #e6f7ff;
  border-bottom: 1px solid #91d5ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-indicator {
  font-weight: 500;
  font-size: 14px;
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
  font-size: 12px;
  color: #666;
}

.vue-flow {
  flex: 1;
  background: #fafafa;
}

.vue-flow .vue-flow__node.selected {
  border: 2px solid #ff4d4f;
  box-shadow: 0 0 10px rgba(255, 77, 79, 0.6);
}

/* 连线样式优化 */
.vue-flow .vue-flow__edge {
  pointer-events: all;
}

.vue-flow .vue-flow__edge-path {
  stroke: #1890ff;
  stroke-width: 2;
  transition: all 0.2s ease;
}

.vue-flow .vue-flow__edge:hover .vue-flow__edge-path {
  stroke: #40a9ff;
  stroke-width: 3;
}

.vue-flow .vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #ff4d4f;
  stroke-width: 3;
}

/* 连接线样式 */
.vue-flow .vue-flow__connection-line {
  stroke: #1890ff;
  stroke-width: 2;
  stroke-dasharray: 5 5;
}

.vue-flow .vue-flow__connection-line:hover {
  stroke: #40a9ff;
  stroke-width: 3;
}

.node-panel {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #666;
}

.panel-content {
  padding: 16px 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group textarea {
  height: 60px;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  padding: 5px 10px;
  z-index: 1000;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.context-menu div {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
}

.context-menu div:hover {
  background: #f5f5f5;
}
</style>
