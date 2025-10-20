import { NextResponse, NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Helper to get user from token
async function getUserFromToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    console.error('[UPLOAD] No token found');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('[UPLOAD] Token verified for user:', payload.userId);
    return payload;
  } catch (error) {
    console.error('[UPLOAD] Token verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId as number;
    const role = (user.role as string).toLowerCase();

    console.log('[UPLOAD] Processing upload for user:', userId, 'role:', role);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${role}-${userId}-${Date.now()}.${extension}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update database with new profile picture path
    const profilePicturePath = `/uploads/profile-pictures/${filename}`;
    
    let tableName = '';
    if (role === 'admin') tableName = 'admins';
    else if (role === 'staff') tableName = 'staff';
    else if (role === 'guest') tableName = 'guests';

    const updateQuery = `
      UPDATE ${tableName}
      SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING profile_picture
    `;

    const result = await pool.query(updateQuery, [profilePicturePath, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update profile picture' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Profile picture uploaded successfully',
      profile_picture: profilePicturePath
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: (error as Error).message },
      { status: 500 }
    );
  }
}
