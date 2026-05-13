<script lang="ts" setup>
import { computed, ref } from 'vue'
import {
  filterSalaryCities,
  groupSalaryCitiesByIndex,
  hotSalaryCityOptions,
  SALARY_INDEX_LETTERS,
} from '@/constants/salaryCityPicker'
import { useSalaryCalcStore } from '@/store/salaryCalc'
import { getCityProfile } from '@/utils/salaryCalculator'

defineOptions({ name: 'SalarySelectCity' })

definePage({
  style: {
    navigationBarTitleText: '选择城市',
  },
})

const store = useSalaryCalcStore()
const keyword = ref('')

const grouped = groupSalaryCitiesByIndex()
const hotList = hotSalaryCityOptions()

const keywordTrimmed = computed(() => keyword.value.trim())
const filtered = computed(() => filterSalaryCities(keyword.value))

const lettersWithData = computed(() =>
  SALARY_INDEX_LETTERS.filter(letter => (grouped[letter]?.length ?? 0) > 0),
)

function selectCity(id: string) {
  store.patchInput({ cityId: id })
  const city = getCityProfile(id)
  if (store.input.ssPaymentType === 'base') {
    const p = store.input.preTaxMonthly
    store.patchInput({ ssBase: Math.min(Math.max(p, city.ssBaseMin), city.ssBaseCap) })
  }
  if (store.input.hfPaymentType === 'base') {
    const p = store.input.preTaxMonthly
    store.patchInput({ hfBase: Math.min(Math.max(p, city.ssBaseMin), city.ssBaseCap) })
  }
  uni.navigateBack()
}
</script>

<template>
  <view class="city-page">
    <view class="city-search">
      <wd-search
        v-model="keyword"
        placeholder="请输入城市名（中文）"
        hide-cancel
      />
    </view>

    <scroll-view v-if="keywordTrimmed" scroll-y class="city-scroll">
      <view v-if="filtered.length === 0" class="city-empty">
        暂无匹配城市
      </view>
      <view
        v-for="c in filtered"
        :key="c.id"
        class="city-row"
        @click="selectCity(c.id)"
      >
        {{ c.name }}
      </view>
    </scroll-view>

    <wd-index-bar v-else class="city-index-bar">
      <view class="hot-section">
        <text class="hot-title">
          热门城市
        </text>
        <view class="hot-grid">
          <view
            v-for="c in hotList"
            :key="c.id"
            class="hot-cell"
            @click="selectCity(c.id)"
          >
            {{ c.name }}
          </view>
        </view>
      </view>
      <template v-for="letter in lettersWithData" :key="letter">
        <wd-index-anchor :index="letter" />
        <view
          v-for="c in grouped[letter]"
          :key="c.id"
          class="city-row"
          @click="selectCity(c.id)"
        >
          {{ c.name }}
        </view>
      </template>
    </wd-index-bar>
  </view>
</template>

<style scoped lang="scss">
.city-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
}
.city-search {
  flex-shrink: 0;
  padding: 8px 12px 12px;
  background: #fff;
}
.city-scroll {
  flex: 1;
  height: 0;
  background: #fff;
}
.city-index-bar {
  flex: 1;
  height: 0;
  min-height: 0;
}
.hot-section {
  padding: 4px 12px 20px;
  background: #fff;
}
.hot-title {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}
.hot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.hot-cell {
  box-sizing: border-box;
  padding: 12px 6px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  color: #333;
  text-align: center;
  background: #fff;
}
.city-row {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 15px;
  color: #333;
  background: #fff;
}
.city-empty {
  padding: 48px 16px;
  font-size: 14px;
  color: #999;
  text-align: center;
}
</style>
