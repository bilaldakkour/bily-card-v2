import { fail, ok } from '@/core/http'
import { deleteAdminProduct, saveProductUpload, updateAdminProduct } from '@/features/admin/products.service'
import { requireAdmin } from '@/modules/security/guards'

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const contentType = request.headers.get('content-type') ?? ''
    let body: any

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const image = formData.get('image')

      body = {
        slug: String(formData.get('slug') ?? ''),
        name: String(formData.get('name') ?? ''),
        description: String(formData.get('description') ?? ''),
        thumbnail: String(formData.get('thumbnail') ?? '') || null,
        category: String(formData.get('category') ?? ''),
        kind: String(formData.get('kind') ?? 'package'),
        visible: String(formData.get('visible') ?? 'true') === 'true',
        hiddenFromCustomer: String(formData.get('hiddenFromCustomer') ?? 'false') === 'true',
        active: String(formData.get('active') ?? 'true') === 'true',
        forceOutOfStock: String(formData.get('forceOutOfStock') ?? 'false') === 'true',
        manualStock: formData.get('manualStock') ? Number(formData.get('manualStock')) : null,
        routingMode: String(formData.get('routingMode') ?? 'manual_only'),
        countConfig: {
          min: formData.get('countMin') ? Number(formData.get('countMin')) : null,
          max: formData.get('countMax') ? Number(formData.get('countMax')) : null,
          step: formData.get('countStep') ? Number(formData.get('countStep')) : null,
          manualUnitPrice: formData.get('countManualUnitPrice')
            ? Number(formData.get('countManualUnitPrice'))
            : null,
        },
      }

      if (image instanceof File && image.size > 0) {
        body.thumbnail = await saveProductUpload(image)
      }
    } else {
      body = await request.json()
    }

    const result = await updateAdminProduct(ctx.params.id, body)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const result = await deleteAdminProduct(ctx.params.id)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}
