import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'STAFF')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')
    const roomTypeId = searchParams.get('roomTypeId')
    const status = searchParams.get('status')
    const floor = searchParams.get('floor')

    const where: any = {}

    if (branchId) where.branchId = branchId
    if (roomTypeId) where.roomTypeId = roomTypeId
    if (status) where.status = status
    if (floor) where.floor = parseInt(floor)

    const rooms = await prisma.room.findMany({
      where,
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            bedType: true,
            maxOccupancy: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    })

    // Transform to convert Decimal to number
    const transformedRooms = rooms.map((room) => ({
      ...room,
      roomType: {
        ...room.roomType,
        basePrice: parseFloat(room.roomType.basePrice.toString()),
      },
    }))

    return NextResponse.json(
      {
        success: true,
        count: transformedRooms.length,
        data: transformedRooms,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching room instances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room instances' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { roomNumber, floor, roomTypeId, branchId, notes } = body

    // Validation
    if (!roomNumber || !floor || !roomTypeId || !branchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if room number already exists in branch
    const existingRoom = await prisma.room.findFirst({
      where: {
        roomNumber,
        branchId,
      },
    })

    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room number already exists in this branch' },
        { status: 400 }
      )
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        roomNumber,
        floor: parseInt(floor.toString()),
        roomTypeId,
        branchId,
        notes: notes || null,
        status: 'AVAILABLE',
      },
      include: {
        roomType: true,
        branch: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Room created successfully',
        data: room,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}