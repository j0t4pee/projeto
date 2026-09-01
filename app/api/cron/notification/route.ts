import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const now = new Date();

    // 1. Calcula os intervalos de tempo (24h e 3h)
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const dateStr24h = in24h.toISOString().split('T')[0];
    const timeStr24h = in24h.toTimeString().substring(0, 5);

    const dateStr3h = in3h.toISOString().split('T')[0];
    const timeStr3h = in3h.toTimeString().substring(0, 5);

    // 2. Busca missas em 24h ou em 3h
    const escalasRef = collection(db, 'escalas');
    const snap = await getDocs(escalasRef);
    const escalas = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const notifyList: { token: string; title: string; body: string }[] = [];

    // Busca os tokens dos acólitos no banco
    const acolitosSnap = await getDocs(collection(db, 'acolitos'));
    const acolitosMap = new Map<string, string>();
    acolitosSnap.docs.forEach(doc => {
      const data = doc.data();
      const nomeCompleto = `${data.nome} ${data.sobrenome || ''}`.trim();
      if (data.fcm_token) {
        acolitosMap.set(nomeCompleto, data.fcm_token);
      }
    });

    for (const escala of escalas) {
      const horaMissa = escala.hora?.substring(0, 5);
      let motivo = '';

      if (escala.data === dateStr24h && horaMissa === timeStr24h) {
        motivo = '24h';
      } else if (escala.data === dateStr3h && horaMissa === timeStr3h) {
        motivo = '3h';
      }

      if (motivo) {
        const acolitosEscalados = Array.isArray(escala.acolitos) ? escala.acolitos : [];
        for (const ac of acolitosEscalados) {
          const token = acolitosMap.get(ac.nome);
          if (token) {
            notifyList.push({
              token,
              title: motivo === '24h' ? '🔔 Lembrete de Missa (Amanhã)' : '⚡ Missa Próxima (Daqui a 3h)',
              body: `Olá ${ac.nome.split(' ')[0]}, você está escalado para servir às ${horaMissa} no local ${escala.local}.`
            });
          }
        }
      }
    }

    // 3. Envia os alertas via Firebase FCM Admin (HTTP)
    for (const item of notifyList) {
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=SUA_FIREBASE_SERVER_KEY` // Chave do Servidor no Firebase
        },
        body: JSON.stringify({
          to: item.token,
          notification: {
            title: item.title,
            body: item.body,
            icon: '/logo.png'
          }
        })
      });
    }

    return NextResponse.json({ success: true, enviados: notifyList.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}