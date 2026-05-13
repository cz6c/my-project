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
import { cloneSalaryCalcResult, useSalaryHistoryStore } from '@/store/salaryHistory'
import { getCityProfile } from '@/utils/salaryCalculator'

defineOptions({ name: 'SalaryCalc' })

definePage({
  type: 'home',
  style: {
    'navigationStyle': 'custom',
    'navigationBarTitleText': '税后工资计算',
    /**
     * 支付宝：须显式覆盖标题，否则会沿用 globalStyle 的 navigationBarTitleText（如「unibest」）；
     * 空格用于占位隐藏原生文案，配合 transparentTitle 与自定义头部。
     * @see https://opendocs.alipay.com/mini/framework/app-json
     */
    'mp-alipay': {
      defaultTitle: ' ',
      transparentTitle: 'always',
      titlePenetrate: 'YES',
    },
  },
})

/** 须高于自定义 TabBar（src/tabbar/index.vue 内 z-index:1000），否则弹出层会被挡住 */
const popupZIndex = 1100
const store = useSalaryCalcStore()
const salaryHistoryStore = useSalaryHistoryStore()
/** 勿命名为 input：小程序编译会与原生 <input> 混淆，生成错误变量名 */
const { input: salaryForm } = storeToRefs(store)

const showSsTypePicker = ref(false)
const showYearEndModePicker = ref(false)
const showHfTypePicker = ref(false)
/** 七项专项附加扣除标准说明 */
const showSpecialDeductionTip = ref(false)

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

/** 仅「按基数比例」公积金展示比例输入 */
const showHfRatioRow = computed(() => salaryForm.value.hfPaymentType === 'base')

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

function parseNum(val: string | number, intOnly = false) {
  const s = String(val ?? '')
  const cleaned = intOnly ? s.replace(/\D/g, '') : s.replace(/[^\d.]/g, '')
  const n = intOnly ? Number.parseInt(cleaned, 10) : Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function onPreTaxInput(val: string | number) {
  store.patchInput({ preTaxMonthly: parseNum(val) })
}

function onBonusInput(val: string | number) {
  selectedBonusMul.value = null
  store.patchInput({ yearEndBonus: parseNum(val) })
}

function onSsBaseInput(val: string | number) {
  store.patchInput({ ssBase: parseNum(val, true) })
}

function onSsPersonalAmountInput(val: string | number) {
  store.patchInput({ ssPersonalAmount: parseNum(val) })
}

function onSpecialInput(val: string | number) {
  store.patchInput({ specialDeductionMonthly: parseNum(val) })
}

function onHfBaseInput(val: string | number) {
  store.patchInput({ hfBase: parseNum(val, true) })
}

function onHfPersonalAmountInput(val: string | number) {
  store.patchInput({ hfPersonalAmount: parseNum(val) })
}

/** 用户输入百分比数字，如 12 表示 12%，存入 hfRate 小数 */
function onHfRatePercentInput(val: string | number) {
  const p = parseNum(val)
  if (p <= 0 && String(val ?? '').replace(/\D/g, '') === '') {
    store.patchInput({ hfRate: 0 })
    return
  }
  const clamped = Math.min(Math.max(p, 0), 40)
  store.patchInput({ hfRate: clamped / 100 })
}

const hfRatePercentStr = computed(() => {
  if (salaryForm.value.hfPaymentType !== 'base')
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
  const city = getCityProfile(salaryForm.value.cityId)
  if (key === 'base')
    store.patchInput({ ssPaymentType: key, ssBase: city.ssBaseMin })
  else
    store.patchInput({ ssPaymentType: key, ssBase: 0 })
  showSsTypePicker.value = false
}

function pickYearEndMode(m: YearEndTaxMode) {
  store.patchInput({ yearEndTaxMode: m })
  showYearEndModePicker.value = false
}

function pickHfType(key: HfPaymentType) {
  const city = getCityProfile(salaryForm.value.cityId)
  if (key === 'base')
    store.patchInput({ hfPaymentType: key, hfBase: city.ssBaseMin })
  else if (key === 'custom')
    store.patchInput({ hfPaymentType: key, hfBase: 0 })
  else
    store.patchInput({ hfPaymentType: key })
  showHfTypePicker.value = false
}

function goDetail() {
  const cityName = getSalaryCityName(salaryForm.value.cityId) || getCityProfile(salaryForm.value.cityId).name
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  salaryHistoryStore.prepend({
    id,
    title: `${cityName} · 每月税前${salaryForm.value.preTaxMonthly}`,
    snapshot: {
      input: { ...salaryForm.value },
      result: cloneSalaryCalcResult(result.value),
    },
  })
  uni.navigateTo({ url: '/pages/salary/detail' })
}
</script>

<template>
  <page-meta :page-style="`overflow:${showSsTypePicker || showYearEndModePicker || showHfTypePicker || showSpecialDeductionTip ? 'hidden' : 'visible'};`" />
  <view class="page">
    <view class="header header--gradient pt-safe">
      <view class="header-bar h-44px flex items-center justify-center text-17px text-#fff font-medium">
        税后工资计算
      </view>
    </view>

    <view class="form-scroll px-12px pb-12px -mt-12px">
      <wd-cell-group custom-class="salary-cell-group mb-12px" border>
        <wd-cell title="工作城市" :value="cityLabel" is-link @click="openSelectCity" />
        <wd-cell title="税前月薪">
          <wd-input
            type="digit"
            align-right
            :model-value="salaryForm.preTaxMonthly ? String(salaryForm.preTaxMonthly) : ''"
            placeholder="0"
            custom-class="salary-cell-input"
            @update:model-value="onPreTaxInput"
          />
        </wd-cell>
        <wd-cell title="年终计税方式" :value="yearEndModeLabel" is-link @click="showYearEndModePicker = true" />
        <wd-cell title="年终奖">
          <wd-input
            type="digit"
            align-right
            :model-value="salaryForm.yearEndBonus ? String(salaryForm.yearEndBonus) : ''"
            placeholder="请输入奖金"
            custom-class="salary-cell-input"
            @update:model-value="onBonusInput"
          />
        </wd-cell>
      </wd-cell-group>

      <scroll-view scroll-x class="mb-12px whitespace-nowrap px-4px" :show-scrollbar="false">
        <view class="inline-flex gap-8px py-4px">
          <wd-tag
            v-for="m in bonusMultipliers"
            :key="m"
            :type="selectedBonusMul === m ? 'primary' : 'default'"
            variant="plain"
            round
            @click="applyBonusMul(m)"
          >
            {{ m === 1 ? '月薪×1' : `×${m}` }}
          </wd-tag>
        </view>
      </scroll-view>

      <wd-cell-group custom-class="salary-cell-group mb-12px" border>
        <wd-cell title="社保计算方式" :value="ssTypeLabel" is-link @click="showSsTypePicker = true" />
        <wd-cell v-if="salaryForm.ssPaymentType === 'base'" title="社保缴费基数">
          <wd-input
            type="number"
            align-right
            :model-value="String(salaryForm.ssBase)"
            custom-class="salary-cell-input"
            @update:model-value="onSsBaseInput"
          />
        </wd-cell>
        <wd-cell v-else title="社保个缴金额（月）">
          <wd-input
            type="digit"
            align-right
            :model-value="salaryForm.ssPersonalAmount ? String(salaryForm.ssPersonalAmount) : ''"
            placeholder="五险个人部分合计"
            custom-class="salary-cell-input"
            @update:model-value="onSsPersonalAmountInput"
          />
        </wd-cell>
        <wd-cell title="公积金计算方式" :value="hfBaseLabel" is-link @click="showHfTypePicker = true" />
        <wd-cell v-if="salaryForm.hfPaymentType === 'base'" title="公积金缴费基数">
          <wd-input
            type="number"
            align-right
            :model-value="String(salaryForm.hfBase)"
            custom-class="salary-cell-input"
            @update:model-value="onHfBaseInput"
          />
        </wd-cell>
        <wd-cell v-else-if="salaryForm.hfPaymentType === 'custom'" title="公积金个缴金额（月）">
          <wd-input
            type="digit"
            align-right
            :model-value="salaryForm.hfPersonalAmount ? String(salaryForm.hfPersonalAmount) : ''"
            placeholder="个人月缴存额"
            custom-class="salary-cell-input"
            @update:model-value="onHfPersonalAmountInput"
          />
        </wd-cell>
        <wd-cell v-if="showHfRatioRow" title="公积金缴纳比例">
          <view class="flex flex-1 items-center justify-end gap-4px">
            <wd-input
              type="digit"
              align-right
              :model-value="hfRatePercentStr"
              placeholder="如 12 表示 12%"
              custom-class="salary-cell-input salary-cell-input--narrow"
              @update:model-value="onHfRatePercentInput"
            />
            <text class="text-#666">
              %
            </text>
          </view>
        </wd-cell>
      </wd-cell-group>

      <wd-cell-group custom-class="salary-cell-group mb-12px" border>
        <wd-cell title="每月专项附加扣除">
          <template #title>
            <view class="flex items-center gap-4px">
              <text>每月专项附加扣除</text>
              <wd-icon
                name="question-circle"
                size="16px"
                class="text-primary"
                @click.stop="showSpecialDeductionTip = true"
              />
            </view>
          </template>
          <wd-input
            type="digit"
            align-right
            :model-value="salaryForm.specialDeductionMonthly ? String(salaryForm.specialDeductionMonthly) : ''"
            placeholder="请输入具体数额"
            custom-class="salary-cell-input"
            @update:model-value="onSpecialInput"
          />
        </wd-cell>
      </wd-cell-group>

      <wd-button :block="true" :round="true" size="large" type="primary" @click="goDetail">
        查看明细
      </wd-button>
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
      lock-scroll
    >
      <view class="picker-sheet-title">
        社保计算方式
      </view>
      <wd-cell-group border>
        <wd-cell
          v-for="opt in SS_PAYMENT_OPTIONS"
          :key="opt.value"
          :title="opt.label"
          clickable
          @click="pickSsType(opt.value)"
        />
      </wd-cell-group>
    </wd-popup>

    <wd-popup
      v-model="showYearEndModePicker"
      position="bottom"
      :z-index="popupZIndex"
      root-portal
      :safe-area-inset-bottom="true"
      closable
      lock-scroll
    >
      <view class="picker-sheet-title">
        年终计税方式
      </view>
      <wd-cell-group border>
        <wd-cell
          v-for="opt in YEAR_END_TAX_OPTIONS"
          :key="opt.value"
          :title="opt.label"
          clickable
          @click="pickYearEndMode(opt.value)"
        />
      </wd-cell-group>
    </wd-popup>

    <wd-popup
      v-model="showHfTypePicker"
      position="bottom"
      :z-index="popupZIndex"
      root-portal
      :safe-area-inset-bottom="true"
      closable
      lock-scroll
    >
      <view class="picker-sheet-title">
        公积金计算方式
      </view>
      <wd-cell-group border>
        <wd-cell
          v-for="opt in HF_PAYMENT_OPTIONS"
          :key="opt.value"
          :title="opt.label"
          clickable
          @click="pickHfType(opt.value)"
        />
      </wd-cell-group>
    </wd-popup>

    <wd-popup
      v-model="showSpecialDeductionTip"
      position="bottom"
      :z-index="popupZIndex"
      root-portal
      :safe-area-inset-bottom="true"
      closable
      lock-scroll
    >
      <view class="special-deduction-sheet">
        <view class="picker-sheet-title special-deduction-sheet__title">
          七项扣除具体金额标准
        </view>
        <scroll-view scroll-y class="special-deduction-scroll" :show-scrollbar="true">
          <view class="special-deduction-body">
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">1. 3岁以下婴幼儿照护</text>
              <text class="special-deduction-item__text">每个婴幼儿每月2000元。</text>
            </view>
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">2. 子女教育</text>
              <text class="special-deduction-item__text">每个子女每月2000元，涵盖学前教育至博士研究生教育。</text>
            </view>
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">3. 赡养老人</text>
              <text class="special-deduction-item__text">独生子女：每月3000元。</text>
              <text class="special-deduction-item__text special-deduction-item__text--sub">非独生子女：与兄弟姐妹分摊每月3000元额度，每人每月不超过1500元。</text>
            </view>
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">4. 住房贷款利息</text>
              <text class="special-deduction-item__text">每月1000元，扣除期限最长不超过240个月。</text>
            </view>
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">5. 住房租金</text>
              <text class="special-deduction-item__text">根据城市规模分三档，每月1500元、1100元或800元。</text>
            </view>
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">6. 继续教育</text>
              <text class="special-deduction-item__text">学历（学位）继续教育：每月400元。</text>
              <text class="special-deduction-item__text special-deduction-item__text--sub">职业资格继续教育：取得证书当年扣除3600元。</text>
            </view>
            <view class="special-deduction-item">
              <text class="special-deduction-item__title">7. 大病医疗</text>
              <text class="special-deduction-item__text">医保目录范围内自付部分累计超过1.5万元，在8万元限额内据实扣除。</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </wd-popup>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header--gradient {
  background-image: linear-gradient(var(--wot-primary-6, #4285f4) 10%, var(--wot-primary-6, #4285f4) 100%);
  .header-bar {
    padding-bottom: 32px;
  }
}

:deep(.salary-cell-group) {
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.salary-cell-input) {
  flex: 1;
  min-width: 0;
  padding: 0;
}

:deep(.wd-cell__body) {
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}

:deep(.salary-cell-input--narrow) {
  max-width: 120px;
  margin-left: auto;
}

.salary-cell-readonly {
  display: block;
  width: 100%;
  text-align: right;
  font-size: 15px;
  color: #333;
}

.picker-sheet-title {
  padding: 16px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}

.special-deduction-sheet {
  display: flex;
  flex-direction: column;
  max-height: 75vh;
  background: #fff;
  border-radius: 12px 12px 0 0;
}

.special-deduction-sheet__title {
  flex-shrink: 0;
}

.special-deduction-scroll {
  max-height: calc(75vh - 56px);
}

.special-deduction-body {
  padding: 12px 16px 24px;
}

.special-deduction-item {
  margin-bottom: 14px;
}

.special-deduction-item:last-child {
  margin-bottom: 0;
}

.special-deduction-item__title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
  margin-bottom: 6px;
}

.special-deduction-item__text {
  display: block;
  font-size: 13px;
  color: #555;
  line-height: 1.65;
}

.special-deduction-item__text--sub {
  margin-top: 4px;
  color: #666;
}
</style>
