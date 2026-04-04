import { fail, ok } from '@/core/http'
import { deleteHomeBanner, saveBannerUpload, updateHomeBanner } from '@/features/home/banner.service'
import { requireAdmin } from '@/modules/security/guards'

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    await requireAdmin()
    const contentType = request.headers.get('content-type') ?? ''
    let body: Record<string, unknown>

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const image = formData.get('image')

      body = {
        title: String(formData.get('title') ?? ''),
        subtitle: String(formData.get('subtitle') ?? ''),
        imageUrl: String(formData.get('imageUrl') ?? ''),
        removeImage: String(formData.get('removeImage') ?? 'false') === 'true',
        linkUrl: String(formData.get('linkUrl') ?? ''),
        badge: String(formData.get('badge') ?? ''),
        isActive: String(formData.get('isActive') ?? 'true') !== 'false',
        sortOrder: Number(formData.get('sortOrder') ?? '1'),
      }

      if (image instanceof File && image.size > 0) {
        body.imageUrl = await saveBannerUpload(image)
      }
    } else {
      body = await request.json()
    }

    const banner = await updateHomeBanner(context.params.id, body)
    return ok(banner)
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    await requireAdmin()
    const result = await deleteHomeBanner(context.params.id)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}
