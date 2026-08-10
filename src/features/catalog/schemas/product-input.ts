import {z} from 'zod';

import type {CatalogInputField} from '../types';

const localizedTextSchema = z.record(z.string(), z.string().min(1));

export const catalogInputFieldSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{1,47}$/),
    type: z.enum(['player_id', 'email', 'profile_url', 'quantity', 'notes', 'file_upload']),
    label: localizedTextSchema,
    help: localizedTextSchema.optional(),
    placeholder: localizedTextSchema.optional(),
    required: z.boolean().optional(),
    regex: z.string().max(300).optional(),
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().positive().optional(),
    step: z.number().int().positive().optional(),
    acceptedTypes: z.array(z.string().min(1)).max(20).optional()
  })
  .superRefine((field, context) => {
    if (field.min !== undefined && field.max !== undefined && field.max < field.min) {
      context.addIssue({code: 'custom', message: 'maximum_before_minimum', path: ['max']});
    }
    if (field.regex) {
      try {
        new RegExp(field.regex);
      } catch {
        context.addIssue({code: 'custom', message: 'invalid_regular_expression', path: ['regex']});
      }
    }
  });

export const catalogInputSchemaDefinition = z
  .array(catalogInputFieldSchema)
  .max(40)
  .superRefine((fields, context) => {
    const keys = new Set<string>();
    fields.forEach((field, index) => {
      if (keys.has(field.key)) {
        context.addIssue({code: 'custom', message: 'duplicate_field_key', path: [index, 'key']});
      }
      keys.add(field.key);
    });
  });

const optionalString = (schema: z.ZodString) => z.union([schema, z.literal('')]).optional();

function schemaForField(field: CatalogInputField): z.ZodType {
  if (field.type === 'quantity') {
    let schema = z.coerce.number({error: 'invalid_quantity'}).int('invalid_quantity');
    if (field.min !== undefined) schema = schema.min(field.min, 'quantity_too_small');
    if (field.max !== undefined) schema = schema.max(field.max, 'quantity_too_large');
    const stepped = schema.refine(
      (value) => field.step === undefined || (value - (field.min ?? 0)) % field.step === 0,
      {message: 'invalid_quantity_step'}
    );
    return field.required ? stepped : z.union([stepped, z.literal(''), z.undefined()]);
  }

  let schema = z.string().trim();
  if (field.type === 'email') schema = schema.email('invalid_email');
  if (field.type === 'profile_url') schema = schema.url('invalid_url');
  if (field.type === 'notes') {
    schema = schema.max(field.max ?? 2_000, 'text_too_long');
    if (field.min !== undefined) schema = schema.min(field.min, 'text_too_short');
  }
  if (field.type === 'file_upload') schema = schema.max(500, 'file_name_too_long');
  if (field.regex) {
    const expression = new RegExp(field.regex);
    schema = schema.regex(expression, 'invalid_format');
  }
  if (field.required) return schema.min(Math.max(1, field.min ?? 1), 'required');
  return optionalString(schema);
}

export function buildProductInputSchema(fields: CatalogInputField[]) {
  const parsed = catalogInputSchemaDefinition.parse(fields);
  return z.object(Object.fromEntries(parsed.map((field) => [field.key, schemaForField(field)])));
}

export type ProductInputValues = Record<string, string | number | undefined>;
