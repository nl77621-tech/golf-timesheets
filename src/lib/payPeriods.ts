export interface PayPeriodDef {
  name: string
  startDate: string
  endDate: string
}

export const PAY_PERIODS_2026: PayPeriodDef[] = [
  { name: 'MAR02-MAR15', startDate: '2026-03-02', endDate: '2026-03-15' },
  { name: 'MAR16-MAR29', startDate: '2026-03-16', endDate: '2026-03-29' },
  { name: 'MAR30-APR12', startDate: '2026-03-30', endDate: '2026-04-12' },
  { name: 'APR13-APR26', startDate: '2026-04-13', endDate: '2026-04-26' },
  { name: 'APR27-MAY10', startDate: '2026-04-27', endDate: '2026-05-10' },
  { name: 'MAY11-MAY24', startDate: '2026-05-11', endDate: '2026-05-24' },
  { name: 'MAY25-JUN07', startDate: '2026-05-25', endDate: '2026-06-07' },
  { name: 'JUN08-JUN21', startDate: '2026-06-08', endDate: '2026-06-21' },
  { name: 'JUN22-JUL05', startDate: '2026-06-22', endDate: '2026-07-05' },
  { name: 'JUL06-JUL19', startDate: '2026-07-06', endDate: '2026-07-19' },
  { name: 'JUL20-AUG02', startDate: '2026-07-20', endDate: '2026-08-02' },
  { name: 'AUG03-AUG16', startDate: '2026-08-03', endDate: '2026-08-16' },
  { name: 'AUG17-AUG30', startDate: '2026-08-17', endDate: '2026-08-30' },
  { name: 'AUG31-SEP13', startDate: '2026-08-31', endDate: '2026-09-13' },
  { name: 'SEP14-SEP27', startDate: '2026-09-14', endDate: '2026-09-27' },
  { name: 'SEP28-OCT11', startDate: '2026-09-28', endDate: '2026-10-11' },
  { name: 'OCT12-OCT25', startDate: '2026-10-12', endDate: '2026-10-25' },
  { name: 'OCT26-NOV08', startDate: '2026-10-26', endDate: '2026-11-08' },
  { name: 'NOV09-NOV22', startDate: '2026-11-09', endDate: '2026-11-22' },
  { name: 'NOV23-DEC06', startDate: '2026-11-23', endDate: '2026-12-06' },
  { name: 'DEC07-DEC20', startDate: '2026-12-07', endDate: '2026-12-20' },
]

export const STAT_HOLIDAYS_2026 = [
  {
    name: 'GD-FRIDAY',
    displayName: 'Good Friday',
    date: '2026-04-03',
    windowStart: '2026-03-05',
    windowEnd: '2026-04-01',
  },
  {
    name: 'VIC-DAY',
    displayName: 'Victoria Day',
    date: '2026-05-18',
    windowStart: '2026-04-19',
    windowEnd: '2026-05-16',
  },
  {
    name: 'CANADA-DAY',
    displayName: 'Canada Day',
    date: '2026-07-01',
    windowStart: '2026-06-02',
    windowEnd: '2026-06-29',
  },
  {
    name: 'LABOUR-DAY',
    displayName: 'Labour Day',
    date: '2026-09-07',
    windowStart: '2026-08-09',
    windowEnd: '2026-09-05',
  },
  {
    name: 'THANKSGIV',
    displayName: 'Thanksgiving',
    date: '2026-10-12',
    windowStart: '2026-09-13',
    windowEnd: '2026-10-10',
  },
  {
    name: 'CHRISTMAS',
    displayName: 'Christmas Day',
    date: '2026-12-25',
    windowStart: '2026-11-26',
    windowEnd: '2026-12-23',
  },
  {
    name: 'BOXING-DAY',
    displayName: 'Boxing Day',
    date: '2026-12-26',
    windowStart: '2026-11-27',
    windowEnd: '2026-12-24',
  },
]

export function getCurrentPayPeriod(): string {
  const now = new Date()
  for (const pp of PAY_PERIODS_2026) {
    const start = new Date(pp.startDate)
    const end = new Date(pp.endDate)
    end.setHours(23, 59, 59)
    if (now >= start && now <= end) return pp.name
  }
  return PAY_PERIODS_2026[0].name
}
