import * as yup from "yup";

export const vehicleSchema = yup.object({
  durability: yup
    .number()
    .typeError("type")
    .required("required")
    .positive("more_then_zero"),

  weight: yup
    .number()
    .typeError("type")
    .required("required")
    .positive("more_then_zero"),

  tonnage: yup
    .number()
    .typeError("type")
    .required("required")
    .positive("more_then_zero")
    .min(yup.ref("weight"), "tonnage_less_then_weight"),

  parts: yup
    .number()
    .typeError("type")
    .required("required")
    .positive("more_than_zero"),

  maxParts: yup
    .number()
    .typeError("type")
    .required("required")
    .positive("more_then_zero")
    .min(yup.ref("parts"), "max_parts_less_than_parts"),

  powerScores: yup
    .number()
    .typeError("type")
    .required("required")
    .positive("more_then_zero"),

  maxPowerScores: yup
    .number()
    .typeError("type")
    .required("required")
    .test("is-valid-ps", "maxps_less_than_ps_or_not_zero", (value, context) => {
      if (value === 0) return true;
      const ps = context.parent.powerScores;
      return value > (ps || 0);
    }),

  minPartHp: yup
    .number()
    .typeError("type")
    .required("required")
    .min(0, "more_then_zero"),

  durabilityCabin: yup.boolean().default(false),

  coDriver: yup.boolean().default(false),
});

// Типизация на основе схемы
export type VehicleFormData = yup.InferType<typeof vehicleSchema>;
