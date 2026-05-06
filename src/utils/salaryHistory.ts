import type { SalaryCalcInput, SalaryCalcResult } from '@/utils/salaryCalculator'

const STORAGE_KEY = 'salary-calc-history-v2'
const LEGACY_STORAGE_KEY = 'salary-calc-history-v1'
const MAX = 50

export interface SalaryHistoryItem {
  id: string
  savedAt: number
  /** 展示用摘要 */
  title: string
  firstMonthNet: number
  input: SalaryCalcInput
  /** 点击「查看明细」时写入的完整计算快照，保证历史明细与当时一致 */
  result?: SalaryCalcResult
}

/** 深拷贝计算结果，便于序列化写入本地 */
export function cloneSalaryCalcResult(r: SalaryCalcResult): SalaryCalcResult {
  return JSON.parse(JSON.stringify(r)) as SalaryCalcResult
}

function readRawList(): SalaryHistoryItem[] {
  try {
    let raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw)
      raw = uni.getStorageSync(LEGACY_STORAGE_KEY)
    if (!raw)
      return []
    const arr = JSON.parse(raw as string) as SalaryHistoryItem[]
    return Array.isArray(arr) ? arr : []
  }
  catch {
    return []
  }
}

/** 从 v1 迁到 v2 存储键，避免与旧结构混用 */
function migrateStorageIfNeeded(list: SalaryHistoryItem[]) {
  try {
    const hasV2 = uni.getStorageSync(STORAGE_KEY)
    if (!hasV2 && uni.getStorageSync(LEGACY_STORAGE_KEY)) {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(list))
      uni.removeStorageSync(LEGACY_STORAGE_KEY)
    }
  }
  catch {
    // ignore
  }
}

export function loadSalaryHistory(): SalaryHistoryItem[] {
  const list = readRawList()
  migrateStorageIfNeeded(list)
  return list
}

export function prependSalaryHistory(item: Omit<SalaryHistoryItem, 'savedAt'> & { savedAt?: number }) {
  const list = loadSalaryHistory()
  const entry: SalaryHistoryItem = {
    id: item.id,
    savedAt: item.savedAt || Date.now(),
    title: item.title,
    firstMonthNet: item.firstMonthNet,
    input: item.input,
    result: item.result,
  }
  const next = [entry, ...list.filter(i => i.id !== entry.id)].slice(0, MAX)
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(next))
  if (uni.getStorageSync(LEGACY_STORAGE_KEY))
    uni.removeStorageSync(LEGACY_STORAGE_KEY)
}

export function findSalaryHistoryById(id: string): SalaryHistoryItem | undefined {
  return loadSalaryHistory().find(i => i.id === id)
}
