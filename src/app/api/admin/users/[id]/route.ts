import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { updateUserByAdmin } from '@/features/admin/users.service'

const schema = z
  .object({
    role: z.enum(['customer', 'admin']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => typeof value.role !== 'undefined' || typeof value.isActive !== 'undefined', {
    message: 'No updates provided',
  })

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    const body = schema.parse(await request.json())

    const data = await updateUserByAdmin({
      userId: ctx.params.id,
      adminId: admin.sub,
      role: body.role,
      isActive: body.isActive,
    })

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
