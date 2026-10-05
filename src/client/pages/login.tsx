import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "../../shared/schemas/auth";
import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to sign in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillRole = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    setErrorMessage(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">HR ERP Platform</h1>
          <p className="text-sm text-muted-foreground">Sign in to your organization account</p>
        </div>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your email and password to access the portal</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Demo Account Quick-Fill */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs border space-y-2">
                <div className="text-muted-foreground font-medium">Quick-login demo roles:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillRole("admin@hr-erp.local", "AdminPassword123!")}
                    className="rounded border bg-background px-2 py-1 text-left font-medium hover:bg-accent"
                  >
                    👑 ADMIN
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRole("hr@hr-erp.local", "HrPassword123!")}
                    className="rounded border bg-background px-2 py-1 text-left font-medium hover:bg-accent"
                  >
                    💼 HR
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRole("manager@hr-erp.local", "ManagerPassword123!")}
                    className="rounded border bg-background px-2 py-1 text-left font-medium hover:bg-accent"
                  >
                    👔 MANAGER
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRole("employee@hr-erp.local", "EmployeePassword123!")}
                    className="rounded border bg-background px-2 py-1 text-left font-medium hover:bg-accent"
                  >
                    👤 EMPLOYEE
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
