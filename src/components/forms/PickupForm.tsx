"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, Loader2, Minus, Package, Plus, RotateCcw, Send, Shield, Trash2, User } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { Stepper } from "@/components/forms/Stepper";
import {
  makePickupSchema,
  MIN_ITEMS,
  QUANTITY_KEYS,
  totalItems,
  type PickupErrorMessages,
  type PickupFormData,
  type QuantityKey
} from "@/lib/schemas";

export type PickupFormLabels = {
  requiredNote: string;
  minItemsNote: string;
  identityTitle: string;
  quantitiesTitle: string;
  certificateTitle: string;
  fields: {
    title: string;
    titleOptions: { mr: string; mrs: string };
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    otherEquipment: string;
    otherEquipmentPlaceholder: string;
    extraNamePlaceholder: string;
    extraQuantityPlaceholder: string;
    extraAdd: string;
    extraRemove: string;
  };
  quantities: Record<QuantityKey, string>;
  decrease: string;
  increase: string;
  certificateQuestion: string;
  yes: string;
  no: string;
  submit: string;
  submitting: string;
  bottomNote: string;
  successTitle: string;
  successText: string;
  errorTitle: string;
  errorText: string;
  newRequest: string;
  errors: PickupErrorMessages;
  /** Gabarit contenant « {count} » (remplacé côté client). */
  totalItemsTemplate: string;
};

const DEFAULT_QUANTITIES = Object.fromEntries(
  QUANTITY_KEYS.map((key) => [key, 0])
) as Record<QuantityKey, number>;

export function PickupForm({ labels }: { labels: PickupFormLabels }) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [minError, setMinError] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Quand on bascule en succès, ramener le haut du bloc à l'écran
  // (sinon on reste scrollé en bas du formulaire, et l'utilisateur ne voit pas le message).
  useEffect(() => {
    if (status !== "success") return;
    const el = rootRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }, [status, reduce]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<PickupFormData>({
    resolver: zodResolver(makePickupSchema(labels.errors)),
    defaultValues: {
      title: undefined,
      firstName: "",
      lastName: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      quantities: DEFAULT_QUANTITIES,
      extras: [],
      certificate: undefined
    }
  });

  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({
    control,
    name: "extras"
  });

  const quantities = watch("quantities");
  const extras = useWatch({ control, name: "extras" }) ?? [];
  const total = totalItems(quantities ?? DEFAULT_QUANTITIES, extras);

  async function onSubmit(data: PickupFormData) {
    setMinError(false);
    try {
      const res = await fetch("/api/pickup", {
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
    "w-full rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm text-mist placeholder:text-moss/50 transition-all duration-200 focus:border-emerald/70 focus:bg-surface/80 focus:outline-none focus:ring-4 focus:ring-emerald/10";
  const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-moss";
  const errCls = "mt-1.5 flex items-center gap-1 text-xs text-red-400";
  const minItems = MIN_ITEMS;
  const progressPct = Math.min(100, Math.round((total / minItems) * 100));
  const reached = total >= minItems;

  if (status === "success") {
    return (
      <motion.div
        ref={rootRef}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass relative overflow-hidden rounded-3xl p-10 text-center sm:p-14"
        role="status"
        aria-live="polite"
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald/20 blur-3xl"
        />
        <motion.span
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 0.15 }}
          className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-accent text-ink shadow-glow-lg"
        >
          <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
        </motion.span>
        <h2 className="relative mt-7 font-display text-3xl font-bold text-mist sm:text-4xl">
          {labels.successTitle}
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-base leading-relaxed text-moss">
          {labels.successText}
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            setStatus("idle");
          }}
          className="relative mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/40 px-6 py-3 font-display text-sm font-semibold text-mist transition-colors hover:border-emerald/50 hover:bg-emerald-soft"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {labels.newRequest}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 pb-24 lg:pb-0">
      <p className="glass-light flex items-start gap-2.5 rounded-2xl p-4 text-sm text-moss">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
        {labels.requiredNote}
      </p>

      {/* ─── 01 · Identité ───────────────────────────────── */}
      <fieldset className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4 border-b border-line/60 pb-5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-soft">
            <User className="h-5 w-5 text-emerald" aria-hidden="true" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-accent font-display text-[10px] font-bold text-ink shadow-glow">
              1
            </span>
          </div>
          <div>
            <legend className="font-display text-xl font-bold text-mist">
              {labels.identityTitle}
            </legend>
            <p className="mt-0.5 text-xs text-moss">Prénom, nom, courriel et adresse de ramassage.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className={labelCls}>{labels.fields.title} *</span>
            <div className="flex gap-3">
              {(["mr", "mrs"] as const).map((opt) => (
                <label
                  key={opt}
                  className="glass-light inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-mist/90 transition-colors has-[:checked]:border-emerald/60 has-[:checked]:bg-emerald-soft has-[:checked]:text-emerald"
                >
                  <input type="radio" value={opt} {...register("title")} className="accent-emerald" />
                  {labels.fields.titleOptions[opt]}
                </label>
              ))}
            </div>
            {errors.title && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="firstName" className={labelCls}>
              {labels.fields.firstName} *
            </label>
            <input id="firstName" {...register("firstName")} className={inputCls} autoComplete="given-name" />
            {errors.firstName && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className={labelCls}>
              {labels.fields.lastName} *
            </label>
            <input id="lastName" {...register("lastName")} className={inputCls} autoComplete="family-name" />
            {errors.lastName && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.lastName.message}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="company" className={labelCls}>
              {labels.fields.company}
            </label>
            <input id="company" {...register("company")} className={inputCls} autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              {labels.fields.email} *
            </label>
            <input id="email" type="email" {...register("email")} className={inputCls} autoComplete="email" />
            {errors.email && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className={labelCls}>
              {labels.fields.phone} *
            </label>
            <input id="phone" type="tel" {...register("phone")} className={inputCls} autoComplete="tel" />
            {errors.phone && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.phone.message}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className={labelCls}>
              {labels.fields.address} *
            </label>
            <input id="address" {...register("address")} className={inputCls} autoComplete="street-address" />
            {errors.address && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.address.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="city" className={labelCls}>
              {labels.fields.city} *
            </label>
            <input id="city" {...register("city")} className={inputCls} autoComplete="address-level2" />
            {errors.city && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.city.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="postalCode" className={labelCls}>
              {labels.fields.postalCode} *
            </label>
            <input
              id="postalCode"
              {...register("postalCode")}
              className={inputCls}
              autoComplete="postal-code"
            />
            {errors.postalCode && (
              <p className={errCls}>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.postalCode.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* ─── 02 · Quantités ──────────────────────────────── */}
      <fieldset className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4 border-b border-line/60 pb-5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-soft">
            <Package className="h-5 w-5 text-emerald" aria-hidden="true" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-accent font-display text-[10px] font-bold text-ink shadow-glow">
              2
            </span>
          </div>
          <div className="flex-1">
            <legend className="font-display text-xl font-bold text-mist">
              {labels.quantitiesTitle}
            </legend>
            <p className="mt-0.5 text-xs text-moss">{labels.minItemsNote}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUANTITY_KEYS.map((key) => (
            <Controller
              key={key}
              name={`quantities.${key}`}
              control={control}
              render={({ field }) => (
                <Stepper
                  id={`qty-${key}`}
                  label={labels.quantities[key]}
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  decreaseLabel={labels.decrease}
                  increaseLabel={labels.increase}
                />
              )}
            />
          ))}
        </div>
        <div className="mt-7 rounded-2xl border border-dashed border-line/80 bg-surface/30 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-display text-sm font-semibold text-mist">
              {labels.fields.otherEquipment}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-moss">facultatif</span>
          </div>
          <div className="space-y-2.5">
            {extraFields.map((f, idx) => (
              <div key={f.id} className="flex items-stretch gap-2">
                <input
                  {...register(`extras.${idx}.name` as const)}
                  placeholder={labels.fields.extraNamePlaceholder}
                  className={`${inputCls} flex-1`}
                  aria-label={labels.fields.extraNamePlaceholder}
                />
                <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface/60 px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = getValues(`extras.${idx}.quantity`) ?? 0;
                      setValue(`extras.${idx}.quantity`, Math.max(0, cur - 1), { shouldDirty: true });
                    }}
                    aria-label={labels.decrease}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/70 transition-colors hover:bg-emerald-soft hover:text-emerald"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={9999}
                    {...register(`extras.${idx}.quantity` as const, {
                      valueAsNumber: true,
                      min: 0,
                      max: 9999
                    })}
                    placeholder={labels.fields.extraQuantityPlaceholder}
                    className="w-14 bg-transparent text-center text-sm font-semibold text-mist focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={labels.fields.extraQuantityPlaceholder}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = getValues(`extras.${idx}.quantity`) ?? 0;
                      setValue(`extras.${idx}.quantity`, Math.min(9999, cur + 1), { shouldDirty: true });
                    }}
                    aria-label={labels.increase}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/70 transition-colors hover:bg-emerald-soft hover:text-emerald"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtra(idx)}
                  aria-label={labels.fields.extraRemove}
                  className="flex h-auto w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface/40 text-moss transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendExtra({ name: "", quantity: 1 })}
              disabled={extraFields.length >= 20}
              className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald-soft px-5 py-2.5 text-sm font-semibold text-emerald transition-colors hover:border-emerald/60 hover:bg-emerald/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {labels.fields.extraAdd}
            </button>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald-soft to-surface/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-moss">
                Total d&apos;items
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5 font-display">
                <motion.span
                  key={total}
                  initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="text-3xl font-bold text-mist"
                >
                  {total}
                </motion.span>
                <span className="text-sm text-moss">/ min. {minItems}</span>
              </div>
            </div>
            {reached ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/15 px-3 py-1 text-xs font-semibold text-emerald">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Minimum atteint
              </span>
            ) : (
              <span className="text-xs text-moss">
                encore <span className="font-bold text-mist">{minItems - total}</span>
              </span>
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface/60">
            <motion.div
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 150 }}
              className="h-full rounded-full bg-gradient-accent"
            />
          </div>
        </div>
        {minError && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {labels.errors.minItems}
          </p>
        )}
      </fieldset>

      {/* ─── 03 · Certificat ─────────────────────────────── */}
      <fieldset className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4 border-b border-line/60 pb-5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-soft">
            <Shield className="h-5 w-5 text-emerald" aria-hidden="true" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-accent font-display text-[10px] font-bold text-ink shadow-glow">
              3
            </span>
          </div>
          <div>
            <legend className="font-display text-xl font-bold text-mist">
              {labels.certificateTitle}
            </legend>
            <p className="mt-0.5 text-xs text-moss">Preuve légale de destruction des données — gratuit.</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-mist/90">{labels.certificateQuestion} *</p>
        <div className="mt-4 flex gap-3">
          {(["yes", "no"] as const).map((opt) => (
            <label
              key={opt}
              className="group glass-light flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line px-6 py-3.5 text-sm font-semibold text-mist/90 transition-all duration-200 hover:border-emerald/40 has-[:checked]:border-emerald/70 has-[:checked]:bg-emerald-soft has-[:checked]:text-emerald has-[:checked]:shadow-glow"
            >
              <input
                type="radio"
                value={opt}
                {...register("certificate")}
                className="h-4 w-4 accent-emerald"
              />
              {opt === "yes" ? labels.yes : labels.no}
            </label>
          ))}
        </div>
        {errors.certificate && (
          <p className={errCls}>
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.certificate.message}
          </p>
        )}
      </fieldset>

      <p className="rounded-2xl bg-surface/40 px-5 py-4 text-sm leading-relaxed text-moss">
        {labels.bottomNote}
      </p>

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
        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-accent px-8 py-5 font-display text-base font-bold text-ink shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full"
        />
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {labels.submitting}
          </>
        ) : (
          <>
            <Send className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
            {labels.submit}
          </>
        )}
      </button>

      {/* Barre total sticky mobile */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 lg:hidden"
        aria-hidden="true"
      >
        <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-emerald/40 bg-ink/90 px-5 py-3 shadow-glow backdrop-blur-lg">
          <div className="flex items-baseline gap-1 font-display">
            <span className="text-xl font-bold text-mist">{total}</span>
            <span className="text-xs text-moss">/ {minItems}</span>
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface/60">
            <motion.div
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", damping: 20 }}
              className="h-full rounded-full bg-gradient-accent"
            />
          </div>
          {reached ? (
            <CheckCircle2 className="h-5 w-5 text-emerald" aria-hidden="true" />
          ) : (
            <span className="text-xs font-semibold text-moss">
              {minItems - total} à faire
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
