import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { ApiError } from '@/core/http'
import { env } from '@/core/env'
import { PasswordResetTokenModel, UserModel } from '@/domain/models'
import { connectDb } from '@/modules/db/connection'
import { hashPassword } from '@/modules/security/password'

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function buildResetLink(request: Request, token: string) {
  const baseUrl = env.NEXTAUTH_URL ?? new URL(request.url).origin
  const url = new URL('/reset-password', baseUrl)
  url.searchParams.set('token', token)
  return url.toString()
}

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new ApiError(500, 'SMTP_NOT_CONFIGURED', 'SMTP is not configured')
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

export async function requestPasswordReset(email: string, request: Request) {
  await connectDb()

  const user = await UserModel.findOne({ email: email.toLowerCase().trim(), isActive: true }).select({ _id: 1, email: 1, name: 1 })

  if (!user) {
    return { success: true }
  }

  await PasswordResetTokenModel.deleteMany({ userId: user._id, usedAt: null })

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)

  await PasswordResetTokenModel.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  })

  const resetLink = buildResetLink(request, rawToken)
  const transporter = getTransporter()

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: user.email,
    subject: 'استرجاع كلمة المرور - Bily Card',
    text: `مرحبًا ${user.name}\n\nلاسترجاع كلمة المرور، افتح الرابط التالي:\n${resetLink}\n\nصلاحية الرابط 30 دقيقة.\nإذا لم تطلب هذا الإجراء، تجاهل هذه الرسالة.`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#111827">
        <h2 style="margin-bottom:8px">استرجاع كلمة المرور</h2>
        <p>مرحبًا ${user.name}</p>
        <p>اضغط على الزر التالي لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <p style="margin:24px 0">
          <a href="${resetLink}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700">
            إعادة تعيين كلمة المرور
          </a>
        </p>
        <p>إذا لم يعمل الزر، استخدم هذا الرابط:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>صلاحية الرابط 30 دقيقة فقط.</p>
      </div>
    `,
  })

  return { success: true }
}

export async function resetPasswordWithToken(input: { token: string; password: string }) {
  await connectDb()

  const tokenHash = hashToken(input.token)
  const resetDoc = await PasswordResetTokenModel.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })

  if (!resetDoc) {
    throw new ApiError(400, 'INVALID_RESET_TOKEN', 'رابط إعادة التعيين غير صالح أو منتهي')
  }

  const user = await UserModel.findById(resetDoc.userId)
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'الحساب غير موجود')
  }

  user.passwordHash = await hashPassword(input.password)
  await user.save()

  resetDoc.usedAt = new Date()
  await resetDoc.save()

  await PasswordResetTokenModel.deleteMany({
    userId: user._id,
    _id: { $ne: resetDoc._id },
  })

  return { success: true }
}
