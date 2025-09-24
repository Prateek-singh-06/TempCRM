import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  console.log("Upload API called");

  try {
    // Check if it's multipart/form-data (file upload)
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      console.log("Handling file upload");

      const formData = await req.formData();
      const file = formData.get("file") as File;
      const type = formData.get("type") as string;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate file size (25MB limit - within Cloudinary free tier)
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "File size too large (max 25MB)" }, { status: 400 });
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const allowedExtensions = ['.pdf', '.xls', '.xlsx'];

      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

      if (!isValidType) {
        return NextResponse.json({
          error: "Invalid file type. Only PDF, XLS, and XLSX files are allowed"
        }, { status: 400 });
      }

      // Convert File to base64 for Cloudinary upload
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

      // Upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(base64String, {
        folder: type === 'quotation' ? "quotations" : "documents",
        resource_type: "raw",
        public_id: `${randomUUID()}-${file.name.replace(/\.[^/.]+$/, "")}`
      });

      return NextResponse.json({
        success: true,
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id
      });

    } else {
      // Handle JSON data (for images or other data)
      console.log("Handling JSON upload");
      const { image } = await req.json();

      if (!image) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
      }

      // Upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "user_uploads",
      });

      return NextResponse.json({
        success: true,
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id
      });
    }

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
