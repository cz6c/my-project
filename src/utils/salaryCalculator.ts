/**
 * Offer 工资计算器 — 计算逻辑（参考深圳常见比例，各地政策不同，结果仅供参考）
 */

import { getSalaryCityName } from '@/constants/salaryCityPicker'

export type YearEndTaxMode = 'separate' | 'merge'
export type SsPaymentType = 'min_base' | 'actual_salary' | 'custom'
/** 公积金缴纳基数方式：不缴纳 | 最低基数 | 按照工资 | 自定义 */
export type HfPaymentType = 'none' | 'min_base' | 'by_salary' | 'custom'

export interface CityProfile {
  id: string
  name: string
  /** 社保公积金缴费基数下限（参考当地最低工资或政策说明） */
  ssBaseMin: number
  /** 缴费基数上限（简化：取常见上限，实际以当地为准） */
  ssBaseCap: number
  /** 个人比例：养老、医疗、失业 */
  ssPersonalRates: { pension: number, medical: number, unemployment: number }
  /** 单位比例：养老、医疗、失业、工伤、生育 */
  ssCompanyRates: { pension: number, medical: number, unemployment: number, injury: number, maternity: number }
}

export const CITY_LIST: CityProfile[] = [
  {
    id: 'shenzhen',
    name: '深圳市',
    ssBaseMin: 4775,
    // ssBaseMin1: 6727,
    // ssBaseMin2: 2520,
    ssBaseCap: 27549,
    ssPersonalRates: { pension: 0.08, medical: 0.02, unemployment: 0.002 },
    ssCompanyRates: { pension: 0.16, medical: 0.06, unemployment: 0.008, injury: 0.002, maternity: 0.005 },
  },
]

/** 带名字的参保参数；列表未单独配置的城市按深圳模板近似（仅供参考） */
export function getCityProfile(cityId: string): CityProfile {
  const hit = CITY_LIST.find(c => c.id === cityId)
  if (hit)
    return hit
  const t = CITY_LIST[0]
  return {
    id: cityId,
    name: getSalaryCityName(cityId) || cityId,
    ssBaseMin: t.ssBaseMin,
    ssBaseCap: t.ssBaseCap,
    ssPersonalRates: { ...t.ssPersonalRates },
    ssCompanyRates: { ...t.ssCompanyRates },
  }
}

export interface SalaryCalcInput {
  cityId: string
  preTaxMonthly: number
  yearEndTaxMode: YearEndTaxMode
  yearEndBonus: number
  ssPaymentType: SsPaymentType
  ssBase: number
  hfPaymentType: HfPaymentType
  hfRate: number
  hfBase: number
  specialDeductionMonthly: number
}

export interface InsuranceRow {
  key: string
  label: string
  personal: number
  personalRateText: string
  company: number
  companyRateText: string
}

export interface MonthlySalaryRow {
  month: number
  preTax: number
  tax: number
  postTax: number
}

export interface SalaryCalcResult {
  city: CityProfile
  resolvedSsBase: number
  resolvedHfBase: number
  /** 首月税后（累计预扣法下首月） */
  firstMonthNet: number
  /** 稳定后月均税后（取第 12 月，便于展示） */
  steadyMonthNet: number
  /** 当年实发（12 月薪税后 + 年终奖税后，年终奖单独计税时一次性并入年现金流） */
  annualTakeHome: number
  annualTaxTotal: number
  monthlyTax: number[]
  monthlyRows: MonthlySalaryRow[]
  firstMonthIncomeTax: number
  ssPersonalMonthly: number
  hfPersonalMonthly: number
  ssCompanyMonthly: number
  hfCompanyMonthly: number
  insuranceRows: InsuranceRow[]
  yearEndBonusTax: number
  yearEndBonusNet: number
}

/** 累计预扣应纳税所得额对应的累计税额：税额 = 应纳税所得额 × 税率 - 速算扣除数 */
function cumulativeSalaryTax(cumulativeTaxable: number): number {
  if (cumulativeTaxable <= 0)
    return 0
  const tiers = [
    { max: 36000, rate: 0.03, quick: 0 },
    { max: 144000, rate: 0.1, quick: 2520 },
    { max: 300000, rate: 0.2, quick: 16920 },
    { max: 420000, rate: 0.25, quick: 31920 },
    { max: 660000, rate: 0.3, quick: 52920 },
    { max: 960000, rate: 0.35, quick: 85920 },
    { max: Infinity, rate: 0.45, quick: 181920 },
  ]
  for (const t of tiers) {
    if (cumulativeTaxable <= t.max)
      return cumulativeTaxable * t.rate - t.quick
  }
  return 0
}

/** 全年一次性奖金单独计税：按月换算税率表 */
function yearEndBonusSeparateTax(bonus: number): number {
  if (bonus <= 0)
    return 0
  const m = bonus / 12
  const table: { max: number, rate: number, deduct: number }[] = [
    { max: 3000, rate: 0.03, deduct: 0 },
    { max: 12000, rate: 0.1, deduct: 210 },
    { max: 25000, rate: 0.2, deduct: 1410 },
    { max: 35000, rate: 0.25, deduct: 2660 },
    { max: 55000, rate: 0.3, deduct: 4410 },
    { max: 80000, rate: 0.35, deduct: 7160 },
    { max: Infinity, rate: 0.45, deduct: 15160 },
  ]
  for (const row of table) {
    if (m <= row.max)
      return Math.max(0, bonus * row.rate - row.deduct)
  }
  return 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveSsBase(input: SalaryCalcInput, city: CityProfile): number {
  const floor = city.ssBaseMin
  if (input.ssPaymentType === 'min_base')
    return Math.min(Math.max(floor, city.ssBaseMin), city.ssBaseCap)
  if (input.ssPaymentType === 'actual_salary')
    return Math.min(Math.max(input.preTaxMonthly, floor), city.ssBaseCap)
  return Math.min(Math.max(input.ssBase || floor, floor), city.ssBaseCap)
}

function resolveHfBase(input: SalaryCalcInput, city: CityProfile, ssBase: number): number {
  // 旧版历史数据「与社保同基数」
  if ((input.hfPaymentType as string) === 'same_as_ss')
    return ssBase
  if (input.hfPaymentType === 'none')
    return 0
  const floor = city.ssBaseMin
  const cap = city.ssBaseCap
  if (input.hfPaymentType === 'min_base')
    return Math.min(Math.max(city.ssBaseMin, floor), cap)
  if (input.hfPaymentType === 'by_salary')
    return Math.min(Math.max(input.preTaxMonthly, floor), cap)
  return Math.min(Math.max(input.hfBase || floor, floor), cap)
}

export function calcSalary(input: SalaryCalcInput): SalaryCalcResult {
  const city = getCityProfile(input.cityId)
  const resolvedSsBase = resolveSsBase(input, city)
  const resolvedHfBase = resolveHfBase(input, city, resolvedSsBase)
  const ssBase = resolvedSsBase
  const hfBase = resolvedHfBase
  const r = city.ssPersonalRates
  const cr = city.ssCompanyRates

  const ssPersonalMonthly = round2(
    ssBase * (r.pension + r.medical + r.unemployment),
  )
  const hfPersonalMonthly = input.hfPaymentType === 'none'
    ? 0
    : round2(hfBase * input.hfRate)

  const ssCompanyMonthly = round2(
    ssBase * (cr.pension + cr.medical + cr.unemployment + cr.injury + cr.maternity),
  )
  const hfCompanyMonthly = input.hfPaymentType === 'none'
    ? 0
    : round2(hfBase * input.hfRate)

  const monthlyFixedDeduction = ssPersonalMonthly + hfPersonalMonthly + input.specialDeductionMonthly

  const monthlyTax: number[] = []
  let prevCumulativeTax = 0
  for (let month = 1; month <= 12; month++) {
    const cumulativeIncome = input.preTaxMonthly * month
    const cumulativeDeduct = (5000 + monthlyFixedDeduction) * month
    const cumulativeTaxable = cumulativeIncome - cumulativeDeduct
    const cumTax = cumulativeSalaryTax(cumulativeTaxable)
    const monthTax = round2(Math.max(0, cumTax - prevCumulativeTax))
    prevCumulativeTax = cumTax
    monthlyTax.push(monthTax)
  }

  const monthlyRows: MonthlySalaryRow[] = []
  for (let i = 0; i < 12; i++) {
    const tax = monthlyTax[i]
    const post = round2(input.preTaxMonthly - ssPersonalMonthly - hfPersonalMonthly - tax)
    monthlyRows.push({
      month: i + 1,
      preTax: input.preTaxMonthly,
      tax,
      postTax: post,
    })
  }

  const firstMonthIncomeTax = monthlyTax[0]
  const firstMonthNet = monthlyRows[0].postTax
  const steadyMonthNet = monthlyRows[11].postTax

  const monthlyTaxableApprox = Math.max(0, input.preTaxMonthly - 5000 - monthlyFixedDeduction)
  const annualSalaryTaxable = monthlyTaxableApprox * 12
  let yearEndBonusTax = 0
  if (input.yearEndBonus > 0) {
    if (input.yearEndTaxMode === 'separate')
      yearEndBonusTax = round2(yearEndBonusSeparateTax(input.yearEndBonus))
    else
      yearEndBonusTax = round2(Math.max(0, cumulativeSalaryTax(annualSalaryTaxable + input.yearEndBonus) - cumulativeSalaryTax(annualSalaryTaxable)))
  }
  const yearEndBonusNet = round2(Math.max(0, input.yearEndBonus - yearEndBonusTax))

  const sumMonthlyNet = monthlyRows.reduce((s, r) => s + r.postTax, 0)
  const annualTakeHome = round2(sumMonthlyNet + yearEndBonusNet)
  const annualTaxTotal = round2(
    monthlyTax.reduce((a, b) => a + b, 0) + yearEndBonusTax,
  )

  const pensionP = round2(ssBase * r.pension)
  const medicalP = round2(ssBase * r.medical)
  const unempP = round2(ssBase * r.unemployment)
  const pensionC = round2(ssBase * cr.pension)
  const medicalC = round2(ssBase * cr.medical)
  const unempC = round2(ssBase * cr.unemployment)
  const injuryC = round2(ssBase * cr.injury)
  const matC = round2(ssBase * cr.maternity)
  const hfP = hfPersonalMonthly
  const hfC = hfCompanyMonthly
  const rate = (x: number) => `${(x * 100)}%`

  const insuranceRows: InsuranceRow[] = [
    { key: 'pension', label: '养老保险', personal: pensionP, personalRateText: rate(r.pension), company: pensionC, companyRateText: rate(cr.pension) },
    { key: 'medical', label: '医疗保险', personal: medicalP, personalRateText: rate(r.medical), company: medicalC, companyRateText: rate(cr.medical) },
    { key: 'unemp', label: '失业保险', personal: unempP, personalRateText: rate(r.unemployment), company: unempC, companyRateText: rate(cr.unemployment) },
    { key: 'injury', label: '工伤保险', personal: 0, personalRateText: '0%', company: injuryC, companyRateText: rate(cr.injury) },
    { key: 'mat', label: '生育保险', personal: 0, personalRateText: '0%', company: matC, companyRateText: rate(cr.maternity) },
    {
      key: 'hf',
      label: '公积金',
      personal: hfP,
      personalRateText: input.hfPaymentType === 'none' ? '0%' : `${(Math.min(input.hfRate, 1) * 100).toFixed(1).replace(/\.0$/, '')}%`,
      company: hfC,
      companyRateText: input.hfPaymentType === 'none' ? '0%' : `${(Math.min(input.hfRate, 1) * 100).toFixed(1).replace(/\.0$/, '')}%`,
    },
  ]

  return {
    city,
    resolvedSsBase: ssBase,
    resolvedHfBase: hfBase,
    firstMonthNet,
    steadyMonthNet,
    annualTakeHome,
    annualTaxTotal,
    monthlyTax,
    monthlyRows,
    firstMonthIncomeTax,
    ssPersonalMonthly,
    hfPersonalMonthly,
    ssCompanyMonthly,
    hfCompanyMonthly,
    insuranceRows,
    yearEndBonusTax,
    yearEndBonusNet,
  }
}
