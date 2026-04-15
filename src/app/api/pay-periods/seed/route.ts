import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PAY_PERIODS_2026, STAT_HOLIDAYS_2026 } from '@/lib/payPeriods'

export async function POST() {
  // Seed pay periods
  for (const pp of PAY_PERIODS_2026) {
    await prisma.payPeriod.upsert({
      where: { name: pp.name },
      update: {},
      create: {
        name: pp.name,
        startDate: new Date(pp.startDate),
        endDate: new Date(pp.endDate),
      },
    })
  }

  // Seed stat holidays
  for (const sh of STAT_HOLIDAYS_2026) {
    const existing = await prisma.statHoliday.findFirst({
      where: { name: sh.name },
    })
    if (!existing) {
      await prisma.statHoliday.create({
        data: {
          name: sh.name,
          displayName: sh.displayName,
          date: new Date(sh.date),
          windowStart: new Date(sh.windowStart),
          windowEnd: new Date(sh.windowEnd),
        },
      })
    }
  }

  return NextResponse.json({ success: true, message: 'Seeded pay periods and stat holidays' })
}
