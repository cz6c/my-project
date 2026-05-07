<script lang="ts" setup>
import type { HfPaymentType, SsPaymentType, YearEndTaxMode } from '@/utils/salaryCalculator'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getSalaryCityName } from '@/constants/salaryCityPicker'
import {
  HF_PAYMENT_OPTIONS,
  salaryOptionLabel,
  SS_PAYMENT_OPTIONS,
  YEAR_END_TAX_OPTIONS,
} from '@/constants/salaryFormOptions'
import { useSalaryCalcStore } from '@/store/salaryCalc'
import { getCityProfile } from '@/utils/salaryCalculator'
import { cloneSalaryCalcResult, prependSalaryHistory } from '@/utils/salaryHistory'

defineOptions({ name: 'SalaryCalc' })

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '得薪应手-税后工资计算',
  },
})

/** uni-app / 小程序 input 的 input 事件（官方未导出 UniApp.InputEvent） */
interface UniInputChangeEvent {
  detail?: { value?: string }
}

const primary = '#3A96F5'
/** 须高于自定义 TabBar（src/tabbar/index.vue 内 z-index:1000），否则弹出层会被挡住 */
const popupZIndex = 1100
const store = useSalaryCalcStore()
/** 勿命名为 input：小程序编译会与原生 <input> 混淆，生成错误变量名 */
const { input: salaryForm } = storeToRefs(store)

const resultTab = ref<'month' | 'year'>('month')
const showSsTypePicker = ref(false)
const showYearEndModePicker = ref(false)
const showHfTypePicker = ref(false)

const result = computed(() => store.result)

const cityLabel = computed(() => getSalaryCityName(salaryForm.value.cityId) || getCityProfile(salaryForm.value.cityId).name || '选择城市')

const ssTypeLabel = computed(() =>
  salaryOptionLabel(SS_PAYMENT_OPTIONS, salaryForm.value.ssPaymentType),
)

const yearEndModeLabel = computed(() =>
  salaryOptionLabel(YEAR_END_TAX_OPTIONS, salaryForm.value.yearEndTaxMode),
)

const hfBaseLabel = computed(() =>
  salaryOptionLabel(HF_PAYMENT_OPTIONS, salaryForm.value.hfPaymentType),
)

const showHfRatioAndBase = computed(() => salaryForm.value.hfPaymentType !== 'none')

const displayNet = computed(() => {
  if (resultTab.value === 'month')
    return result.value.firstMonthNet
  return result.value.annualTakeHome
})

const displayNetLabel = computed(() => (resultTab.value === 'month' ? '税后月薪' : '税后年薪'))

const showFirstMonthTag = computed(() => resultTab.value === 'month' && Math.abs(result.value.firstMonthNet - result.value.steadyMonthNet) > 0.01)

const bonusMultipliers = [1, 2, 3, 4, 6, 8, 10] as const
const selectedBonusMul = ref<number | null>(1)

watch(
  () => salaryForm.value.preTaxMonthly,
  () => {
    if (selectedBonusMul.value != null && salaryForm.value.yearEndBonus === Math.round(salaryForm.value.preTaxMonthly * selectedBonusMul.value)) {
      return
    }
    if (salaryForm.value.yearEndBonus === 0)
      selectedBonusMul.value = 1
  },
)

function applyBonusMul(m: number) {
  selectedBonusMul.value = m
  store.patchInput({ yearEndBonus: Math.round(salaryForm.value.preTaxMonthly * m) })
}

function onPreTaxInput(e: UniInputChangeEvent) {
  const v = Number.parseFloat(String(e.detail?.value ?? '').replace(/[^\d.]/g, '')) || 0
  store.patchInput({ preTaxMonthly: v })
}

function onBonusInput(e: UniInputChangeEvent) {
  selectedBonusMul.value = null
  const v = Number.parseFloat(String(e.detail?.value ?? '').replace(/[^\d.]/g, '')) || 0
  store.patchInput({ yearEndBonus: v })
}

function onSsBaseInput(e: UniInputChangeEvent) {
  const v = Number.parseInt(String(e.detail?.value ?? '').replace(/\D/g, ''), 10) || 0
  store.patchInput({ ssBase: v })
}

function onSpecialInput(e: UniInputChangeEvent) {
  const v = Number.parseFloat(String(e.detail?.value ?? '').replace(/[^\d.]/g, '')) || 0
  store.patchInput({ specialDeductionMonthly: v })
}

function onHfBaseInput(e: UniInputChangeEvent) {
  const v = Number.parseInt(String(e.detail?.value ?? '').replace(/\D/g, ''), 10) || 0
  store.patchInput({ hfBase: v })
}

/** 用户输入百分比数字，如 12 表示 12%，存入 hfRate 小数 */
function onHfRatePercentInput(e: UniInputChangeEvent) {
  const raw = String(e.detail?.value ?? '').replace(/[^\d.]/g, '')
  const p = Number.parseFloat(raw)
  if (Number.isNaN(p)) {
    store.patchInput({ hfRate: 0 })
    return
  }
  const clamped = Math.min(Math.max(p, 0), 40)
  store.patchInput({ hfRate: clamped / 100 })
}

const hfRatePercentStr = computed(() => {
  if (salaryForm.value.hfPaymentType === 'none')
    return ''
  const p = salaryForm.value.hfRate * 100
  if (p <= 0)
    return ''
  return String(Math.round(p * 10) / 10).replace(/\.0$/, '')
})

function openSelectCity() {
  uni.navigateTo({ url: '/pages/salary/select-city' })
}

function pickSsType(key: SsPaymentType) {
  store.patchInput({ ssPaymentType: key })
  const city = getCityProfile(salaryForm.value.cityId)
  if (key === 'min_base')
    store.patchInput({ ssBase: city.ssBaseMin })
  else if (key === 'actual_salary')
    store.patchInput({ ssBase: Math.min(Math.max(salaryForm.value.preTaxMonthly, city.ssBaseMin), city.ssBaseCap) })
  showSsTypePicker.value = false
}

function pickYearEndMode(m: YearEndTaxMode) {
  store.patchInput({ yearEndTaxMode: m })
  showYearEndModePicker.value = false
}

function pickHfType(key: HfPaymentType) {
  const city = getCityProfile(salaryForm.value.cityId)
  if (key === 'min_base') {
    store.patchInput({ hfPaymentType: key, hfBase: city.ssBaseMin })
  }
  else if (key === 'by_salary') {
    store.patchInput({
      hfPaymentType: key,
      hfBase: Math.min(Math.max(salaryForm.value.preTaxMonthly, city.ssBaseMin), city.ssBaseCap),
    })
  }
  else {
    store.patchInput({ hfPaymentType: key })
  }
  showHfTypePicker.value = false
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1)
}

function goDetail() {
  const cityName = getSalaryCityName(salaryForm.value.cityId) || getCityProfile(salaryForm.value.cityId).name
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  prependSalaryHistory({
    id,
    title: `${cityName} · 税前${salaryForm.value.preTaxMonthly}`,
    firstMonthNet: result.value.firstMonthNet,
    input: { ...salaryForm.value },
    result: cloneSalaryCalcResult(result.value),
  })
  uni.navigateTo({ url: '/pages/salary/detail' })
}
</script>

<template>
  <view class="page" :style="{ '--salary-primary': primary }">
    <view class="header pt-safe" :style="{ background: primary }">
      <view class="header-bar h-44px flex items-center justify-center text-17px text-white font-medium">
        得薪应手-税后工资计算
      </view>
    </view>

    <view class="relative z-1 px-12px -mt-12px">
      <view class="result-card rounded-t-16px bg-white pb-16px pt-12px shadow-sm">
        <view class="flex items-center justify-between px-12px">
          <view class="segment flex flex-1 rounded-8px bg-#f0f4f8 p-3px">
            <view
              class="segment-item flex-1 py-6px text-center text-13px"
              :class="resultTab === 'month' ? 'segment-item--on' : 'text-#666'"
              @click="resultTab = 'month'"
            >
              税后月薪
            </view>
            <view
              class="segment-item flex-1 py-6px text-center text-13px"
              :class="resultTab === 'year' ? 'segment-item--on' : 'text-#666'"
              @click="resultTab = 'year'"
            >
              税后年薪
            </view>
          </view>
          <view
            class="ml-8px flex shrink-0 items-center rounded-full bg-#eef6ff px-10px py-4px text-12px"
            :style="{ color: primary }"
            @click="goDetail"
          >
            <text class="i-carbon-view mr-4px text-14px" />
            查看明细
          </view>
        </view>

        <view class="mt-16px px-16px">
          <view class="flex flex-wrap items-baseline gap-8px">
            <text class="text-15px text-#666">
              ¥
            </text>
            <text class="text-36px font-semibold tabular-nums" :style="{ color: primary }">
              {{ fmt(displayNet) }}
            </text>
            <text v-if="showFirstMonthTag" class="text-12px text-#999">
              (首月)
            </text>
          </view>
          <view class="mt-12px flex flex-wrap gap-8px">
            <view class="chip">
              <text class="text-11px text-#666">
                个税
              </text>
              <text class="mt-2px text-13px font-medium tabular-nums" :style="{ color: primary }">
                {{ fmt(result.firstMonthIncomeTax) }}
              </text>
            </view>
            <view class="chip">
              <text class="text-11px text-#666">
                社保
              </text>
              <text class="mt-2px text-13px font-medium tabular-nums" :style="{ color: primary }">
                {{ fmt(result.ssPersonalMonthly) }}
              </text>
            </view>
            <view class="chip">
              <text class="text-11px text-#666">
                公积金
              </text>
              <text class="mt-2px text-13px font-medium tabular-nums" :style="{ color: primary }">
                {{ fmt(result.hfPersonalMonthly) }}
              </text>
            </view>
          </view>
        </view>

        <view class="wave-bottom mt-12px h-12px w-full overflow-hidden">
          <view class="wave-bg" />
        </view>
      </view>
    </view>

    <view class="form-scroll px-12px pb-12px pt-8px">
      <view class="card mb-12px rounded-12px bg-white p-12px shadow-sm">
        <view class="cell" @click="openSelectCity">
          <text class="label">
            工作城市
          </text>
          <view class="cell-right">
            <text>{{ cityLabel }}</text>
            <text class="i-carbon-chevron-right ml-4px text-#ccc" />
          </view>
        </view>
        <view class="cell cell--input">
          <text class="label">
            税前月薪
          </text>
          <input
            class="input-right"
            type="digit"
            :value="salaryForm.preTaxMonthly ? String(salaryForm.preTaxMonthly) : ''"
            placeholder="0"
            @input="onPreTaxInput"
          >
        </view>
        <view class="cell" @click="showYearEndModePicker = true">
          <text class="label">
            年终计税方式
          </text>
          <view class="cell-right">
            <text>{{ yearEndModeLabel }}</text>
            <text class="i-carbon-chevron-right ml-4px text-#ccc" />
          </view>
        </view>
        <view class="cell cell--input">
          <text class="label">
            年终奖
          </text>
          <input
            class="input-right"
            type="digit"
            :value="salaryForm.yearEndBonus ? String(salaryForm.yearEndBonus) : ''"
            placeholder="请输入奖金"
            @input="onBonusInput"
          >
        </view>
        <scroll-view scroll-x class="mt-8px whitespace-nowrap" :show-scrollbar="false">
          <view class="inline-flex gap-8px py-4px">
            <view
              v-for="m in bonusMultipliers"
              :key="m"
              class="bonus-tag"
              :class="selectedBonusMul === m ? 'bonus-tag--on' : ''"
              @click="applyBonusMul(m)"
            >
              {{ m === 1 ? '月薪×1' : `×${m}` }}
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="card mb-12px rounded-12px bg-white p-12px shadow-sm">
        <view class="cell" @click="showSsTypePicker = true">
          <text class="label">
            社保缴纳类型
          </text>
          <view class="cell-right">
            <text>{{ ssTypeLabel }}</text>
            <text class="i-carbon-chevron-right ml-4px text-#ccc" />
          </view>
        </view>
        <view class="cell cell--input">
          <text class="label">
            社保缴纳基数
          </text>
          <input
            v-if="salaryForm.ssPaymentType === 'custom'"
            class="input-right"
            type="number"
            :value="String(salaryForm.ssBase)"
            @input="onSsBaseInput"
          >
          <text v-else class="text-#333 tabular-nums">
            {{ Math.round(result.resolvedSsBase) }}
          </text>
        </view>
      </view>

      <view class="card mb-12px rounded-12px bg-white p-12px shadow-sm">
        <view class="cell" @click="showHfTypePicker = true">
          <text class="label">
            公积金缴纳基数
          </text>
          <view class="cell-right">
            <text>{{ hfBaseLabel }}</text>
            <text class="i-carbon-chevron-right ml-4px text-#ccc" />
          </view>
        </view>
        <view v-if="showHfRatioAndBase" class="cell cell--input">
          <text class="label">
            公积金缴纳比例
          </text>
          <view class="cell-right flex flex-1 items-center justify-end gap-4px">
            <input
              class="input-right max-w-120px"
              type="digit"
              :value="hfRatePercentStr"
              placeholder="如 12 表示 12%"
              @input="onHfRatePercentInput"
            >
            <text class="text-#666">
              %
            </text>
          </view>
        </view>
        <view v-if="salaryForm.hfPaymentType === 'custom'" class="cell cell--input">
          <text class="label">
            公积金基数
          </text>
          <input
            class="input-right"
            type="number"
            :value="String(salaryForm.hfBase)"
            @input="onHfBaseInput"
          >
        </view>
        <view v-else-if="showHfRatioAndBase" class="cell">
          <text class="label">
            公积金缴费基数
          </text>
          <text class="text-#333 tabular-nums">
            {{ Math.round(result.resolvedHfBase) }}
          </text>
        </view>
      </view>

      <view class="card mb-12px rounded-12px bg-white p-12px shadow-sm">
        <view class="cell cell--input">
          <text class="label">
            每月专项附加扣除
          </text>
          <input
            class="input-right"
            type="digit"
            :value="salaryForm.specialDeductionMonthly ? String(salaryForm.specialDeductionMonthly) : ''"
            placeholder="请输入具体数额"
            @input="onSpecialInput"
          >
        </view>
      </view>

      <view
        class="h-48px center rounded-12px text-16px text-white font-medium"
        :style="{ background: primary }"
        @click="goDetail"
      >
        查看明细
      </view>
      <view class="mt-12px px-8px text-center text-11px text-#999 leading-relaxed">
        注：由于各地政策有细微差异，计算结果仅供参考
      </view>
    </view>

    <wd-popup
      v-model="showSsTypePicker"
      position="bottom"
      :z-index="popupZIndex"
      root-portal
      :safe-area-inset-bottom="true"
      closable
    >
      <view class="picker-title">
        社保缴纳类型
      </view>
      <view
        v-for="opt in SS_PAYMENT_OPTIONS"
        :key="opt.value"
        class="picker-row"
        @click="pickSsType(opt.value)"
      >
        {{ opt.label }}
      </view>
    </wd-popup>

    <wd-popup
      v-model="showYearEndModePicker"
      position="bottom"
      :z-index="popupZIndex"
      root-portal
      :safe-area-inset-bottom="true"
      closable
    >
      <view class="picker-title">
        年终计税方式
      </view>
      <view
        v-for="opt in YEAR_END_TAX_OPTIONS"
        :key="opt.value"
        class="picker-row"
        @click="pickYearEndMode(opt.value)"
      >
        {{ opt.label }}
      </view>
    </wd-popup>

    <wd-popup
      v-model="showHfTypePicker"
      position="bottom"
      :z-index="popupZIndex"
      root-portal
      :safe-area-inset-bottom="true"
      closable
    >
      <view class="picker-title">
        公积金缴纳基数
      </view>
      <view
        v-for="opt in HF_PAYMENT_OPTIONS"
        :key="opt.value"
        class="picker-row"
        @click="pickHfType(opt.value)"
      >
        {{ opt.label }}
      </view>
    </wd-popup>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-bar {
  padding-bottom: 56px;
}

.segment-item--on {
  border-radius: 6px;
  background: #fff;
  font-weight: 600;
  color: var(--salary-primary, #3a96f5);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.chip {
  min-width: 72px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #eef6ff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wave-bg {
  height: 24px;
  margin-top: -8px;
  background: radial-gradient(ellipse 80% 12px at 50% 0, #fff 98%, transparent 100%);
}

.card .cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}
.card .cell:last-child {
  border-bottom: none;
}
.cell-right {
  display: flex;
  align-items: center;
  color: #666;
}
.label {
  color: #333;
}
.input-right {
  flex: 1;
  text-align: right;
  font-size: 15px;
}
.bonus-tag {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  background: #eee;
  color: #666;
}
.bonus-tag--on {
  background: #eef6ff;
  color: var(--salary-primary, #3a96f5);
  font-weight: 600;
}
.picker-title {
  padding: 16px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}
.picker-row {
  padding: 16px 20px;
  font-size: 15px;
  border-bottom: 1px solid #f5f5f5;
}
.picker-row--on {
  color: var(--salary-primary, #3a96f5);
  font-weight: 600;
}
</style>
