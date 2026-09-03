"use client";

import { apiFetch, setToken } from "@/lib/apiClient";
import { AuthFormValues, authSchema } from "@/lib/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass = "text-forest-700 dark:text-forest-100 block text-sm font-medium";

const defaultValues: AuthFormValues = { username: "", password: "" };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues,
  });

  const onSubmit = async (data: AuthFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response =
        mode === "login"
          ? await apiFetch("/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(data).toString(),
            })
          : await apiFetch("/auth/register", {
              method: "POST",
              body: JSON.stringify(data),
            });

      if (mode === "register" && response.status === 403) {
        setSubmitError("This app is invite-only — that username isn't allowed.");
        return;
      }
      if (mode === "register" && response.status === 409) {
        setError("username", { message: "This username is already taken." });
        return;
      }
      if (mode === "login" && response.status === 401) {
        setSubmitError("Incorrect username or password.");
        return;
      }

      if (!response.ok) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }

      const body = await response.json();
      setToken(body.access_token);
      router.push("/");
    } catch (error) {
      console.error("Auth request failed:", error);
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-forest-50 dark:bg-forest-900 p-8">
      <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-md">
        <h1 className="text-forest-800 dark:text-forest-100 text-xl font-bold mb-1">
          Vademecum Germanicum
        </h1>
        <p className="text-forest-600 dark:text-forest-300 text-sm mb-6">
          {mode === "login" ? "Log in to your account." : "Create your account."}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelClass}>Username</label>
            <input {...register("username")} className={inputClass} autoFocus />
            {errors.username && (
              <p className="text-red-500 text-xs">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              {...register("password")}
              type="password"
              className={inputClass}
            />
            {errors.password && (
              <p className="text-red-500 text-xs">{errors.password.message}</p>
            )}
          </div>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {mode === "login" ? "Log In" : "Register"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setSubmitError(null);
          }}
          className="mt-4 text-sm text-forest-600 dark:text-forest-300 hover:text-forest-800 dark:hover:text-forest-100 transition-colors"
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}
