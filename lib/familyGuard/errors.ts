export class FamilyGuardError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "FamilyGuardError";
  }
}

export function assertFamilyGuard(
  condition: unknown,
  message: string,
  status = 400,
  code = "invalid_request",
): asserts condition {
  if (!condition) throw new FamilyGuardError(message, status, code);
}
