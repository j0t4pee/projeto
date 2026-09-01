import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import nodemailer from 'nodemailer'

export async function GET() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })

    // Calcula o horário atual no fuso do Brasil (UTC -3)
    const nowUtc = new Date()
    const nowBr = new Date(nowUtc.getTime() - (3 * 60 * 60 * 1000))

    // Calcula os alvos (Daqui 24h e Daqui 3h)
    const target24h = new Date(nowBr.getTime() + 24 * 60 * 60 * 1000)
    const target3h = new Date(nowBr.getTime() + 3 * 60 * 60 * 1000)

    const dateStr24h = target24h.toISOString().split('T')[0]
    const timeStr24h = target24h.toISOString().split('T')[1].substring(0, 5)

    const dateStr3h = target3h.toISOString().split('T')[0]
    const timeStr3h = target3h.toISOString().split('T')[1].substring(0, 5)

    // Busca missas e acólitos
    const [escalasSnap, acolitosSnap] = await Promise.all([
        getDocs(collection(db, 'escalas')),
        getDocs(collection(db, 'acolitos'))
    ])

    const escalas = escalasSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
    
    // Mapeia os e-mails (nome_completo -> email)
    const emailsMap = new Map<string, string>()
    acolitosSnap.docs.forEach(doc => {
        const d = doc.data()
        if (d.email) {
            emailsMap.set(`${d.nome} ${d.sobrenome || ''}`.trim(), d.email)
        }
    })

    let emailsEnviados = 0

    // Verifica as missas
    for (const escala of escalas) {
        const horaMissa = escala.hora?.substring(0, 5)
        let tipoAlerta = ''

        if (escala.data === dateStr24h && horaMissa === timeStr24h) tipoAlerta = '24H'
        else if (escala.data === dateStr3h && horaMissa === timeStr3h) tipoAlerta = '3H'

        if (tipoAlerta) {
            const acolitosEscalados = Array.isArray(escala.acolitos) ? escala.acolitos : []
            
            for (const ac of acolitosEscalados) {
                const emailAc = emailsMap.get(ac.nome)
                if (emailAc) {
                    const subject = tipoAlerta === '24H' ? '🔔 Lembrete: Você tem missa amanhã!' : '⚡ Atenção: Sua missa é daqui a 3 horas!'
                    const aviso = tipoAlerta === '24H' ? 'Este é um lembrete de que você está escalado para servir amanhã.' : 'Falta pouco! Prepare-se para a missa de hoje.'

                    const mailOptions = {
                        from: `"Escalas - Paróquia SJO" <${process.env.EMAIL_USER}>`,
                        to: emailAc,
                        subject: subject,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                                <div style="background-color: ${tipoAlerta === '24H' ? '#2563eb' : '#ea580c'}; padding: 20px; text-align: center;">
                                    <h2 style="color: #ffffff; margin: 0;">${subject}</h2>
                                </div>
                                <div style="padding: 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                                    <p>Olá, <b>${ac.nome.split(' ')[0]}</b>!</p>
                                    <p>${aviso}</p>
                                    <br/>
                                    <p><b>Local:</b> ${escala.local}</p>
                                    <p><b>Data:</b> ${escala.data.split('-').reverse().join('/')}</p>
                                    <p><b>Horário:</b> ${horaMissa}</p>
                                    <p><b>Função:</b> ${ac.funcao || 'Padrão'}</p>
                                </div>
                            </div>
                        `
                    }
                    await transporter.sendMail(mailOptions)
                    emailsEnviados++
                }
            }
        }
    }

    return NextResponse.json({ success: true, enviados: emailsEnviados })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}