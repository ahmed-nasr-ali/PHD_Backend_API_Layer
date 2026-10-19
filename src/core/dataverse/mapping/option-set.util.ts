/**
 * The enum member for a CRM option-set value, or `null` when the value is empty
 * or the enum doesn't know it (e.g. an option added in the CRM later).
 */
export const optionSetValue = <E extends Record<string, string | number>>(
  optionSet: E,
  value: number | null,
): E[keyof E] | null =>
  value !== null && Object.values(optionSet).includes(value)
    ? (value as E[keyof E])
    : null;
