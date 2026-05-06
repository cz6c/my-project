<script lang="ts" setup>
import type { SalaryHistoryItem } from '@/utils/salaryHistory'
import { ref } from 'vue'
import { useSalaryCalcStore } from '@/store/salaryCalc'
import { loadSalaryHistory } from '@/utils/salaryHistory'

defineOptions({ name: 'SalaryHistory' })

definePage({
  style: {
    navigationBarTitleText: '历史记录',
    backgroundColor: '#f5f5f5',
  },
})

const list = ref<SalaryHistoryItem[]>([])
const store = useSalaryCalcStore()

function refresh() {
  list.value = loadSalaryHistory()
}

onShow(() => {
  refresh()
})

function openDetail(item: SalaryHistoryItem) {
  store.setInput(item.input)
  uni.navigateTo({ url: `/pages/salary/detail?id=${encodeURIComponent(item.id)}` })
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1)
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <view class="page px-12px pt-12px pb-safe">
    <view v-if="list.length === 0" class="empty py-40px text-center text-14px text-#999">
      暂无历史记录，在薪资计算页点击「查看明细」会自动保存一条。
    </view>
    <view
      v-for="item in list"
      :key="item.id"
      class="card mb-10px rounded-12px bg-white p-14px shadow-sm"
      @click="openDetail(item)"
    >
      <view class="flex items-start justify-between gap-8px">
        <view class="min-w-0 flex-1">
          <view class="text-15px text-#333 font-medium">
            {{ item.title }}
          </view>
          <view class="mt-6px text-12px text-#999">
            {{ formatTime(item.savedAt) }}
          </view>
        </view>
        <view class="shrink-0 text-right">
          <view class="text-16px text-#3A96F5 font-semibold tabular-nums">
            ¥{{ fmt(item.firstMonthNet) }}
          </view>
          <view class="mt-4px text-11px text-#999">
            首月税后
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
