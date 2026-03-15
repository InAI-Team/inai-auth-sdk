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
      type: (parsed?.type as string) ?? "UNKNOWN_ERROR",
      title: (parsed?.title as string) ?? message,
      status: status,
      detail: (parsed?.detail as string) ?? message,
      instance: (parsed?.instance as string) ?? undefined,
    };
    this.code = this.body.type;
  }
}
