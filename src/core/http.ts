export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, init)
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status })
  }

  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
    { status: 500 }
  )
}

