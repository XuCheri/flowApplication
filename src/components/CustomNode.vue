<template>
    <div class="custom-node">
        <strong>{{ data.label }}</strong>
    </div>
</template>

<script setup lang="ts">
// 正确方式：接收 data 对象（Vue Flow 的约定）
defineProps<{ data: { label: string } }>()
</script>

<style scoped>
.custom-node {
    padding: 10px;
    border: 2px solid #409eff;
    border-radius: 6px;
    background-color: #ecf5ff;
    text-align: center;
}
</style>
