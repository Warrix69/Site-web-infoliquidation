import { z } from "zod";

/** Clés des champs de quantités du formulaire de ramassage. */
export const QUANTITY_KEYS = [
  "towers",
  "servers",
  "laptops",
  "tablets",
  "switches",
  "lcd",
  "deskPhones",
  "cellphones",
  "printers",
  "photocopiers",
  "audioVideo",
  "ups"
] as const;

export type QuantityKey = (typeof QUANTITY_KEYS)[number];

// TODO: confirmer le minimum avec le client — le site actuel affiche
// « minimum 10 items » sur le formulaire mais « minimum 20 items » dans la FAQ.
// En attendant, la règle affichée et validée est 20 items.
export const MIN_ITEMS = 10;

export type PickupErrorMessages = {
  titleRequired: string;
  firstNameRequired: string;
  lastNameRequired: string;
  emailInvalid: string;
  phoneRequired: string;
  addressRequired: string;
  cityRequired: string;
  postalCodeInvalid: string;
  certificateRequired: string;
  minItems: string;
};

const CA_POSTAL_CODE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

export function makePickupSchema(m: PickupErrorMessages) {
  return z.object({
    title: z.enum(["mr", "mrs"], {
      required_error: m.titleRequired,
      invalid_type_error: m.titleRequired
    }),
    firstName: z.string().trim().min(1, m.firstNameRequired),
    lastName: z.string().trim().min(1, m.lastNameRequired),
    company: z.string().trim().optional().or(z.literal("")),
    email: z.string().trim().email(m.emailInvalid),
    phone: z.string().trim().min(7, m.phoneRequired),
    address: z.string().trim().min(1, m.addressRequired),
    city: z.string().trim().min(1, m.cityRequired),
    postalCode: z.string().trim().regex(CA_POSTAL_CODE, m.postalCodeInvalid),
    quantities: z.object(
      Object.fromEntries(
        QUANTITY_KEYS.map((key) => [key, z.number().int().min(0).max(9999)])
      ) as Record<QuantityKey, z.ZodNumber>
    ),
    extras: z
      .array(
        z.object({
          name: z.string().trim().max(100),
          quantity: z.number().int().min(0).max(9999)
        })
      )
      .max(20),
    certificate: z.enum(["yes", "no"], {
      required_error: m.certificateRequired,
      invalid_type_error: m.certificateRequired
    })
  });
}

export type PickupFormData = z.infer<ReturnType<typeof makePickupSchema>>;
export type PickupExtra = { name: string; quantity: number };

export function totalItems(
  quantities: Record<QuantityKey, number>,
  extras: PickupExtra[] = []
): number {
  const base = QUANTITY_KEYS.reduce((sum, key) => sum + (quantities[key] ?? 0), 0);
  const extra = extras.reduce((sum, e) => sum + (e?.quantity ?? 0), 0);
  return base + extra;
}

export type ContactErrorMessages = {
  nameRequired: string;
  emailInvalid: string;
  messageRequired: string;
};

export function makeContactSchema(m: ContactErrorMessages) {
  return z.object({
    name: z.string().trim().min(1, m.nameRequired),
    email: z.string().trim().email(m.emailInvalid),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    message: z.string().trim().min(1, m.messageRequired).max(5000)
  });
}

export type ContactFormData = z.infer<ReturnType<typeof makeContactSchema>>;

/** Messages par défaut (validation côté serveur). */
export const SERVER_PICKUP_MESSAGES: PickupErrorMessages = {
  titleRequired: "Titre requis",
  firstNameRequired: "Prénom requis",
  lastNameRequired: "Nom requis",
  emailInvalid: "Courriel invalide",
  phoneRequired: "Téléphone requis",
  addressRequired: "Adresse requise",
  cityRequired: "Ville requise",
  postalCodeInvalid: "Code postal invalide",
  certificateRequired: "Choix du certificat requis",
  minItems: "Minimum de 10 items requis"
};

export const SERVER_CONTACT_MESSAGES: ContactErrorMessages = {
  nameRequired: "Nom requis",
  emailInvalid: "Courriel invalide",
  messageRequired: "Message requis"
};
