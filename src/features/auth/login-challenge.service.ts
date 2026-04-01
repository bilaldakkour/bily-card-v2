import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { ApiError } from '@/core/http'
import { env } from '@/core/env'
import { LoginChallengeModel } from '@/domain/models'
import { loginByEmail } from './service'
import { connectDb } from '@/modules/db/connection'

const LOGIN_CODE_TTL_MS = 1000 * 60 * 10

function hashCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex')
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

export async function requestLoginChallenge(input: { email: string; password: string }) {
  await connectDb()

  const user = await loginByEmail(input)

  await LoginChallengeModel.deleteMany({ userId: user.id, usedAt: null })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const challenge = await LoginChallengeModel.create({
    userId: user.id,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
  })

  const transporter = getTransporter()

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: user.email,
    subject: 'رمز تسجيل الدخول - Bily Card',
    text: `رمز تسجيل الدخول الخاص بك هو: ${code}\nصلاحية الرمز 10 دقائق.`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#111827">
        <h2 style="margin-bottom:8px">رمز تسجيل الدخول</h2>
        <p>استخدم الرمز التالي لإكمال تسجيل الدخول إلى حسابك:</p>
        <div style="display:inline-block;background:#0f172a;color:#22d3ee;padding:12px 18px;border-radius:12px;font-size:28px;font-weight:800;letter-spacing:6px">
          ${code}
        </div>
        <p style="margin-top:16px">صلاحية الرمز 10 دقائق.</p>
      </div>
    `,
  })

  return {
    challengeId: String(challenge._id),
    requiresVerification: true,
  }
}

export async function verifyLoginChallenge(input: { challengeId: string; code: string }) {
  await connectDb()

  const challenge = await LoginChallengeModel.findById(input.challengeId)
  if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) {
    throw new ApiError(400, 'INVALID_LOGIN_CODE', 'رمز التحقق غير صالح أو منتهي')
  }

  if (challenge.codeHash !== hashCode(input.code.trim())) {
    throw new ApiError(401, 'INVALID_LOGIN_CODE', 'رمز التحقق غير صحيح')
  }

  challenge.usedAt = new Date()
  await challenge.save()

  return { userId: String(challenge.userId) }
}
