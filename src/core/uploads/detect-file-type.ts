/** The first bytes every file of a type starts with (its "signature"). A renamed file keeps its real signature. */
const SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // "%PDF-"
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
];

/** How many first bytes are enough to read any signature above. */
export const SIGNATURE_LENGTH = Math.max(...SIGNATURES.map((s) => s.bytes.length));

/**
 * Reads a file's real type from its first bytes.
 * starts like a JPEG, PNG or PDF → its MIME type · anything else (or too short) → null
 */
export function detectFileType(head: Buffer): string | null {
  const match = SIGNATURES.find((signature) =>
    signature.bytes.every((byte, index) => head[index] === byte),
  );
  return match?.type ?? null;
}
