import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import nodemailer from 'nodemailer'

export async function GET(request: Request) {
  try {
    // 1. Busca os parâmetros de notificação salvos pela Diretoria no Firestore
    let lembrete1_dias = 1
    let lembrete2_horas = 3
    let notifAtiva = true

    const configRef = doc(db, 'configuracoes', 'notificacoes')
    const configSnap = await getDoc(configRef)

    if (configSnap.exists()) {
      const data = configSnap.data()
      if (data.ativo === false) {
        return NextResponse.json({ message: 'Notificações desativadas no painel.' })
      }
      lembrete1_dias = data.lembrete1_dias || 1
      lembrete2_horas = data.lembrete2_horas || 3
    }

    const lembrete1_horas = lembrete1_dias * 24

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ error: 'Credenciais de e-mail não encontradas.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    // 3. Busca escalas futuras a partir de hoje
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const escalasRef = collection(db, 'escalas')
    const q = query(escalasRef, where('data', '>=', todayStr))
    const snap = await getDocs(q)

    let emailsEnviados = 0

    for (const docSnap of snap.docs) {
      const escala = docSnap.data()
      if (!escala.data || !escala.hora) continue

      const dataHoraMissa = new Date(`${escala.data}T${escala.hora}:00`)
      const diffHoras = (dataHoraMissa.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Verifica se a missa está na janela de disparo dos lembretes (com tolerância de 1 hora)
      const ehLembrete1 = diffHoras >= (lembrete1_horas - 0.5) && diffHoras <= (lembrete1_horas + 0.5)
      const ehLembrete2 = diffHoras >= (lembrete2_horas - 0.5) && diffHoras <= (lembrete2_horas + 0.5)

      if (ehLembrete1 || ehLembrete2) {
        const acolitosLista = Array.isArray(escala.acolitos) ? escala.acolitos : []

        for (const ac of acolitosLista) {
          if (!ac.nome) continue

          // Busca dados do acólito no Firestore para pegar o e-mail
          const qAcolito = query(collection(db, 'acolitos'), where('ativo', '==', true))
          const snapAcolito = await getDocs(qAcolito)

          const pNome = ac.nome.trim().toLowerCase().split(' ')[0]
          
          let emailDestino = ''
          snapAcolito.forEach(uDoc => {
            const uData = uDoc.data()
            const uNome = (uData.nome || '').trim().toLowerCase()
            if (uNome.startsWith(pNome) && uData.email) {
              emailDestino = uData.email
            }
          })

          if (emailDestino) {
            const dataFmt = escala.data.split('-').reverse().join('/')
            const horaFmt = escala.hora.substring(0, 5)
            const tempoTexto = ehLembrete1 ? `${lembrete1_dias} dia(s)` : `${lembrete2_horas} hora(s)`

            const dataStr = escala.data.replace(/-/g, '')
            const [h, m] = escala.hora.split(':')
            const endH = (parseInt(h) + 1).toString().padStart(2, '0')
            const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Missa: ' + escala.local)}&dates=${dataStr}T${h}${m}00/${dataStr}T${endH}${m}00&details=${encodeURIComponent('Função: ' + (ac.funcao || 'Padrão'))}&location=${encodeURIComponent(escala.local)}`

            const htmlNotif = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 18px;">🔔 Lembrete de Missa</h2>
                </div>
                <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
                  <p>Olá, <b>${ac.nome.split(' ')[0]}</b>!</p>
                  <p>Sua missa acontecerá em aproximadamente <b>${tempoTexto}</b>.</p>
                  <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #16a34a; border-radius: 6px; margin: 16px 0;">
                    <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 16px; color: #0f172a;">${dataFmt} às ${horaFmt}</p>
                    <p style="margin: 0 0 10px 0; color: #475569;">📍 Local: <b>${escala.local}</b><br>👕 Função: <b>${ac.funcao || 'Padrão'}</b></p>
                    <a href="${gCalUrl}" target="_blank" style="background-color: #16a34a; color: #ffffff; padding: 8px 14px; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: bold; display: inline-block;">+ Salvar na Agenda</a>
                  </div>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 11px; color: #64748b;">Paróquia São José Operário</p>
                </div>
              </div>
            `

            await transporter.sendMail({
              from: `"Escalas - Paróquia SJO" <${process.env.EMAIL_USER}>`,
              to: emailDestino,
              subject: `🔔 Lembrete de Missa - ${dataFmt} às ${horaFmt}`,
              html: htmlNotif.replace(/\n/g, '').replace(/\s+/g, ' ')
            })

            emailsEnviados++
          }
        }
      }
    }

    return NextResponse.json({ success: true, lembretesDisparados: emailsEnviados })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}