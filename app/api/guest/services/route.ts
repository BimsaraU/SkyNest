import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/guest/services
 * Fetch all available services from service catalog
 */
export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT 
        service_id,
        name,
        description,
        price,
        category,
        available
      FROM service_catalog
      WHERE available = true
      ORDER BY category, name
    `)

    return NextResponse.json({
      success: true,
      services: result.rows
    })
  } catch (error) {
    console.error('[GET /api/guest/services] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
