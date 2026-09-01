import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { titulo, mensagem, emails } = await request.json()

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'Nenhum e-mail fornecido.' }, { status: 400 })
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("ERRO: As variáveis EMAIL_USER ou EMAIL_PASS não foram encontradas!")
        return NextResponse.json({ error: 'Erro no servidor: Credenciais não configuradas.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    const mailOptions = {
      from: `"Escalas - Paróquia SJO" <${process.env.EMAIL_USER}>`,
      to: emails,
      subject: titulo,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">${titulo}</h2>
          </div>
          <div style="padding: 30px; color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
            ${mensagem}
          </div>
          <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Sistema de Escalas • Paróquia São José Operário</p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, enviados: emails.length })
  } catch (error: any) {
    console.error('Erro no disparo de e-mail:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}