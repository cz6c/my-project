<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { salaryOptionLabel, YEAR_END_TAX_OPTIONS } from '@/constants/salaryFormOptions'
import { useSalaryCalcStore } from '@/store/salaryCalc'
import { calcSalary } from '@/utils/salaryCalculator'
import { findSalaryHistoryById } from '@/utils/salaryHistory'

defineOptions({ name: 'SalaryDetail' })

definePage({
  style: {
    navigationBarTitleText: '薪资明细',
    navigationBarBackgroundColor: '#3A96F5',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f5',
  },
})

const primary = '#3A96F5'
const store = useSalaryCalcStore()

/** 从「历史记录」进入时携带 id，展示该条快照；从「查看明细」进入无 id，用当前 store */
const historyId = ref('')

onLoad((options?: Record<string, string>) => {
  historyId.value = options?.id ? decodeURIComponent(options.id) : ''
})

const historyItem = computed(() => {
  if (!historyId.value)
    return null
  return findSalaryHistoryById(historyId.value) ?? null
})

const r = computed(() => {
  const item = historyItem.value
  if (item?.result)
    return item.result
  if (item?.input)
    return calcSalary(item.input)
  return store.result
})

const detailInput = computed(() => {
  if (historyItem.value)
    return historyItem.value.input
  return store.input
})

const yearEndTaxLabel = computed(() =>
  salaryOptionLabel(YEAR_END_TAX_OPTIONS, detailInput.value.yearEndTaxMode),
)

function rowPersonal(key: string) {
  return r.value.insuranceRows.find(i => i.key === key)?.personal ?? 0
}

const annualPensionP = computed(() => rowPersonal('pension') * 12)
const annualMedicalP = computed(() => rowPersonal('medical') * 12)
const annualUnempP = computed(() => rowPersonal('unemp') * 12)
const annualInjuryP = computed(() => rowPersonal('injury') * 12)
const annualMatP = computed(() => rowPersonal('mat') * 12)
const annualHfP = computed(() => r.value.hfPersonalMonthly * 12)

const insPersonalTotal = computed(() =>
  r.value.insuranceRows.reduce((s, row) => s + row.personal, 0),
)
const insCompanyTotal = computed(() =>
  r.value.insuranceRows.reduce((s, row) => s + row.company, 0),
)

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1)
}
</script>

<template>
  <view class="page pb-24px">
    <view class="hero px-16px pb-20px pt-safe" :style="{ background: primary }">
      <view class="pt-12px text-center">
        <text class="text-40px text-white font-semibold leading-none tabular-nums">
          {{ fmt(r.annualTakeHome) }}
        </text>
        <view class="mt-8px inline-block rounded-4px bg-white/20 px-10px py-4px">
          <text class="text-12px text-white/95">
            到手年薪
          </text>
        </view>
      </view>
    </view>

    <view class="px-12px -mt-12px">
      <view class="card rounded-12px bg-white p-12px shadow-sm">
        <view class="summary-grid">
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(r.annualTaxTotal) }}
            </text>
            <text class="sum-lab">
              年度缴税
            </text>
          </view>
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(annualHfP) }}
            </text>
            <text class="sum-lab">
              个人公积金
            </text>
          </view>
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(annualPensionP) }}
            </text>
            <text class="sum-lab">
              养老保险
            </text>
          </view>
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(annualMedicalP) }}
            </text>
            <text class="sum-lab">
              医疗保险
            </text>
          </view>
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(annualUnempP) }}
            </text>
            <text class="sum-lab">
              失业保险
            </text>
          </view>
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(annualInjuryP) }}
            </text>
            <text class="sum-lab">
              工伤保险
            </text>
          </view>
          <view class="sum-cell">
            <text class="sum-val tabular-nums">
              {{ fmt(annualMatP) }}
            </text>
            <text class="sum-lab">
              生育保险
            </text>
          </view>
        </view>
      </view>

      <view class="section-title mt-20px">
        <view class="bar" :style="{ background: primary }" />
        <text>每月五险一金详情</text>
      </view>
      <view class="card mt-8px overflow-hidden rounded-12px bg-white shadow-sm">
        <view class="ins-table">
          <view class="ins-head">
            <view class="ins-cell ins-cell--name">
              <text class="ins-head-text">
                五险一金
              </text>
            </view>
            <view class="ins-cell ins-cell--half">
              <text class="ins-head-text">
                个人缴纳
              </text>
            </view>
            <view class="ins-cell ins-cell--half">
              <text class="ins-head-text">
                公司缴纳
              </text>
            </view>
          </view>
          <view
            v-for="(row, idx) in r.insuranceRows"
            :key="row.key"
            class="ins-row"
            :class="idx % 2 === 1 ? 'ins-row--alt' : ''"
          >
            <view class="ins-cell ins-cell--name">
              <text class="ins-body-text">
                {{ row.label }}
              </text>
            </view>
            <view class="ins-cell ins-cell--half">
              <text class="ins-num tabular-nums">
                {{ fmt(row.personal) }}
              </text>
              <text class="ins-sub tabular-nums">
                ({{ row.personalRateText }})
              </text>
            </view>
            <view class="ins-cell ins-cell--half">
              <text class="ins-num tabular-nums">
                {{ fmt(row.company) }}
              </text>
              <text class="ins-sub tabular-nums">
                ({{ row.companyRateText }})
              </text>
            </view>
          </view>
          <view class="ins-row ins-row--total">
            <view class="ins-cell ins-cell--name">
              <text class="ins-body-text ins-body-text--bold">
                总计
              </text>
            </view>
            <view class="ins-cell ins-cell--half">
              <text class="ins-num ins-body-text--bold tabular-nums">
                {{ fmt(insPersonalTotal) }}
              </text>
            </view>
            <view class="ins-cell ins-cell--half">
              <text class="ins-num ins-body-text--bold tabular-nums">
                {{ fmt(insCompanyTotal) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view class="section-title mt-20px">
        <view class="bar" :style="{ background: primary }" />
        <text>每月到手工资</text>
      </view>
      <view class="card mt-8px overflow-hidden rounded-12px bg-white shadow-sm">
        <view class="month-table">
          <view class="month-head">
            <view class="month-cell month-cell--narrow">
              <text class="month-head-text">
                月份
              </text>
            </view>
            <view class="month-cell month-cell--grow">
              <text class="month-head-text">
                税前
              </text>
            </view>
            <view class="month-cell month-cell--grow">
              <text class="month-head-text">
                个人所得税
              </text>
            </view>
            <view class="month-cell month-cell--grow">
              <text class="month-head-text">
                税后
              </text>
            </view>
          </view>
          <view
            v-for="(row, idx) in r.monthlyRows"
            :key="row.month"
            class="month-row"
            :class="idx % 2 === 1 ? 'month-row--alt' : ''"
          >
            <view class="month-cell month-cell--narrow">
              <text class="month-body-text">
                {{ row.month }}月
              </text>
            </view>
            <view class="month-cell month-cell--grow">
              <text class="month-num tabular-nums">
                {{ fmt(row.preTax) }}
              </text>
            </view>
            <view class="month-cell month-cell--grow">
              <text class="month-num tabular-nums">
                {{ fmt(row.tax) }}
              </text>
            </view>
            <view class="month-cell month-cell--grow">
              <text class="month-num tabular-nums" :style="{ color: primary }">
                {{ fmt(row.postTax) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="detailInput.yearEndBonus > 0" class="card mt-12px rounded-12px bg-white p-12px text-13px leading-relaxed shadow-sm">
        <text class="text-#666">
          年终奖 {{ fmt(detailInput.yearEndBonus) }}，个税 {{ fmt(r.yearEndBonusTax) }}，到手 {{ fmt(r.yearEndBonusNet) }}
          （{{ yearEndTaxLabel }}）
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.hero {
  padding-bottom: 28px;
}
.card {
  box-sizing: border-box;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 8px;
}
.sum-cell {
  text-align: center;
}
.sum-val {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.sum-lab {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
}

/* 小程序端 flex 子节点不能用 text，必须用 view 做单元格；宽度用 flex + % 保证横向排列 */
.ins-table {
  width: 100%;
}
.ins-head,
.ins-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}
.ins-head {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.ins-row {
  padding: 10px 0;
  min-height: 44px;
}
.ins-row--alt {
  background: #fafafa;
}
.ins-row--total {
  border-top: 1px solid #f0f0f0;
  font-weight: 600;
}
.ins-cell {
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
}
.ins-cell--name {
  width: 30%;
  padding-left: 8px;
}
.ins-cell--half {
  width: 35%;
  align-items: center;
  text-align: center;
}
.ins-head-text {
  font-size: 11px;
  color: #999;
  text-align: center;
}
.ins-cell--name .ins-head-text {
  text-align: left;
}
.ins-body-text {
  font-size: 13px;
  color: #333;
}
.ins-body-text--bold {
  font-weight: 600;
}
.ins-num {
  font-size: 13px;
  color: #333;
  text-align: center;
}
.ins-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
  text-align: center;
}

.month-table {
  width: 100%;
}
.month-head,
.month-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}
.month-head {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.month-row {
  padding: 10px 0;
  min-height: 44px;
}
.month-row--alt {
  background: #fafafa;
}
.month-cell {
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.month-cell--narrow {
  width: 22%;
  padding-left: 8px;
}
.month-cell--grow {
  flex: 1;
  width: 0;
  min-width: 0;
  align-items: center;
}
.month-head-text {
  font-size: 11px;
  color: #999;
  text-align: center;
}
.month-cell--narrow .month-head-text {
  text-align: left;
}
.month-body-text {
  font-size: 13px;
  color: #333;
}
.month-num {
  font-size: 13px;
  color: #333;
  text-align: center;
}
</style>
