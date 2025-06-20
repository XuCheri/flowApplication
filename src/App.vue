<template>
  <div class="flow-container">
    <div class="toolbar">
      <button @click="addNode">➕ 添加节点</button>
      <button @click="deleteSelected">🗑 删除选中</button>
      <button @click="undo">↩️ 撤销</button>
      <button @click="redo">↪️ 重做</button>
      <button @click="saveToJSON">💾 保存</button>
      <input type="file" @change="loadFromJSON" />
      <button @click="exportAsImage">🖼️ 导出图片</button>
      <button @click="layoutFlow">📐 自动布局</button>
    </div>

    <VueFlow v-model:nodes="nodes" v-model:edges="edges" :node-types="nodeTypes" :fit-view-on-init="true"
      :connection-line-style="{ stroke: '#1890ff', strokeWidth: 2 }" connection-line-type="bezier"
      @connect="handleConnect" class="vue-flow">
      <Background variant="dots" gap="12" size="1" />
      <MiniMap :node-color="getNodeColor" />
      <Controls />
    </VueFlow>

    <div v-if="contextMenuRef" class="context-menu"
      :style="{ top: contextMenuRef.y + 'px', left: contextMenuRef.x + 'px' }">
      <div @click="handleMenu('add')">➕ 添加子节点</div>
      <div @click="handleMenu('delete')">🗑 删除该节点</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, onMounted } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import CustomNode from './components/CustomNode.vue'
import { toPng } from 'html-to-image'
import dagre from 'dagre'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const nodeTypes = { custom: markRaw(CustomNode) }

const nodes = ref<Node[]>([
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: { label: '我是自定义节点' },
  },
])
const edges = ref<Edge[]>([])
let idCounter = 2

const {
  addNodes,
  removeNodes,
  addEdges,
  onNodeDrag,
  onNodeDragStop,
  findNode,
  getElements,
  vueFlowRef,
  toObject,
} = useVueFlow()

// 需要获取最新节点和边数据时，直接用 nodes.value / edges.value
// 如果要查找已渲染的 node 对象（含 layout 等信息），应使用 findNode(id)


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

const addNode = () => {
  const id = String(idCounter++)
  const newNode = {
    id,
    type: 'custom',
    position: { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 },
    data: { label: `节点 ${id}` },
  }
  addNodes([newNode])
  pushToUndo()
}

const deleteSelected = () => {
  const selectedNodes = getNodes().filter(n => n.selected)
  const selectedEdges = edges.value.filter(e => e.selected)
  if (selectedNodes.length) removeNodes(selectedNodes.map(n => n.id))
  if (selectedEdges.length) removeEdges(selectedEdges.map(e => e.id))
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
  const data = { nodes: nodes.value, edges: edges.value }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'vueflow-diagram.json'
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
    link.download = 'diagram.png'
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
const contextMenuRef = ref<{ x: number; y: number; nodeId: string | null } | null>(null)
const onContextMenu = (e: MouseEvent, nodeId: string) => {
  e.preventDefault()
  contextMenuRef.value = { x: e.clientX, y: e.clientY, nodeId }
}
const handleMenu = (action: string) => {
  if (!contextMenuRef.value) return
  const { nodeId } = contextMenuRef.value
  if (action === 'delete' && nodeId) removeNodes([nodeId])
  if (action === 'add' && nodeId) {
    const newId = String(idCounter++)
    addNodes([{ id: newId, type: 'custom', position: { x: 300, y: 300 }, data: { label: `子节点 ${newId}` } }])
    addEdges([{ id: `e-${nodeId}-${newId}`, source: nodeId, target: newId }])
  }
  contextMenuRef.value = null
}

// 连线时处理
const handleConnect = ({ source, target }: { source: string; target: string }) => {
  const exists = edges.value.some((e) => e.source === source && e.target === target)
  if (!exists) {
    edges.value.push({ id: `e-${source}-${target}`, source, target })
    pushToUndo()
  }
}

const getNodeColor = (node: Node) => node.id === '1' ? '#9fd0e4' : '#b6d7a8'
</script>

<style>
#app {
  margin: 0;
  padding: 0;
}

.flow-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 10px;
  background: #f3f3f3;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.vue-flow {
  flex: 1;
  background: #fafafa;
}

.vue-flow .vue-flow__node.selected {
  border: 2px solid #ff4d4f;
  box-shadow: 0 0 10px rgba(255, 77, 79, 0.6);
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  padding: 5px 10px;
  z-index: 1000;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
}

.context-menu div {
  padding: 5px;
  cursor: pointer;
}

.context-menu div:hover {
  background: #eee;
}
</style>
