import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      // Fetch real user data from database
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          avatarThumbnail: true,
          avatarMedium: true,
          avatarLarge: true,
          avatarFileName: true,
        },
      });

      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// Helper function to create image variants
async function createImageVariants(buffer: Buffer, filename: string) {
  const variants = {
    original: buffer,
    thumbnail: null as Buffer | null,
    medium: null as Buffer | null,
    large: null as Buffer | null,
  };

  try {
    // Create thumbnail (128x128)
    variants.thumbnail = await sharp(buffer)
      .resize(128, 128, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Create medium (256x256)
    variants.medium = await sharp(buffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Create large (512x512)
    variants.large = await sharp(buffer)
      .resize(512, 512, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 95 })
      .toBuffer();

  } catch (error) {
    console.error("Error creating image variants:", error);
    // Fallback to original for all variants
    variants.thumbnail = buffer;
    variants.medium = buffer;
    variants.large = buffer;
  }

  return variants;
}

// Helper function to save file to public directory
async function saveFile(buffer: Buffer, filename: string, subdirectory = '') {
  const publicDir = join(process.cwd(), 'public');
  const uploadDir = join(publicDir, 'uploads', subdirectory);

  // Ensure directory exists
  await mkdir(uploadDir, { recursive: true });

  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buffer);

  // Return public URL path
  return `/uploads/${subdirectory}/${filename}`;
}

// Helper function to delete old avatar files
async function deleteOldAvatarFiles(avatarUrls: string[]) {
  for (const url of avatarUrls) {
    if (url && url.startsWith('/uploads/')) {
      try {
        const filePath = join(process.cwd(), 'public', url);
        await unlink(filePath);
      } catch (error) {
        // File might not exist, continue
        console.warn(`Could not delete old avatar file: ${url}`);
      }
    }
  }
}

// POST /api/profile/avatar - Upload profile avatar
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Invalid file type. Only JPEG, PNG, and WebP are allowed."
      }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File size too large. Maximum size is 5MB."
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const baseFilename = `${timestamp}_${originalName}`;
    const userId = user.id.toString();

    // Create image variants
    const variants = await createImageVariants(buffer, baseFilename);

    // Save all variants
    const avatarUrls = {
      original: await saveFile(variants.original, baseFilename, `avatars/${userId}`),
      thumbnail: await saveFile(variants.thumbnail!, `${baseFilename.replace(/\.[^/.]+$/, '')}_thumb.jpg`, `avatars/${userId}`),
      medium: await saveFile(variants.medium!, `${baseFilename.replace(/\.[^/.]+$/, '')}_medium.jpg`, `avatars/${userId}`),
      large: await saveFile(variants.large!, `${baseFilename.replace(/\.[^/.]+$/, '')}_large.jpg`, `avatars/${userId}`),
    };

    // Delete old avatar files if they exist
    const oldUrls = [user.avatar, user.avatarThumbnail, user.avatarMedium, user.avatarLarge].filter(Boolean) as string[];
    if (oldUrls.length > 0) {
      await deleteOldAvatarFiles(oldUrls);
    }

    // Update user in database
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        avatar: avatarUrls.original,
        avatarThumbnail: avatarUrls.thumbnail,
        avatarMedium: avatarUrls.medium,
        avatarLarge: avatarUrls.large,
        avatarFileName: originalName,
        avatarFileSize: file.size,
        avatarMimeType: file.type,
        avatarUploadedAt: new Date(),
      },
      select: {
        avatar: true,
        avatarThumbnail: true,
        avatarMedium: true,
        avatarLarge: true,
        avatarFileName: true,
        avatarFileSize: true,
        avatarMimeType: true,
        avatarUploadedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrls.medium, // Use medium size for main display
      avatarUrls: avatarUrls,
      metadata: {
        fileName: originalName,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: updatedUser.avatarUploadedAt?.toISOString(),
      },
      message: "Avatar uploaded successfully"
    });

  } catch (error: unknown) {
    console.error("Error uploading avatar:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to upload avatar", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/avatar - Delete profile avatar
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current avatar URLs before deleting
    const currentUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: {
        avatar: true,
        avatarThumbnail: true,
        avatarMedium: true,
        avatarLarge: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete old avatar files if they exist
    const oldUrls = [
      currentUser.avatar,
      currentUser.avatarThumbnail,
      currentUser.avatarMedium,
      currentUser.avatarLarge
    ].filter(Boolean) as string[];

    if (oldUrls.length > 0) {
      await deleteOldAvatarFiles(oldUrls);
    }

    // Clear avatar fields in database
    await prisma.users.update({
      where: { id: user.id },
      data: {
        avatar: null,
        avatarThumbnail: null,
        avatarMedium: null,
        avatarLarge: null,
        avatarFileName: null,
        avatarFileSize: null,
        avatarMimeType: null,
        avatarUploadedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Avatar deleted successfully"
    });

  } catch (error: unknown) {
    console.error("Error deleting avatar:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to delete avatar", details: errorMessage },
      { status: 500 }
    );
  }
}
