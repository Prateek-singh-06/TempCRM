"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyPageContent() {
  const [form, setForm] = useState({
    otp: "",
  });
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...form, email:email}),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setMessage("Verification successful! You can now log in.");
      router.push(`/login`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Verify Email</CardTitle>
            <CardDescription>
              Enter the OTP sent to your email to complete signup.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 mb-10">
            
            <div className="grid gap-2 ">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                placeholder="123456"
                required
                value={form.otp}
                onChange={handleChange}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            {message && (
              <p className="text-green-600 text-sm">{message}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full mt-10" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
            <div className="mt-4 text-center text-sm">
              Already verified?{" "}
              <Link href="/login" className="underline">
                Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
