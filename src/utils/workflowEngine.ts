import type { Node, Edge } from '@vue-flow/core'

export interface WorkflowNodeData {
    label: string
    type: 'start' | 'task' | 'decision' | 'end' | 'parallel' | 'note'
    description?: string
    assignee?: string
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    duration?: string
    priority?: 'low' | 'medium' | 'high'
    condition?: string // 决策节点的条件
}

export interface WorkflowStep {
    nodeId: string
    nodeType: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    startTime?: Date
    endTime?: Date
    assignee?: string
    result?: any
}

export class WorkflowEngine {
    private nodes: Node<WorkflowNodeData>[]
    private edges: Edge[]
    private executionHistory: WorkflowStep[] = []
    private currentStep: WorkflowStep | null = null
    private isRunning = false

    constructor(nodes: Node<WorkflowNodeData>[], edges: Edge[]) {
        this.nodes = nodes
        this.edges = edges
    }

    // 启动工作流
    start(): void {
        this.isRunning = true
        this.executionHistory = []

        // 找到开始节点
        const startNode = this.nodes.find(n => n.data.type === 'start')
        if (!startNode) {
            throw new Error('未找到开始节点')
        }

        // 创建第一个执行步骤
        this.currentStep = {
            nodeId: startNode.id,
            nodeType: startNode.data.type,
            status: 'running',
            startTime: new Date()
        }

        this.executionHistory.push(this.currentStep)

        // 更新节点状态
        startNode.data.status = 'running'

        console.log('工作流已启动，当前步骤:', this.currentStep)
    }

    // 执行下一步
    next(): WorkflowStep | null {
        if (!this.isRunning || !this.currentStep) {
            return null
        }

        // 完成当前步骤
        this.completeCurrentStep()

        // 找到下一个可执行的节点
        const nextNode = this.findNextNode(this.currentStep.nodeId)
        if (!nextNode) {
            this.isRunning = false
            console.log('工作流执行完成')
            return null
        }

        // 创建新的执行步骤
        this.currentStep = {
            nodeId: nextNode.id,
            nodeType: nextNode.data.type,
            status: 'running',
            startTime: new Date()
        }

        this.executionHistory.push(this.currentStep)
        nextNode.data.status = 'running'

        console.log('执行下一步:', this.currentStep)
        return this.currentStep
    }

    // 完成当前步骤
    completeCurrentStep(): void {
        if (!this.currentStep) return

        this.currentStep.status = 'completed'
        this.currentStep.endTime = new Date()

        // 更新节点状态
        const node = this.nodes.find(n => n.id === this.currentStep!.nodeId)
        if (node) {
            node.data.status = 'completed'
        }
    }

    // 跳过当前步骤
    skipCurrentStep(): void {
        if (!this.currentStep) return

        this.currentStep.status = 'skipped'
        this.currentStep.endTime = new Date()

        // 更新节点状态
        const node = this.nodes.find(n => n.id === this.currentStep!.nodeId)
        if (node) {
            node.data.status = 'skipped'
        }
    }

    // 失败当前步骤
    failCurrentStep(error?: string): void {
        if (!this.currentStep) return

        this.currentStep.status = 'failed'
        this.currentStep.endTime = new Date()
        this.currentStep.result = { error }

        // 更新节点状态
        const node = this.nodes.find(n => n.id === this.currentStep!.nodeId)
        if (node) {
            node.data.status = 'failed'
        }
    }

    // 找到下一个可执行的节点
    private findNextNode(currentNodeId: string): Node<WorkflowNodeData> | null {
        // 找到从当前节点出发的边
        const outgoingEdges = this.edges.filter(e => e.source === currentNodeId)

        if (outgoingEdges.length === 0) {
            return null // 没有下一个节点
        }

        if (outgoingEdges.length === 1) {
            // 只有一个出口，直接返回下一个节点
            const nextNode = this.nodes.find(n => n.id === outgoingEdges[0].target)
            return nextNode || null
        }

        // 多个出口，需要根据决策逻辑选择
        return this.handleDecisionNode(currentNodeId, outgoingEdges)
    }

    // 处理决策节点
    private handleDecisionNode(nodeId: string, edges: Edge[]): Node<WorkflowNodeData> | null {
        const decisionNode = this.nodes.find(n => n.id === nodeId)
        if (!decisionNode || decisionNode.data.type !== 'decision') {
            // 如果不是决策节点，选择第一个出口
            const nextNode = this.nodes.find(n => n.id === edges[0].target)
            return nextNode || null
        }

        // 这里可以实现复杂的决策逻辑
        // 目前简单实现：选择第一个出口
        const nextNode = this.nodes.find(n => n.id === edges[0].target)
        return nextNode || null
    }

    // 暂停工作流
    pause(): void {
        this.isRunning = false
        if (this.currentStep) {
            this.currentStep.status = 'pending'
            const node = this.nodes.find(n => n.id === this.currentStep!.nodeId)
            if (node) {
                node.data.status = 'pending'
            }
        }
    }

    // 恢复工作流
    resume(): void {
        this.isRunning = true
        if (this.currentStep) {
            this.currentStep.status = 'running'
            const node = this.nodes.find(n => n.id === this.currentStep!.nodeId)
            if (node) {
                node.data.status = 'running'
            }
        }
    }

    // 重置工作流
    reset(): void {
        this.isRunning = false
        this.currentStep = null
        this.executionHistory = []

        // 重置所有节点状态
        this.nodes.forEach(node => {
            if (node.data.type === 'start') {
                node.data.status = 'completed'
            } else {
                node.data.status = 'pending'
            }
        })
    }

    // 获取执行历史
    getExecutionHistory(): WorkflowStep[] {
        return [...this.executionHistory]
    }

    // 获取当前步骤
    getCurrentStep(): WorkflowStep | null {
        return this.currentStep
    }

    // 获取工作流状态
    getStatus(): 'idle' | 'running' | 'paused' | 'completed' | 'failed' {
        if (!this.isRunning) {
            if (this.executionHistory.length === 0) return 'idle'
            if (this.currentStep?.status === 'failed') return 'failed'
            return 'paused'
        }
        return 'running'
    }

    // 检查工作流是否完成
    isCompleted(): boolean {
        const endNodes = this.nodes.filter(n => n.data.type === 'end')
        return endNodes.some(n => n.data.status === 'completed')
    }

    // 获取工作流统计信息
    getStatistics() {
        const total = this.nodes.length
        const completed = this.nodes.filter(n => n.data.status === 'completed').length
        const running = this.nodes.filter(n => n.data.status === 'running').length
        const failed = this.nodes.filter(n => n.data.status === 'failed').length
        const skipped = this.nodes.filter(n => n.data.status === 'skipped').length
        const pending = this.nodes.filter(n => n.data.status === 'pending').length

        return {
            total,
            completed,
            running,
            failed,
            skipped,
            pending,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0
        }
    }
}
