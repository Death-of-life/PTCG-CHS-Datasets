export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      code,
      message,
      details: details ?? null,
    },
    { status },
  );
}
