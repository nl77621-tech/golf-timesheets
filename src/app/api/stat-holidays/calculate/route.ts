import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { statHolidayId } = await request.json()

  const holiday = await prisma.statHoliday.findUnique({
    where: { id: statHolidayId },
  })
  if (!holiday) {
    return NextResponse.json({ error: 'Holiday not found' }, { status: 404 })
  }

  // Find pay periods that overlap with the 4-week window
  const overlappingPeriods = await prisma.payPeriod.findMany({
    where: {
      startDate: { lte: holiday.windowEnd },
      endDate: { gte: holiday.windowStart },
    },
    orderBy: { startDate: 'asc' },
  })

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })

  const results = []

  for (const employee of employees) {
    let totalHours = 0

    for (const period of overlappingPeriods) {
      // Get time entries for this employee in this period
      const entries = await prisma.timeEntry.findMany({
        where: {
          employeeId: employee.id,
          payPeriodId: period.id,
        },
      })

      let periodMinutes = 0
      for (const entry of entries) {
        if (entry.isAdmin) {
          periodMinutes += (entry.adminHours || 0) * 60 + (entry.adminMinutes || 0)
        } else {
          periodMinutes += entry.hours * 60 + entry.minutes
        }
      }

      // Calculate overlap proportion using milliseconds for accuracy
      const periodStart = Math.max(period.startDate.getTime(), holiday.windowStart.getTime())
      const periodEnd = Math.min(period.endDate.getTime(), holiday.windowEnd.getTime())
      const periodDuration = period.endDate.getTime() - period.startDate.getTime()
      const overlapDuration = periodEnd - periodStart
      
      // If overlap duration is negative or zero, skip this period
      if (overlapDuration <= 0) continue
      
      const proportion = overlapDuration / periodDuration

      // Only count the proportional hours within the window
      totalHours += (periodMinutes / 60) * proportion
    }

    const statPayHours = totalHours > 0 ? Math.round((totalHours / 20) * 100) / 100 : 0

    await prisma.statHolidayEntry.upsert({
      where: {
        statHolidayId_employeeId: {
          statHolidayId: holiday.id,
          employeeId: employee.id,
        },
      },
      update: { totalHours: Math.round(totalHours * 100) / 100, statPayHours },
      create: {
        statHolidayId: holiday.id,
        employeeId: employee.id,
        totalHours: Math.round(totalHours * 100) / 100,
        statPayHours,
      },
    })

    results.push({
      employee: employee.name,
      totalHours: Math.round(totalHours * 100) / 100,
      statPayHours,
    })
  }

  return NextResponse.json({ success: true, results })
}
