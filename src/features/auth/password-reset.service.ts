import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { ApiError } from '@/core/http'
import { env } from '@/core/env'
import { PasswordResetTokenModel, UserModel } from '@/domain/models'
import { connectDb } from '@/modules/db/connection'
import { hashPassword } from '@/modules/security/password'
import { deleteDocuments, getDocumentByEmail, queryDocuments, writeDocument, getDocumentById } from '@/modules/supabase/documents'
import { isSupabaseProvider } from '@/modules/db/provider'

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30
const RESET_SUBJECT = '\u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 - Bily Card'
const RESET_TITLE = '\u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631'
const RESET_MESSAGE =
  '\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0627\u0644\u062a\u0627\u0644\u064a \u0644\u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u062d\u0633\u0627\u0628\u0643.'
const BUTTON_LABEL =
  '\u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631'
const FALLBACK_LINK_LABEL =
  '\u0625\u0630\u0627 \u0644\u0645 \u064a\u0639\u0645\u0644 \u0627\u0644\u0632\u0631\u060c \u0627\u0633\u062a\u062e\u062f\u0645 \u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637:'
const EXPIRY_NOTE =
  '\u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 30 \u062f\u0642\u064a\u0642\u0629 \u0641\u0642\u0637.'
const IGNORE_NOTE =
  '\u0625\u0630\u0627 \u0644\u0645 \u062a\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u060c \u062a\u062c\u0627\u0647\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.'
const FOOTER_NOTE =
  '\u0647\u0630\u0647 \u0631\u0633\u0627\u0644\u0629 \u0622\u0644\u064a\u0629 \u0645\u0646 Bily Card\u060c \u064a\u0631\u062c\u0649 \u0639\u062f\u0645 \u0627\u0644\u0631\u062f \u0639\u0644\u064a\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629.'
const INVALID_RESET_TOKEN_MESSAGE =
  '\u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0639\u064a\u064a\u0646 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d \u0623\u0648 \u0645\u0646\u062a\u0647\u064a'
const USER_NOT_FOUND_MESSAGE = '\u0627\u0644\u062d\u0633\u0627\u0628 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f'

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

function buildPasswordResetHtml(name: string, resetLink: string) {
  return `
    <div dir="rtl" lang="ar" style="margin:0;padding:32px 16px;background:#06111f;font-family:Arial,'Segoe UI',Tahoma,sans-serif;color:#e5eefb">
      <div style="max-width:580px;margin:0 auto;background:linear-gradient(180deg,#0b1728 0%,#091321 100%);border:1px solid #183049;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(2,8,23,0.45)">
        <div style="padding:28px 28px 18px;border-bottom:1px solid #16324a;background:rgba(8,23,38,0.92)">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#0f2236;border:1px solid #1c425f;color:#7dd3fc;font-size:12px;font-weight:700;letter-spacing:.4px">
            Bily Card
          </div>
          <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.35;color:#f8fbff;font-weight:800">${RESET_TITLE}</h1>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.9;color:#c8d6e8">\u0645\u0631\u062d\u0628\u064b\u0627 ${name}</p>
          <p style="margin:0;font-size:15px;line-height:1.9;color:#c8d6e8">${RESET_MESSAGE}</p>
        </div>

        <div style="padding:28px">
          <p style="margin:0 0 24px;text-align:center">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(180deg,#0891b2 0%,#0e7490 100%);color:#f8fbff;text-decoration:none;padding:14px 24px;border-radius:16px;font-weight:800;border:1px solid #22d3ee">
              ${BUTTON_LABEL}
            </a>
          </p>

          <div style="padding:16px 18px;border-radius:16px;background:#0a1625;border:1px solid #17314a">
            <p style="margin:0 0 10px;font-size:14px;line-height:1.9;color:#d7e4f4">${FALLBACK_LINK_LABEL}</p>
            <p style="margin:0 0 12px;word-break:break-all"><a href="${resetLink}" style="color:#67e8f9;text-decoration:none">${resetLink}</a></p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.9;color:#93a8c0">${EXPIRY_NOTE}</p>
            <p style="margin:0;font-size:13px;line-height:1.9;color:#93a8c0">${IGNORE_NOTE}</p>
          </div>
        </div>

        <div style="padding:16px 28px 24px;border-top:1px solid #14304a;background:#08111d;color:#6f88a3;font-size:12px;line-height:1.8">
          ${FOOTER_NOTE}
        </div>
      </div>
    </div>
  `
}

function buildPasswordResetText(name: string, resetLink: string) {
  return [
    'Bily Card',
    '',
    RESET_TITLE,
    '',
    `مرحبًا ${name}`,
    RESET_MESSAGE,
    '',
    resetLink,
    '',
    EXPIRY_NOTE,
    IGNORE_NOTE,
  ].join('\n')
}

async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  const transporter = getTransporter()

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: RESET_SUBJECT,
    text: buildPasswordResetText(name, resetLink),
    html: buildPasswordResetHtml(name, resetLink),
  })
}

export async function requestPasswordReset(email: string, request: Request) {
  if (isSupabaseProvider()) {
    const normalizedEmail = email.toLowerCase().trim()
    const user = await getDocumentByEmail('users', normalizedEmail)

    if (!user || user.payload?.isActive === false) {
      return { success: true }
    }

    await deleteDocuments('password_reset_tokens', { userId: user.id })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)

    await writeDocument({
      collection: 'password_reset_tokens',
      userId: user.id,
      status: 'pending',
      payload: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
        usedAt: null,
      },
    })

    const resetLink = buildResetLink(request, rawToken)
    await sendPasswordResetEmail(user.payload.email, user.payload.name, resetLink)

    return { success: true }
  }

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
  await sendPasswordResetEmail(user.email, user.name, resetLink)

  return { success: true }
}

export async function resetPasswordWithToken(input: { token: string; password: string }) {
  if (isSupabaseProvider()) {
    const tokenHash = hashToken(input.token)
    const resetRows = await queryDocuments('password_reset_tokens')
    const resetDoc = resetRows.find((row: any) => {
      const payload = row.payload as { tokenHash?: string; usedAt?: string | null; expiresAt?: string }
      return payload.tokenHash === tokenHash && !payload.usedAt && payload.expiresAt && new Date(payload.expiresAt) > new Date()
    })

    if (!resetDoc) {
      throw new ApiError(400, 'INVALID_RESET_TOKEN', INVALID_RESET_TOKEN_MESSAGE)
    }

    const user = await getDocumentById('users', String(resetDoc.payload.userId ?? resetDoc.user_id ?? ''))
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE)

    await writeDocument({
      id: user.id,
      collection: 'users',
      email: user.email,
      status: user.status,
      isActive: user.is_active,
      payload: {
        ...user.payload,
        passwordHash: await hashPassword(input.password),
      },
    })

    await writeDocument({
      id: resetDoc.id,
      collection: 'password_reset_tokens',
      userId: resetDoc.user_id,
      status: 'used',
      payload: {
        ...resetDoc.payload,
        usedAt: new Date().toISOString(),
      },
    })

    const siblings = await queryDocuments('password_reset_tokens', { userId: user.id })
    const otherIds = siblings.filter((row: any) => row.id !== resetDoc.id).map((row: any) => row.id)
    if (otherIds.length > 0) {
      await deleteDocuments('password_reset_tokens', { ids: otherIds })
    }

    return { success: true }
  }

  await connectDb()

  const tokenHash = hashToken(input.token)
  const resetDoc = await PasswordResetTokenModel.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })

  if (!resetDoc) {
    throw new ApiError(400, 'INVALID_RESET_TOKEN', INVALID_RESET_TOKEN_MESSAGE)
  }

  const user = await UserModel.findById(resetDoc.userId)
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE)
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
