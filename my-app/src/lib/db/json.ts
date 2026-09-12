import type { Schema } from "mongoose";

/**
 * Normalize serialized documents: expose `id`, drop `_id`/`__v`.
 * Applied by every model for consistent API shapes.
 */
export function applyJsonTransform(schema: Schema): void {
  schema.set("toJSON", {
    virtuals: false,
    versionKey: false,
    transform: (_doc, ret) => {
      const r = ret as unknown as Record<string, unknown>;
      r.id = r._id;
      delete r._id;
      return r;
    },
  });
}
