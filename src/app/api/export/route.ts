import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const payPeriodId = searchParams.get('payPeriodId')

  if (!payPeriodId) {
    return NextResponse.json({ error: 'payPeriodId required' }, { status: 400 })
  }

  const payPeriod = await prisma.payPeriod.findUnique({ where: { id: payPeriodId } })
  if (!payPeriod) {
    return NextResponse.json({ error: 'Pay period not found' }, { status: 404 })
  }

  const entries = await prisma.timeEntry.findMany({
    where: { payPeriodId },
    include: { employee: true },
    orderBy: [{ employee: { name: 'asc' } }, { date: 'asc' }],
  })

  // Group by employee
  const grouped: Record<string, typeof entries> = {}
  for (const entry of entries) {
    const name = entry.employee.name
    if (!grouped[name]) grouped[name] = []
    grouped[name].push(entry)
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(payPeriod.name)

  const headerFont = { bold: true, size: 11 }
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' },
  }
  const headerFontWhite = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }

  let colOffset = 0
  const employeeNames = Object.keys(grouped).sort()

  for (const empName of employeeNames) {
    const empEntries = grouped[empName]
    const startCol = colOffset + 1

    // Employee name header
    const nameCell = sheet.getCell(1, startCol)
    nameCell.value = empName
    nameCell.font = { bold: true, size: 12 }

    // Column headers
    const headers = ['Date', 'IN', 'OUT', 'HOURS', 'MINUTES']
    headers.forEach((h, i) => {
      const cell = sheet.getCell(2, startCol + i)
      cell.value = h
      cell.font = headerFontWhite
      cell.fill = headerFill
      cell.alignment = { horizontal: 'center' }
    })

    // Data rows
    let row = 3
    let totalMinutes = 0
    for (const entry of empEntries) {
      if (entry.isAdmin) {
        sheet.getCell(row, startCol).value = 'ADMIN'
        sheet.getCell(row, startCol + 3).value = entry.adminHours || 0
        sheet.getCell(row, startCol + 4).value = entry.adminMinutes || 0
        totalMinutes += (entry.adminHours || 0) * 60 + (entry.adminMinutes || 0)
      } else {
        if (entry.date) {
          sheet.getCell(row, startCol).value = new Date(entry.date)
          sheet.getCell(row, startCol).numFmt = 'MMM DD'
        }
        sheet.getCell(row, startCol + 1).value = entry.clockIn || ''
        sheet.getCell(row, startCol + 2).value = entry.clockOut || ''
        sheet.getCell(row, startCol + 3).value = entry.hours
        sheet.getCell(row, startCol + 4).value = entry.minutes
        totalMinutes += entry.hours * 60 + entry.minutes
      }
      row++
    }

    // Totals
    row = Math.max(row, 15)
    const totalRow = row
    sheet.getCell(totalRow, startCol).value = 'TOTAL'
    sheet.getCell(totalRow, startCol).font = headerFont

    const totalHrs = Math.floor(totalMinutes / 60)
    const totalMins = totalMinutes % 60
    sheet.getCell(totalRow, startCol + 3).value = totalHrs
    sheet.getCell(totalRow, startCol + 4).value = totalMins
    sheet.getCell(totalRow, startCol + 3).font = headerFont
    sheet.getCell(totalRow, startCol + 4).font = headerFont

    // Decimal
    sheet.getCell(totalRow + 1, startCol + 1).value = 'DECIMAL'
    sheet.getCell(totalRow + 1, startCol + 1).font = headerFont
    const decimal = Math.round((totalHrs + totalMins / 60) * 100) / 100
    sheet.getCell(totalRow + 1, startCol + 3).value = decimal
    sheet.getCell(totalRow + 1, startCol + 3).font = headerFont

    // Set column widths
    for (let i = 0; i < 5; i++) {
      const col = sheet.getColumn(startCol + i)
      col.width = i === 0 ? 12 : 10
    }

    colOffset += 5 + 1 // gap column
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${payPeriod.name}_timesheets.xlsx"`,
    },
  })
}
