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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  let hours = body.hours
  let minutes = body.minutes
  if (!body.isAdmin && body.clockIn && body.clockOut) {
    const duration = calculateDuration(body.clockIn, body.clockOut)
    hours = duration.hours
    minutes = duration.minutes
  }

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      hours,
      minutes,
    },
  })

  // Recalculate stat holidays in background
  await recalculateStatHolidays()

  return NextResponse.json(entry)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.timeEntry.delete({ where: { id } })

  // Recalculate stat holidays in background
  await recalculateStatHolidays()

  return NextResponse.json({ success: true })
}
