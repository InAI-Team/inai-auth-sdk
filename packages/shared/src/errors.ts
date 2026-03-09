import type { InAIAuthErrorBody } from "@inai-dev/types";

export class InAIAuthError extends Error {
  status: number;
  body: InAIAuthErrorBody;
  code: string;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "InAIAuthError";
    this.status = status;
    const parsed = body as Record<string, unknown> | null;
    this.body = {
      code: (parsed?.code as string) ?? "UNKNOWN_ERROR",
      detail: (parsed?.detail as string) ?? message,
      field: (parsed?.field as string) ?? undefined,
    };
    this.code = this.body.code;
  }
}
