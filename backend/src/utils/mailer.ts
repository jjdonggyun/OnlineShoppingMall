import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 465),
  secure: String(process.env.MAIL_SECURE) === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

export async function sendMail(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
  })
}

export function buildVerifyEmailTemplate(verifyUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>이메일 인증을 완료해 주세요</h2>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;border:1px solid #333">
        이메일 인증하기
      </a></p>
      <p>문제가 있으면 아래 링크를 복사해 브라우저에 붙여넣으세요:</p>
      <p style="word-break:break-all">${verifyUrl}</p>
    </div>
  `
}
