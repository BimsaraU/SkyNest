import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type - check both MIME type and extension for better compatibility
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExt = path.extname(file.name).toLowerCase();
    
    const isValidMimeType = allowedMimeTypes.includes(file.type.toLowerCase());
    const isValidExtension = allowedExtensions.includes(fileExt);
    
    if (!isValidMimeType && !isValidExtension) {
      return NextResponse.json(
        { error: `Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed. (Type: ${file.type}, Ext: ${fileExt})` },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name);
    const filename = `room-${timestamp}-${randomStr}${ext}`;

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'rooms');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return URL
    const url = `/uploads/rooms/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET - List all uploaded room images
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fs = require('fs');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'rooms');

    if (!existsSync(uploadDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(uploadDir);
    const images = files
      .filter((file: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
      .map((file: string) => ({
        filename: file,
        url: `/uploads/rooms/${file}`,
        timestamp: fs.statSync(path.join(uploadDir, file)).mtime
      }))
      .sort((a: any, b: any) => b.timestamp - a.timestamp);

    return NextResponse.json({ images });
  } catch (error) {
    console.error('[UPLOAD] Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files', details: (error as Error).message },
      { status: 500 }
    );
  }
}
