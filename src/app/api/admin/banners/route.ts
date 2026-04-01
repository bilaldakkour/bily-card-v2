import { ApiError, fail, ok } from '@/core/http'
import { createHomeBanner, listHomeBanners, saveBannerUpload } from '@/features/home/banner.service'
import { requireAdmin } from '@/modules/security/guards'

export async function GET() {
  try {
    await requireAdmin()
    const banners = await listHomeBanners()
    return ok(banners)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const formData = await request.formData()
    const image = formData.get('image')
    const title = String(formData.get('title') ?? '').trim()

    if (!(image instanceof File)) {
      throw new ApiError(400, 'IMAGE_REQUIRED', 'Banner image is required')
    }

    const imageUrl = await saveBannerUpload(image)
    const banner = await createHomeBanner({
      title: title || image.name.replace(/\.[^.]+$/, ''),
      subtitle: String(formData.get('subtitle') ?? ''),
      imageUrl,
      linkUrl: String(formData.get('linkUrl') ?? ''),
      badge: String(formData.get('badge') ?? ''),
      isActive: String(formData.get('isActive') ?? 'true') !== 'false',
      sortOrder: Number(formData.get('sortOrder') ?? '1'),
    })

    return ok(banner, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}
