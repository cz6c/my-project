<script lang="ts" setup>
defineOptions({ name: 'SalaryMore' })

definePage({
  style: {
    navigationBarTitleText: '更多工具',
    backgroundColor: '#f5f5f5',
  },
})

function goIdWatermark() {
  uni.navigateTo({ url: '/pages/salary/id-watermark' })
}
</script>

<template>
  <view class="page px-16px pt-24px pb-safe">
    <view
      class="tool-card mb-16px"
      @click="goIdWatermark"
    >
      <view class="tool-card-main">
        <text class="tool-card-title">证件照片加水印</text>
        <text class="tool-card-desc">上传证件照，添加用途水印后保存，本地处理不上传</text>
      </view>
      <text class="tool-card-arrow">›</text>
    </view>
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

.tool-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.tool-card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.tool-card-desc {
  font-size: 13px;
  color: #888;
  line-height: 1.45;
}

.tool-card-arrow {
  flex-shrink: 0;
  font-size: 22px;
  color: #3a96f5;
  line-height: 1;
}
</style>
