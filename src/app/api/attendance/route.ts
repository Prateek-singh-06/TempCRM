import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { AttendanceRecord } from "@/lib/types";
import { getTodayIST, DATA_BACKEND } from "@/lib/config";
import {
  validateAttendanceSubmission,
  generateDeviceFingerprint,
  hashDeviceFingerprint,
  generateRecordHash,
  validateExifData,
} from "@/lib/attendance/validation";
import { createPrismaRepos } from "@/lib/repositories/prismaRepos";
import { prisma } from "@/lib/prisma";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers
      .get("cookie")
      ?.split("token=")[1]
      ?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      // Try to get from database first
      let user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
      });

      // If not found in database, create a mock user for Google Sheets backend
      if (!user && DATA_BACKEND === "sheets") {
        user = {
          id: 1, // Mock ID for Google Sheets
          name: (payload.name as string) || "Unknown User",
          email: payload.userId as string,
          employeeCode: (payload.employeeCode as string) || "EMP001",
          role: (payload.role as string) || "user",
          password: "", // Not needed for sheets
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          department: null,
          bio: null,
          phone: null,
          location: null,
          avatar: null,
          avatarThumbnail: null,
          avatarMedium: null,
          avatarLarge: null,
          avatarFileName: null,
          avatarFileSize: null,
          avatarMimeType: null,
          avatarUploadedAt: null,
          enableNotifications: true,
          notificationPreferences: null,
          preferences: null,
        } as {
          id: number;
          name: string;
          email: string;
          employeeCode: string;
          role: string;
          password: string;
          verified: boolean;
          createdAt: Date;
          updatedAt: Date;
          department: string | null;
          bio: string | null;
          phone: string | null;
          location: string | null;
          avatar: string | null;
          avatarThumbnail: string | null;
          avatarMedium: string | null;
          avatarLarge: string | null;
          avatarFileName: string | null;
          avatarFileSize: number | null;
          avatarMimeType: string | null;
          avatarUploadedAt: Date | null;
          enableNotifications: boolean;
          notificationPreferences: null;
          preferences: null;
        };
      }

      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/attendance - Get attendance records with Google Sheets integration
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");

    // Handle different backends
    if (DATA_BACKEND === "prisma") {
      const repos = createPrismaRepos();
      const isAdmin = user.role === "admin" || user.role === "SuperAdmin";

      if (date) {
        // Get records for a specific date
        if (isAdmin && !userId) {
          // Admin can see all records for the date
          const records = await repos.attendance.listForDate(date);

          // Normalize fields expected by client (submittedAt/reviewedAt)
          const transformed = records.map((r) => ({
            ...r,
            submittedAt: r.submittedAtUTC,
            reviewedAt: r.reviewedAtUTC,
          }));

          // Compute missing users (admin overview)
          const allUsers = await prisma.users.findMany({
            where: { role: { not: "admin" } },
            select: { id: true, name: true, email: true, employeeCode: true, role: true, location: true }
          });

          const submittedIds = new Set(transformed.map((a: any) => parseInt(a.userId)));
          const missingUsers = allUsers
            .filter(u => !submittedIds.has(u.id))
            .map(u => ({ id: u.id, name: u.name, email: u.email, employeeCode: u.employeeCode, role: u.role }));

          const summary = {
            totalUsers: await prisma.users.count(),
            submitted: transformed.length,
            approved: transformed.filter((a: any) => a.status === 'APPROVED').length,
            rejected: transformed.filter((a: any) => a.status === 'REJECTED').length,
            flagged: transformed.filter((a: any) => a.status === 'AUTO_FLAGGED').length,
            amended: transformed.filter((a: any) => a.status === 'AMENDED').length,
            missing: missingUsers.length,
          };

          return NextResponse.json({
            attendance: transformed,
            isAdminView: true,
            missingUsers,
            summary,
          });
        } else {
          const records = await repos.attendance.listForDate(date);
          const transformed = records.map((r) => ({
            ...r,
            submittedAt: r.submittedAtUTC,
            reviewedAt: r.reviewedAtUTC,
          }));
          return NextResponse.json({ attendance: transformed });
        }
      } else if (userId) {
        // Get records for a specific user
        const records = await repos.attendance.listByUser(userId);
        const transformed = records.map((r) => ({
          ...r,
          submittedAt: r.submittedAtUTC,
          reviewedAt: r.reviewedAtUTC,
        }));
        return NextResponse.json({ attendance: transformed });
      } else {
        // Get current user's records (or all for admin)
        const records = await repos.attendance.listByUser(user.id.toString());
        const transformed = records.map((r) => ({
          ...r,
          submittedAt: r.submittedAtUTC,
          reviewedAt: r.reviewedAtUTC,
        }));
        return NextResponse.json({ attendance: transformed });
      }
    } else {
      // Fallback to PostgreSQL
      const where: Record<string, unknown> = {};

      // Admin check - allow admins to see all attendance records
      const isAdmin = user.role === "admin" || user.role === "SuperAdmin";

      if (userId) {
        // Specific user requested
        where.userId = parseInt(userId);
      } else if (isAdmin) {
        // Admin can see all users' records
        // Don't add userId filter for admins
      } else {
        // Regular user can only see their own records
        where.userId = user.id;
      }

      if (date) {
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        where.date = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      const attendance = await prisma.attendances.findMany({
        where,
        include: {
          users_attendances_userIdTousers: {
            select: {
              name: true,
              email: true,
              employeeCode: true,
              role: true,
              location: true
            },
          },
        },
        orderBy: { date: "desc" },
      });

      // For admin date view, compute missing users summary as well
      let missingUsers: Array<{ id: number; name: string; email: string; employeeCode: string; role: string }> = [];
      if (isAdmin && !userId) {
        const allUsers = await prisma.users.findMany({
          select: { id: true, name: true, email: true, employeeCode: true, role: true, enableNotifications: true }
        });

        const submittedIds = new Set(attendance.map(a => a.userId));
        missingUsers = allUsers
          .filter(u => !submittedIds.has(u.id))
          .map(u => ({ id: u.id, name: u.name, email: u.email, employeeCode: u.employeeCode, role: u.role }));
      }

      // Compute summary counts for the day
      const summary = {
        totalUsers: isAdmin && !userId ? await prisma.users.count() : undefined,
        submitted: attendance.length,
        approved: attendance.filter(a => a.status === 'APPROVED').length,
        rejected: attendance.filter(a => a.status === 'REJECTED').length,
        flagged: attendance.filter(a => a.status === 'AUTO_FLAGGED').length,
        amended: attendance.filter(a => a.status === 'AMENDED').length,
        missing: missingUsers.length
      };

      return NextResponse.json({
        attendance,
        isAdminView: isAdmin && !userId, // Indicate if this is admin viewing all records
        missingUsers,
        summary
      });
    }
  } catch (error: unknown) {
    console.error("Error fetching attendance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch attendance records", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/attendance - Submit attendance with Google Sheets integration
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      visitReport,
      timelineUrl,
      timelineScreenshotUrl,
      selfieUrl,
      clientLat,
      clientLng,
      clientAccuracyM,
      deviceFingerprint,
      followUp,
    } = body;
    
    try{
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      const uploadUrl = new URL('/api/upload', baseUrl).toString();
      console.log("Uploading selfie to:", uploadUrl);
      const slefieUploadedUrl= await fetch(uploadUrl,{
        method:"POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({image:selfieUrl})
      })
      .then(res=>res.json())
      .then(data=>data.url);
      body.selfieUrl=slefieUploadedUrl;
      console.log("Selfie uploaded to:", slefieUploadedUrl);
    }catch(err){
      console.log("Error uploading selfie:", err);
      return NextResponse.json({ error: "Error uploading selfie" }, { status: 500 });
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      const uploadUrl = new URL('/api/upload', baseUrl).toString();
      const timelineScreenshotUploadedUrl = await fetch(
        uploadUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: timelineScreenshotUrl }),
        }
      )
        .then((res) => res.json())
        .then((data) => data.url);
      console.log(
        "Timeline screenshot uploaded to:",
        timelineScreenshotUploadedUrl
      );
      body.timelineScreenshotUrl = timelineScreenshotUploadedUrl;
    } catch (err) {
      console.log("Error uploading selfie:", err);
      return NextResponse.json(
        { error: "Error uploading timeline screenshot" },
        { status: 500 }
      );
    }

    // return NextResponse.json({ error: "Error to test" }, { status: 500 });

    // Prepare the attendance record
    const todayIST = getTodayIST();
    const submittedAtUTC = new Date().toISOString();

    const record: Partial<AttendanceRecord> = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id.toString(),
      dateIST: todayIST.toISOString().split("T")[0],
      submittedAtUTC: submittedAtUTC,
      note: visitReport,
      timelineUrl: timelineUrl,
      timelineScreenshotUrl: body.timelineScreenshotUrl,
      selfieUrl: body.selfieUrl,
      clientLat: clientLat ? parseFloat(clientLat) : undefined,
      clientLng: clientLng ? parseFloat(clientLng) : undefined,
      clientAccuracyM: clientAccuracyM
        ? parseFloat(clientAccuracyM)
        : undefined,
      // Enhanced geolocation data
      clientLocationInfo: body.clientLocationInfo,
      clientLocationMethod: body.clientLocationMethod,
      clientLocationWarnings: body.clientLocationWarnings,
      clientLocationTimestamp: body.clientLocationTimestamp,
      clientAltitude: body.clientAltitude,
      clientSpeed: body.clientSpeed,
      clientHeading: body.clientHeading,
      clientLocationAccuracyLevel: body.clientLocationAccuracyLevel,
      clientLocationProvider: body.clientLocationProvider,
      clientAddress: body.clientAddress,
      clientCity: body.clientCity,
      clientState: body.clientState,
      clientCountry: body.clientCountry,
      clientPostalCode: body.clientPostalCode,
      status: "SUBMITTED",
    };

    type NormalizedFollowUp =
      | {
          type: 'existing';
          id: number;
        }
      | {
          type: 'new';
          data: {
            followUpType: string;
            description: string;
            nextActionDate: string;
            priority: string;
            notes?: string;
            linkType?: string;
            leadId?: string;
            opportunityId?: string;
            projectId?: string;
            salesDealId?: string;
            immediateSaleId?: string;
          };
        };

    let normalizedFollowUp: NormalizedFollowUp | null = null;
    try {
      normalizedFollowUp = (() => {
        if (!followUp || typeof followUp !== 'object') {
          return null;
        }

        const payload = followUp as Record<string, unknown>;
        const modeValue = typeof payload.mode === 'string' ? payload.mode : 'new';

        if (modeValue === 'existing') {
          const candidate = payload.id ?? payload.followUpId;
          const parsedId = typeof candidate === 'string' ? parseInt(candidate, 10) : typeof candidate === 'number' ? candidate : NaN;
          if (!parsedId || Number.isNaN(parsedId)) {
            const error = new Error('Invalid follow-up selection');
            (error as any).code = 'FOLLOW_UP_ID_INVALID';
            throw error;
          }
          return { type: 'existing', id: parsedId };
        }

        const followUpType = (payload.followUpType || payload.actionType) as string | undefined;
        const description = (payload.description || payload.actionDescription) as string | undefined;
        const nextActionDate = (payload.nextActionDate || payload.followUpDate) as string | undefined;
        const rawPriority = (payload.priority || payload.urgencyLevel || 'MEDIUM') as string | undefined;

        if (!followUpType || !description || !nextActionDate) {
          const error = new Error('Follow-up details are incomplete');
          (error as any).code = 'FOLLOW_UP_DETAILS_INCOMPLETE';
          throw error;
        }

        const scheduledDate = new Date(nextActionDate);
        if (Number.isNaN(scheduledDate.getTime())) {
          const error = new Error('Follow-up date is invalid');
          (error as any).code = 'FOLLOW_UP_DATE_INVALID';
          throw error;
        }

        const allowedPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
        const resolvedPriority = rawPriority && typeof rawPriority === 'string'
          ? rawPriority.toUpperCase()
          : 'MEDIUM';
        const normalizedPriority = allowedPriorities.has(resolvedPriority) ? resolvedPriority : 'MEDIUM';

        return {
          type: 'new',
          data: {
            followUpType,
            description,
            nextActionDate,
            priority: normalizedPriority,
            notes: payload.notes as string | undefined,
            linkType: payload.linkType as string | undefined,
            leadId: payload.leadId as string | undefined,
            opportunityId: payload.opportunityId as string | undefined,
            projectId: payload.projectId as string | undefined,
            salesDealId: payload.salesDealId as string | undefined,
            immediateSaleId: payload.immediateSaleId as string | undefined,
          }
        };
      })();
    } catch (error) {
      const code = (error as any)?.code;
      if (code === 'FOLLOW_UP_ID_INVALID') {
        return NextResponse.json({ error: 'Please select a valid follow-up for today.' }, { status: 400 });
      }
      if (code === 'FOLLOW_UP_DETAILS_INCOMPLETE') {
        return NextResponse.json({ error: 'Follow-up details are incomplete.' }, { status: 400 });
      }
      if (code === 'FOLLOW_UP_DATE_INVALID') {
        return NextResponse.json({ error: 'Follow-up schedule is invalid.' }, { status: 400 });
      }
      throw error;
    }

    const isAdminUser = user.role === 'admin' || user.role === 'SuperAdmin';
    let validatedExistingFollowUp: any = null;
    if (normalizedFollowUp?.type === 'existing') {
      validatedExistingFollowUp = await prisma.daily_follow_ups.findUnique({
        where: { id: normalizedFollowUp.id }
      });

      if (!validatedExistingFollowUp || (!isAdminUser && validatedExistingFollowUp.createdById !== user.id)) {
        return NextResponse.json({ error: 'Selected follow-up not found or access denied.' }, { status: 403 });
      }

      const followUpDate = new Date(validatedExistingFollowUp.followUpDate);
      const startOfToday = new Date(todayIST);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(todayIST);
      endOfToday.setHours(23, 59, 59, 999);

      const createdDate = new Date(validatedExistingFollowUp.createdAt);
      if (createdDate < startOfToday || createdDate > endOfToday) {
        return NextResponse.json({ error: 'The selected follow-up is not scheduled for today.' }, { status: 400 });
      }
    }

    const appendAttendanceLinkNote = (existingNotes?: string | null) => {
      const timestamp = todayIST.toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      const linkNote = `Linked with attendance submission on ${timestamp}`;
      if (!existingNotes) {
        return linkNote;
      }
      return existingNotes.includes(linkNote) ? existingNotes : `${existingNotes}\n\n${linkNote}`;
    };

    const parseOptionalId = (value?: string | null) => {
      if (!value) {
        return null;
      }
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    // Generate device fingerprint if not provided
    const fingerprint = deviceFingerprint || generateDeviceFingerprint();
    const fingerprintHash = hashDeviceFingerprint(fingerprint);
    record.deviceFingerprint = fingerprintHash;

    // Validate the submission
    const validation = await validateAttendanceSubmission(record, fingerprint);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Server-side time validation - ensure submitted time is reasonable
    const submittedTime = new Date(record.submittedAtUTC!);
    const now = new Date();
    const timeDifferenceMs = Math.abs(now.getTime() - submittedTime.getTime());
    const maxAllowedTimeDifference = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (timeDifferenceMs > maxAllowedTimeDifference) {
      return NextResponse.json(
        {
          error: "Time validation failed",
          details: ["Submitted time is too far from server time"],
        },
        { status: 400 }
      );
    }

    // EXIF validation if available
    if (body.exifTakenAt) {
      const exifValid = validateExifData(
        {
          dateTimeOriginal: body.exifTakenAt,
        },
        new Date(record.submittedAtUTC!)
      );

      if (!exifValid) {
        validation.warnings?.push(
          "Photo EXIF timestamp suggests the photo may not have been taken today"
        );
      }
    }

    // Generate hash for tamper detection
    record.hash = generateRecordHash(record as AttendanceRecord);

    // Handle different backends
    if (DATA_BACKEND === "prisma") {
      const repos = createPrismaRepos();

      // Check for duplicate submission
      const existingRecord = await repos.attendance.findByUserDate(
        user.id.toString(),
        todayIST.toISOString().split("T")[0]
      );
      if (existingRecord) {
        return NextResponse.json(
          {
            error: "Attendance already submitted for today",
          },
          { status: 409 }
        );
      }

      // Save to Prisma
      await repos.attendance.upsert(record as AttendanceRecord);

      if (normalizedFollowUp?.type === 'new') {
        const followUpData = normalizedFollowUp.data;
        await prisma.daily_follow_ups.create({
          data: {
            assignedTo: user.name || user.email,
            actionType: followUpData.followUpType as any,
            actionDescription: followUpData.description,
            followUpDate: new Date(followUpData.nextActionDate),
            status: 'SCHEDULED',
            notes: followUpData.notes || null,
            createdById: user.id,
            updatedAt: new Date(),
            leadId: parseOptionalId(followUpData.leadId),
            opportunityId: parseOptionalId(followUpData.opportunityId),
            projectId: parseOptionalId(followUpData.projectId),
            salesDealId: parseOptionalId(followUpData.salesDealId),
            immediateSaleId: parseOptionalId(followUpData.immediateSaleId),
            urgencyLevel: (followUpData.priority || 'MEDIUM') as any,
          }
        });
      } else if (normalizedFollowUp?.type === 'existing' && validatedExistingFollowUp) {
        await prisma.daily_follow_ups.update({
          where: { id: validatedExistingFollowUp.id },
          data: {
            updatedAt: new Date(),
            notes: appendAttendanceLinkNote(validatedExistingFollowUp.notes),
          }
        });
      }

      return NextResponse.json(
        {
          success: true,
          attendance: record,
          validation: {
            warnings: validation.warnings,
            metadata: validation.metadata,
          },
        },
        { status: 201 }
      );
    } else {
      // Fallback to PostgreSQL with enhanced geolocation
      console.log('📍 Direct PostgreSQL create - location data:', {
        latitude: record.clientLat,
        longitude: record.clientLng,
        accuracy: record.clientAccuracyM,
        address: record.clientAddress,
        city: record.clientCity,
        country: record.clientCountry,
      });

      const result = await prisma.$transaction(async (tx) => {
        const attendance = await tx.attendances.create({
          data: {
            userId: user.id,
            date: new Date(todayIST),
            visitReport: record.note!,
            timelineUrl: record.timelineScreenshotUrl || null,
            photoUrl: record.selfieUrl || null,
            status: record.status as "SUBMITTED" | "APPROVED" | "REJECTED",
  
            // Enhanced geolocation fields
            latitude: record.clientLat || null,
            longitude: record.clientLng || null,
            accuracy: record.clientAccuracyM || null,
            altitude: record.clientAltitude || null,
            speed: record.clientSpeed || null,
            heading: record.clientHeading || null,
            locationTimestamp: record.clientLocationTimestamp ? new Date(record.clientLocationTimestamp) : null,
            locationSource: record.clientLocationMethod || null,
            locationAccuracyLevel: record.clientLocationAccuracyLevel || null,
            address: record.clientAddress || null,
            city: record.clientCity || null,
            state: record.clientState || null,
            country: record.clientCountry || null,
            postalCode: record.clientPostalCode || null,
            locationProvider: record.clientLocationProvider || null,
            isLocationValid: record.clientLocationInfo?.isValidLocation ?? true,
            locationValidationWarnings: record.clientLocationWarnings ? JSON.stringify(record.clientLocationWarnings) : null,
          },
          include: {
            users_attendances_userIdTousers: {
              select: { name: true, email: true, employeeCode: true },
            },
          },
        });

        if (normalizedFollowUp?.type === 'new') {
          const followUpData = normalizedFollowUp.data;
          await tx.daily_follow_ups.create({
            data: {
              assignedTo: user.name || user.email,
              actionType: followUpData.followUpType as any,
              actionDescription: followUpData.description,
              followUpDate: new Date(followUpData.nextActionDate),
              status: 'SCHEDULED',
              notes: followUpData.notes || null,
              createdById: user.id,
              updatedAt: new Date(),
              leadId: parseOptionalId(followUpData.leadId),
              opportunityId: parseOptionalId(followUpData.opportunityId),
              projectId: parseOptionalId(followUpData.projectId),
              salesDealId: parseOptionalId(followUpData.salesDealId),
              immediateSaleId: parseOptionalId(followUpData.immediateSaleId),
              urgencyLevel: (followUpData.priority || 'MEDIUM') as any,
            }
          });
        } else if (normalizedFollowUp?.type === 'existing' && validatedExistingFollowUp) {
          await tx.daily_follow_ups.update({
            where: { id: validatedExistingFollowUp.id },
            data: {
              updatedAt: new Date(),
              notes: appendAttendanceLinkNote(validatedExistingFollowUp.notes),
            }
          });
        }
        return attendance;
      });


      return NextResponse.json(
        {
          success: true,
          attendance: result,
          validation: {
            warnings: validation.warnings,
            metadata: validation.metadata,
          },
        },
        { status: 200 }
      );
    }
  } catch (error: unknown) {
    console.error("Error creating attendance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create attendance record", details: errorMessage },
      { status: 500 }
    );
  }
}
