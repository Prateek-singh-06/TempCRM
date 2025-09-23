import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import db from "@/lib/sqlite";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = (formData.get("type") as string) || "documents";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Save file to /uploads
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads", type || "documents");

  try {
    // Ensure the directory exists
    await mkdir(uploadDir, { recursive: true });
  } catch (dirError) {
    console.error("Error creating upload directory:", dirError);
    return NextResponse.json({ error: "Failed to create upload directory" }, { status: 500 });
  }

  const filePath = path.join(uploadDir, file.name);

  try {
    await writeFile(filePath, buffer);
  } catch (writeError) {
    console.error("Error writing file:", writeError);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }

  // Create web-accessible URL
  const relativePath = uploadDir.split('public')[1];
  const webUrl = `/uploads${relativePath.substring(8)}/${file.name}`.replace(/\\/g, '/');

  console.log('Upload directory:', uploadDir);
  console.log('Relative path:', relativePath);
  console.log('Web URL:', webUrl);

  // Save metadata in SQLite
  const stmt = db.prepare(
    "INSERT INTO documents (name, path, url) VALUES (?, ?, ?)"
  );
  const result = stmt.run(file.name, filePath, webUrl);
  const documentId = result.lastInsertRowid;

  return NextResponse.json({
    success: true,
    url: webUrl,
    documentId: documentId,
  });
}
