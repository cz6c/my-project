<script lang="ts" setup>
import type { SalaryHistoryItem } from '@/store/salaryHistory'
import { useQueue } from '@wot-ui/ui'
import { storeToRefs } from 'pinia'
import { useSalaryHistoryStore } from '@/store/salaryHistory'

defineOptions({ name: 'SalaryHistory' })

const { closeOutside } = useQueue()

definePage({
  style: {
    navigationBarTitleText: '历史记录',
    backgroundColor: '#f5f5f5',
  },
})

const salaryHistoryStore = useSalaryHistoryStore()
const { items: list } = storeToRefs(salaryHistoryStore)

function openDetail(item: SalaryHistoryItem) {
  uni.navigateTo({ url: `/pages/salary/detail?id=${encodeURIComponent(item.id)}` })
}

function fmt(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function confirmDelete(item: SalaryHistoryItem) {
  uni.showModal({
    title: '删除记录',
    content: '确定删除这条历史记录吗？',
    success(res) {
      if (!res.confirm)
        return
      salaryHistoryStore.removeById(item.id)
      uni.showToast({ title: '已删除', icon: 'success' })
    },
  })
}
</script>

<template>
  <view class="page px-12px pt-12px pb-safe" @click="closeOutside">
    <wd-empty
      v-if="list.length === 0"
      tip="暂无历史记录，在薪资计算页点击「查看明细」会自动保存一条。"
    />
    <view v-for="item in list" :key="item.id" class="history-swipe-wrap mb-10px">
      <wd-swipe-action>
        <view class="card rounded-12px bg-white p-14px shadow-sm" @click="openDetail(item)">
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
              <view class="text-16px text-primary font-semibold tabular-nums">
                ¥{{ fmt(item.snapshot.result.annualTakeHome) }}
              </view>
              <view class="mt-4px text-11px text-#999">
                到手年薪
              </view>
            </view>
          </view>
        </view>
        <template #right>
          <view class="history-swipe-right">
            <view class="history-swipe-del" @click.stop="confirmDelete(item)">
              <text class="history-swipe-del-text">
                删除
              </text>
            </view>
          </view>
        </template>
      </wd-swipe-action>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.history-swipe-right {
  display: flex;
  height: 100%;
}
.history-swipe-del {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 100%;
  min-height: 72px;
  padding: 0 20px;
  background: #e2231a;
}
.history-swipe-del-text {
  font-size: 14px;
  color: #fff;
}
</style>
