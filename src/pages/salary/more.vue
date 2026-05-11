<script lang="ts" setup>
defineOptions({ name: 'SalaryMore' })

definePage({
  style: {
    navigationBarTitleText: '更多工具',
    backgroundColor: '#f5f5f5',
  },
})
</script>

<template>
  <view class="page px-16px pt-24px pb-safe">
    <wd-cell-group custom-class="more-tools-group" border>
      <wd-cell
        title="更多工具"
        label="更多与薪资、个税相关的工具可在此扩展，例如：社保比例说明、反推税前、年度汇算参考等。"
      />
    </wd-cell-group>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

:deep(.more-tools-group) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
</style>
