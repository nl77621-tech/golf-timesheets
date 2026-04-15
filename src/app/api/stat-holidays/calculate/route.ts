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
      // Calculate overlap proportion
      const periodStart = new Date(Math.max(period.startDate.getTime(), holiday.windowStart.getTime()))
      const periodEnd = new Date(Math.min(period.endDate.getTime(), holiday.windowEnd.getTime()))
      const periodLength = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
      const overlapLength = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) + 1
      const proportion = overlapLength / periodLength

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

      // Only count the proportional hours within the window
      totalHours += (periodMinutes / 60) * proportion
    }

    const statPayHours = Math.round((totalHours / 20) * 100) / 100

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
