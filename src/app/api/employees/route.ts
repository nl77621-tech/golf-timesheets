import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(employees)
}

export async function POST(request: NextRequest) {
  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const employee = await prisma.employee.create({
    data: { name: name.trim().toUpperCase() },
  })
  return NextResponse.json(employee)
}
