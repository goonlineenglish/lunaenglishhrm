"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Vui lòng nhập email và mật khẩu");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    } catch {
      // redirect throws, which is expected on success
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
          L
        </div>
        <CardTitle className="text-2xl font-bold text-primary">
          Luna English CRM
        </CardTitle>
        <CardDescription>
          Đăng nhập để quản lý tuyển sinh
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@lunaenglish.edu.vn"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
