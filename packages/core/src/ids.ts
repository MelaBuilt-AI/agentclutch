const PREFIX_RANDOM_BYTES = 12;

export function createId(prefix: string): string {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.getRandomValues) {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(PREFIX_RANDOM_BYTES));
    const token = Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `${prefix}_${token}`;
  }

  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}
