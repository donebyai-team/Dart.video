export function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (typeof base !== "object" || base === null) {
    return patch as T;
  }

  if (typeof patch !== "object" || patch === null) {
    return base;
  }

  const result: any = { ...base };

  for (const key in patch) {
    const baseValue = (base as any)[key];
    const patchValue = (patch as any)[key];

    if (
      typeof baseValue === "object" &&
      baseValue !== null &&
      typeof patchValue === "object" &&
      patchValue !== null &&
      !Array.isArray(baseValue) &&
      !Array.isArray(patchValue)
    ) {
      result[key] = deepMerge(baseValue, patchValue);
    } else {
      result[key] = patchValue;
    }
  }

  return result;
}