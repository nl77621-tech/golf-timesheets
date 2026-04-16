import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDuration } from '@/lib/timeCalc'

async function recalculateStatHolidays() {
  try {
    const statHolidays = await prisma.statHoliday.findMany()
    
    for (const holiday of statHolidays) {
      const overlappingPeriods = await prisma.payPeriod.findMany({
        where: {
          startDate: { lte: holiday.windowEnd },
          endDate: { gte: holiday.windowStart },
        },
      })

      const employees = await prisma.employee.findMany({
        where: { active: true },
      })

      for (const employee of employees) {
        let totalHours = 0

        for (const period of overlappingPeriods) {
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

          const periodStart = Math.max(period.startDate.getTime(), holiday.windowStart.getTime())
          const periodEnd = Math.min(period.endDate.getTime(), holiday.windowEnd.getTime())
          const periodDuration = period.endDate.getTime() - period.startDate.getTime()
          const overlapDuration = periodEnd - periodStart
          
          if (overlapDuration <= 0) continue
          
          const proportion = overlapDuration / periodDuration
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
      }
    }
  } catch (error) {
    console.error('Error recalculating stat holidays:', error)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const payPeriodId = searchParams.get('payPeriodId')
  const employeeId = searchParams.get('employeeId')

  const where: Record<string, string> = {}
  if (payPeriodId) where.payPeriodId = payPeriodId
  if (employeeId) where.employeeId = employeeId

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { employee: true, payPeriod: true },
    orderBy: [{ date: 'asc' }],
  })
  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { employeeId, payPeriodId, date, clockIn, clockOut, isAdmin, adminHours, adminMinutes } = body

  let hours = 0
  let minutes = 0
  if (!isAdmin && clockIn && clockOut) {
    const duration = calculateDuration(clockIn, clockOut)
    hours = duration.hours
    minutes = duration.minutes
  }

  const entry = await prisma.timeEntry.create({
    data: {
      employeeId,
      payPeriodId,
      date: date ? new Date(date) : null,
      clockIn: isAdmin ? null : clockIn,
      clockOut: isAdmin ? null : clockOut,
      hours,
      minutes,
      isAdmin: isAdmin || false,
      adminHours: isAdmin ? (adminHours || 0) : null,
      adminMinutes: isAdmin ? (adminMinutes || 0) : null,
    },
  })

  // Recalculate stat holidays in background
  await recalculateStatHolidays()

  return NextResponse.json(entry)
}
