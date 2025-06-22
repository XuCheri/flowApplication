<template>
    <g>
        <!-- 主连线 -->
        <path :d="path" :stroke="strokeColor" :stroke-width="strokeWidth" fill="none"
            :stroke-dasharray="strokeDasharray" :marker-end="markerEnd" class="custom-edge-path" />

        <!-- 连线标签 -->
        <text v-if="label" :x="labelX" :y="labelY" class="edge-label" text-anchor="middle" dominant-baseline="middle">
            {{ label }}
        </text>

        <!-- 连线标签背景 -->
        <rect v-if="label" :x="labelX - labelWidth / 2 - 4" :y="labelY - 8" :width="labelWidth + 8" height="16" rx="8"
            fill="white" stroke="#e8e8e8" stroke-width="1" class="edge-label-bg" />
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type EdgeProps } from '@vue-flow/core'

interface CustomEdgeData {
    label?: string
}

const props = defineProps<EdgeProps<CustomEdgeData>>()

// 计算最佳连接点
const getOptimalPath = computed(() => {
    const { sourceX, sourceY, targetX, targetY } = props

    // 计算节点间的距离和角度
    const deltaX = targetX - sourceX
    const deltaY = targetY - sourceY

    // 根据距离和位置关系选择连接策略
    if (Math.abs(deltaX) < 50) {
        // 垂直对齐的节点，使用直线连接
        return getStraightPath()
    } else if (Math.abs(deltaY) < 50) {
        // 水平对齐的节点，使用直线连接
        return getStraightPath()
    } else {
        // 其他情况使用贝塞尔曲线
        return getCustomBezierPath()
    }
})

// 直线路径
const getStraightPath = () => {
    const { sourceX, sourceY, targetX, targetY } = props
    return [`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`]
}

// 贝塞尔曲线路径
const getCustomBezierPath = () => {
    const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props

    // 计算控制点偏移量
    const deltaX = targetX - sourceX
    const deltaY = targetY - sourceY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // 根据距离调整控制点
    const controlOffset = Math.min(distance * 0.3, 100)

    let sourceControlX = sourceX
    let sourceControlY = sourceY
    let targetControlX = targetX
    let targetControlY = targetY

    // 根据源节点位置调整控制点
    switch (sourcePosition) {
        case 'top':
            sourceControlY = sourceY - controlOffset
            break
        case 'bottom':
            sourceControlY = sourceY + controlOffset
            break
        case 'left':
            sourceControlX = sourceX - controlOffset
            break
        case 'right':
            sourceControlX = sourceX + controlOffset
            break
    }

    // 根据目标节点位置调整控制点
    switch (targetPosition) {
        case 'top':
            targetControlY = targetY - controlOffset
            break
        case 'bottom':
            targetControlY = targetY + controlOffset
            break
        case 'left':
            targetControlX = targetX - controlOffset
            break
        case 'right':
            targetControlX = targetX + controlOffset
            break
    }

    // 生成贝塞尔曲线路径
    return [`M ${sourceX} ${sourceY} C ${sourceControlX} ${sourceControlY} ${targetControlX} ${targetControlY} ${targetX} ${targetY}`]
}

// 计算路径
const path = computed(() => {
    return getOptimalPath.value[0]
})

// 计算标签位置
const labelX = computed(() => (props.sourceX + props.targetX) / 2)
const labelY = computed(() => (props.sourceY + props.targetY) / 2 - 20)

// 计算标签宽度
const labelWidth = computed(() => {
    if (!props.data?.label) return 0
    // 简单估算文本宽度
    return props.data.label.length * 8
})

// 样式计算
const strokeColor = computed(() => props.style?.stroke || '#1890ff')
const strokeWidth = computed(() => props.style?.strokeWidth || 2)
const strokeDasharray = computed(() => props.style?.strokeDasharray || 'none')
const markerEnd = computed(() => props.markerEnd || 'url(#arrow)')
const label = computed(() => props.data?.label)
</script>

<style scoped>
.custom-edge-path {
    transition: stroke 0.2s ease;
}

.custom-edge-path:hover {
    stroke: #40a9ff;
    stroke-width: 3;
}

.edge-label {
    font-size: 12px;
    fill: #333;
    pointer-events: none;
    user-select: none;
}

.edge-label-bg {
    pointer-events: none;
    user-select: none;
}
</style>
