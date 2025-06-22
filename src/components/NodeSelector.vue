<template>
    <div class="node-selector">
        <div class="selector-header">
            <h3>添加节点</h3>
            <button @click="$emit('close')" class="close-btn">×</button>
        </div>

        <div class="node-types">
            <div v-for="nodeType in nodeTypes" :key="nodeType.type" class="node-type-item"
                @click="selectNodeType(nodeType)">
                <div class="node-type-icon">{{ nodeType.icon }}</div>
                <div class="node-type-info">
                    <div class="node-type-name">{{ nodeType.name }}</div>
                    <div class="node-type-desc">{{ nodeType.description }}</div>
                </div>
            </div>
        </div>

        <div v-if="selectedType" class="node-form">
            <h4>配置节点</h4>
            <div class="form-group">
                <label>节点名称</label>
                <input v-model="nodeData.label" type="text" placeholder="输入节点名称" />
            </div>

            <div class="form-group">
                <label>描述</label>
                <textarea v-model="nodeData.description" placeholder="输入节点描述"></textarea>
            </div>

            <div v-if="selectedType.type === 'task'" class="form-group">
                <label>负责人</label>
                <input v-model="nodeData.assignee" type="text" placeholder="输入负责人" />
            </div>

            <div v-if="selectedType.type === 'task'" class="form-group">
                <label>预计时长</label>
                <input v-model="nodeData.duration" type="text" placeholder="如：2小时" />
            </div>

            <div v-if="selectedType.type === 'task'" class="form-group">
                <label>优先级</label>
                <select v-model="nodeData.priority">
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                </select>
            </div>

            <div class="form-actions">
                <button @click="addNode" class="btn-primary">添加节点</button>
                <button @click="cancel" class="btn-secondary">取消</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

interface NodeType {
    type: string
    name: string
    description: string
    icon: string
}

interface NodeData {
    label: string
    type: string
    description: string
    assignee?: string
    duration?: string
    priority?: string
    status?: string
}

const emit = defineEmits<{
    close: []
    addNode: [nodeData: NodeData]
}>()

const nodeTypes: NodeType[] = [
    {
        type: 'start',
        name: '开始节点',
        description: '工作流的起始点',
        icon: '🚀'
    },
    {
        type: 'task',
        name: '任务节点',
        description: '需要执行的具体任务',
        icon: '📋'
    },
    {
        type: 'decision',
        name: '决策节点',
        description: '条件判断分支',
        icon: '❓'
    },
    {
        type: 'parallel',
        name: '并行节点',
        description: '并行执行多个任务',
        icon: '⚡'
    },
    {
        type: 'end',
        name: '结束节点',
        description: '工作流的结束点',
        icon: '🏁'
    },
    {
        type: 'note',
        name: '注释节点',
        description: '添加说明或备注',
        icon: '📝'
    }
]

const selectedType = ref<NodeType | null>(null)
const nodeData = reactive<NodeData>({
    label: '',
    type: '',
    description: '',
    assignee: '',
    duration: '',
    priority: 'medium',
    status: 'pending'
})

const selectNodeType = (nodeType: NodeType) => {
    selectedType.value = nodeType
    nodeData.type = nodeType.type
    nodeData.label = nodeType.name
    nodeData.description = ''
    nodeData.assignee = ''
    nodeData.duration = ''
    nodeData.priority = 'medium'
    nodeData.status = 'pending'
}

const addNode = () => {
    if (!nodeData.label.trim()) {
        alert('请输入节点名称')
        return
    }

    emit('addNode', { ...nodeData })
    cancel()
}

const cancel = () => {
    selectedType.value = null
    emit('close')
}
</script>

<style scoped>
.node-selector {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 1000;
}

.selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
}

.selector-header h3 {
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

.node-types {
    padding: 16px 20px;
}

.node-type-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-bottom: 8px;
}

.node-type-item:hover {
    background-color: #f5f5f5;
}

.node-type-icon {
    font-size: 20px;
    width: 32px;
    text-align: center;
}

.node-type-info {
    flex: 1;
}

.node-type-name {
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 2px;
}

.node-type-desc {
    font-size: 12px;
    color: #666;
}

.node-form {
    padding: 16px 20px;
    border-top: 1px solid #eee;
}

.node-form h4 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
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

.btn-primary,
.btn-secondary {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
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
</style>
