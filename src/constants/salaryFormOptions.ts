import type { HfPaymentType, SsPaymentType, YearEndTaxMode } from '@/utils/salaryCalculator'

export interface SalaryOption<T extends string = string> {
  label: string
  value: T
}

/** 社保缴纳类型 */
export const SS_PAYMENT_OPTIONS: SalaryOption<SsPaymentType>[] = [
  { label: '最低基数', value: 'min_base' },
  { label: '实际工资（在上下限内）', value: 'actual_salary' },
  { label: '自定义基数', value: 'custom' },
]

/** 年终计税方式 */
export const YEAR_END_TAX_OPTIONS: SalaryOption<YearEndTaxMode>[] = [
  { label: '单独计税', value: 'separate' },
  { label: '并入综合所得', value: 'merge' },
]

/** 公积金缴纳基数 */
export const HF_PAYMENT_OPTIONS: SalaryOption<HfPaymentType>[] = [
  { label: '不缴纳', value: 'none' },
  { label: '最低基数', value: 'min_base' },
  { label: '按照工资', value: 'by_salary' },
  { label: '自定义', value: 'custom' },
]

export function salaryOptionLabel<T extends string>(
  options: SalaryOption<T>[],
  value: string,
): string {
  const row = options.find(o => o.value === value)
  if (row)
    return row.label
  return ''
}
