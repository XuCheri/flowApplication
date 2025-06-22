<template>
    <div class="workflow-templates">
        <div class="templates-header">
            <h3>工作流模板</h3>
            <button @click="$emit('close')" class="close-btn">×</button>
        </div>

        <div class="templates-list">
            <div v-for="template in templates" :key="template.id" class="template-item"
                @click="selectTemplate(template)">
                <div class="template-icon">{{ template.icon }}</div>
                <div class="template-info">
                    <div class="template-name">{{ template.name }}</div>
                    <div class="template-desc">{{ template.description }}</div>
                    <div class="template-nodes">{{ template.nodes.length }} 个节点</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'

interface WorkflowNodeData {
    label: string
    type: 'start' | 'task' | 'decision' | 'end' | 'parallel' | 'note'
    description?: string
    assignee?: string
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    duration?: string
    priority?: 'low' | 'medium' | 'high'
}

interface WorkflowTemplate {
    id: string
    name: string
    description: string
    icon: string
    nodes: Node<WorkflowNodeData>[]
    edges: Edge[]
}

const emit = defineEmits<{
    close: []
    selectTemplate: [template: WorkflowTemplate]
}>()

const templates: WorkflowTemplate[] = [
    {
        id: 'simple-approval',
        name: '简单审批流程',
        description: '适用于简单的审批场景',
        icon: '📋',
        nodes: [
            {
                id: '1',
                type: 'custom',
                position: { x: 100, y: 100 },
                data: {
                    label: '提交申请',
                    type: 'start',
                    status: 'completed'
                }
            },
            {
                id: '2',
                type: 'custom',
                position: { x: 300, y: 100 },
                data: {
                    label: '部门审批',
                    type: 'task',
                    description: '部门经理审批',
                    assignee: '部门经理',
                    status: 'pending'
                }
            },
            {
                id: '3',
                type: 'custom',
                position: { x: 500, y: 100 },
                data: {
                    label: '是否通过？',
                    type: 'decision',
                    description: '审批结果判断',
                    status: 'pending'
                }
            },
            {
                id: '4',
                type: 'custom',
                position: { x: 700, y: 50 },
                data: {
                    label: '通过',
                    type: 'task',
                    description: '流程通过',
                    status: 'pending'
                }
            },
            {
                id: '5',
                type: 'custom',
                position: { x: 700, y: 150 },
                data: {
                    label: '拒绝',
                    type: 'task',
                    description: '流程拒绝',
                    status: 'pending'
                }
            },
            {
                id: '6',
                type: 'custom',
                position: { x: 900, y: 100 },
                data: {
                    label: '结束',
                    type: 'end',
                    status: 'pending'
                }
            }
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e3-5', source: '3', target: '5' },
            { id: 'e4-6', source: '4', target: '6' },
            { id: 'e5-6', source: '5', target: '6' }
        ]
    },
    {
        id: 'project-management',
        name: '项目管理流程',
        description: '适用于项目开发管理',
        icon: '🚀',
        nodes: [
            {
                id: '1',
                type: 'custom',
                position: { x: 100, y: 100 },
                data: {
                    label: '项目启动',
                    type: 'start',
                    status: 'completed'
                }
            },
            {
                id: '2',
                type: 'custom',
                position: { x: 300, y: 100 },
                data: {
                    label: '需求分析',
                    type: 'task',
                    description: '分析项目需求',
                    assignee: '产品经理',
                    duration: '3天',
                    status: 'pending'
                }
            },
            {
                id: '3',
                type: 'custom',
                position: { x: 500, y: 100 },
                data: {
                    label: '设计开发',
                    type: 'parallel',
                    description: '并行进行设计和开发',
                    status: 'pending'
                }
            },
            {
                id: '4',
                type: 'custom',
                position: { x: 700, y: 50 },
                data: {
                    label: 'UI设计',
                    type: 'task',
                    description: '界面设计',
                    assignee: 'UI设计师',
                    duration: '5天',
                    status: 'pending'
                }
            },
            {
                id: '5',
                type: 'custom',
                position: { x: 700, y: 150 },
                data: {
                    label: '后端开发',
                    type: 'task',
                    description: '后端接口开发',
                    assignee: '后端工程师',
                    duration: '7天',
                    status: 'pending'
                }
            },
            {
                id: '6',
                type: 'custom',
                position: { x: 900, y: 100 },
                data: {
                    label: '测试验收',
                    type: 'task',
                    description: '功能测试和验收',
                    assignee: '测试工程师',
                    duration: '2天',
                    status: 'pending'
                }
            },
            {
                id: '7',
                type: 'custom',
                position: { x: 1100, y: 100 },
                data: {
                    label: '项目完成',
                    type: 'end',
                    status: 'pending'
                }
            }
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e3-5', source: '3', target: '5' },
            { id: 'e4-6', source: '4', target: '6' },
            { id: 'e5-6', source: '5', target: '6' },
            { id: 'e6-7', source: '6', target: '7' }
        ]
    },
    {
        id: 'customer-service',
        name: '客服处理流程',
        description: '适用于客户服务场景',
        icon: '🎧',
        nodes: [
            {
                id: '1',
                type: 'custom',
                position: { x: 100, y: 100 },
                data: {
                    label: '客户咨询',
                    type: 'start',
                    status: 'completed'
                }
            },
            {
                id: '2',
                type: 'custom',
                position: { x: 300, y: 100 },
                data: {
                    label: '问题分类',
                    type: 'decision',
                    description: '判断问题类型',
                    status: 'pending'
                }
            },
            {
                id: '3',
                type: 'custom',
                position: { x: 500, y: 50 },
                data: {
                    label: '简单问题',
                    type: 'task',
                    description: '一线客服处理',
                    assignee: '一线客服',
                    duration: '10分钟',
                    status: 'pending'
                }
            },
            {
                id: '4',
                type: 'custom',
                position: { x: 500, y: 150 },
                data: {
                    label: '复杂问题',
                    type: 'task',
                    description: '转接专业客服',
                    assignee: '专业客服',
                    duration: '30分钟',
                    status: 'pending'
                }
            },
            {
                id: '5',
                type: 'custom',
                position: { x: 700, y: 100 },
                data: {
                    label: '问题解决',
                    type: 'task',
                    description: '确认问题解决',
                    assignee: '客服主管',
                    status: 'pending'
                }
            },
            {
                id: '6',
                type: 'custom',
                position: { x: 900, y: 100 },
                data: {
                    label: '服务结束',
                    type: 'end',
                    status: 'pending'
                }
            }
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e2-4', source: '2', target: '4' },
            { id: 'e3-5', source: '3', target: '5' },
            { id: 'e4-5', source: '4', target: '5' },
            { id: 'e5-6', source: '5', target: '6' }
        ]
    }
]

const selectTemplate = (template: WorkflowTemplate) => {
    emit('selectTemplate', template)
    emit('close')
}
</script>

<style scoped>
.workflow-templates {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 1000;
}

.templates-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
}

.templates-header h3 {
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

.templates-list {
    padding: 16px 20px;
}

.template-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid #eee;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 12px;
}

.template-item:hover {
    border-color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.template-icon {
    font-size: 24px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    border-radius: 8px;
}

.template-info {
    flex: 1;
}

.template-name {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 4px;
    color: #333;
}

.template-desc {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
    line-height: 1.4;
}

.template-nodes {
    font-size: 12px;
    color: #999;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 12px;
    display: inline-block;
}
</style>
