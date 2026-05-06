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
    <view class="rounded-12px bg-white p-20px text-14px text-#666 leading-relaxed shadow-sm">
      更多与薪资、个税相关的工具可在此扩展，例如：社保比例说明、反推税前、年度汇算参考等。
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
