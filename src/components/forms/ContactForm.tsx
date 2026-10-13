"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  makeContactSchema,
  type ContactErrorMessages,
  type ContactFormData
} from "@/lib/schemas";

export type ContactFormLabels = {
  fields: { name: string; email: string; phone: string; message: string };
  errors: ContactErrorMessages;
  submit: string;
  submitting: string;
  successTitle: string;
  successText: string;
  errorTitle: string;
  errorText: string;
  newRequest: string;
};

export function ContactForm({ labels }: { labels: ContactFormLabels }) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormData>({
    resolver: zodResolver(makeContactSchema(labels.errors)),
    defaultValues: { name: "", email: "", phone: "", message: "" }
  });

  async function onSubmit(data: ContactFormData) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-surface/60 px-4 py-3 text-sm text-mist placeholder:text-moss/60 transition-colors focus:border-emerald/60 focus:outline-none";
  const labelCls = "mb-1.5 block text-sm font-medium text-mist/90";
  const errCls = "mt-1 flex items-center gap-1 text-xs text-red-400";

  if (status === "success") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-10 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-accent text-ink shadow-glow">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="mt-6 font-display text-2xl font-bold text-mist">{labels.successTitle}</h2>
        <p className="mx-auto mt-3 max-w-md text-moss">{labels.successText}</p>
        <button
          type="button"
          onClick={() => {
            reset();
            setStatus("idle");
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/40 px-6 py-3 font-display text-sm font-semibold text-mist transition-colors hover:border-emerald/50 hover:bg-emerald-soft"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {labels.newRequest}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="glass space-y-5 rounded-3xl p-6 sm:p-8">
      <div>
        <label htmlFor="c-name" className={labelCls}>
          {labels.fields.name} *
        </label>
        <input id="c-name" {...register("name")} className={inputCls} autoComplete="name" />
        {errors.name && (
          <p className={errCls}>
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-email" className={labelCls}>
            {labels.fields.email} *
          </label>
          <input id="c-email" type="email" {...register("email")} className={inputCls} autoComplete="email" />
          {errors.email && (
            <p className={errCls}>
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="c-phone" className={labelCls}>
            {labels.fields.phone}
          </label>
          <input id="c-phone" type="tel" {...register("phone")} className={inputCls} autoComplete="tel" />
        </div>
      </div>
      <div>
        <label htmlFor="c-message" className={labelCls}>
          {labels.fields.message} *
        </label>
        <textarea id="c-message" rows={5} {...register("message")} className={`${inputCls} resize-y`} />
        {errors.message && (
          <p className={errCls}>
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.message.message}
          </p>
        )}
      </div>

      <AnimatePresence>
        {status === "error" && (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>{labels.errorTitle}.</strong> {labels.errorText}
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-accent px-8 py-3.5 font-display text-base font-bold text-ink shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {labels.submitting}
          </>
        ) : (
          <>
            <Send className="h-5 w-5" aria-hidden="true" />
            {labels.submit}
          </>
        )}
      </button>
    </form>
  );
}
