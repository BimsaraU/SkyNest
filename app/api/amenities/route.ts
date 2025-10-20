import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    console.log('[AMENITIES API] Fetching amenities from database...');
    
    // Use the same query as admin - simple and direct
    const result = await pool.query(
      'SELECT * FROM amenities ORDER BY name ASC'
    );

    console.log('[AMENITIES API] Successfully fetched amenities:', result.rows.length);

    return NextResponse.json({ amenities: result.rows });
  } catch (error) {
    console.error('[AMENITIES API] Error:', error);
    console.error('[AMENITIES API] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch amenities',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
