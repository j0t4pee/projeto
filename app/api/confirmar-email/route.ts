import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { nome, email } = await request.json()

    if (!email || !nome) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
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
      to: email,
      subject: '🔔 Alertas de Escala Ativados!',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #16a34a; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Tudo Certo, ${nome}!</h2>
          </div>
          <div style="padding: 30px; color: #374151; font-size: 16px; line-height: 1.6; text-align: center;">
            <p>Seu e-mail foi cadastrado com sucesso no nosso sistema.</p>
            <p>A partir de agora, você receberá um lembrete automático <b>1 dia antes</b> e outro <b>3 horas antes</b> de cada missa que você estiver escalado(a).</p>
            <br/>
            <p style="font-size: 14px; color: #6b7280;">Deus abençoe o seu serviço ao altar!</p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}