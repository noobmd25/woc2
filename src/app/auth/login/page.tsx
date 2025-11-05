"use client";

import { useAuthActions } from "@/app/hooks/useAuthActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type LoginFormData, loginSchema } from "@/lib/validations/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function HomeClient() {
  const router = useRouter();
  const { login, isLoading } = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fromLocalStorage = localStorage.getItem("openSignInModal") === "true";
      if (fromLocalStorage) {
        localStorage.removeItem("openSignInModal");
        toast.error("Please sign in below");
      }
    }
  }, []);

  const handleLoginSubmit = async (data: LoginFormData) => {
    const result = await login(data);

    if (result.success) {
      router.push("/oncall");
    }
    // Error handling is done in the hook
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Who's On Call
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your on-call schedules and directory with ease
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleLoginSubmit)}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...register("email")}
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    {...register("password")}
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>

            <div className="mt-6 text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account? Contact your admin.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/auth/request")}
                className="w-full"
              >
                Request Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}