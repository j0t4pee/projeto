'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { 
    Lock, AtSign, ArrowRight, Download, X, FileText, 
    CheckCircle2, AlertCircle, UserCog, ChevronLeft, 
    BellRing, Info, AlertTriangle, Mail
} from 'lucide-react'

const PLACE_SIGLA: { [key: string]: string } = {
    "São José Operário": "SJO", "Capela Nsa. Sra. das Graças": "NSG",
    "Nsa. Sra. da Abadia": "NSA", "Santa Clara": "SC"
}
const ROLE_SIGLA: { [key: string]: string } = { 'Missal': 'M', 'Vela': 'V', 'Turíbulo': 'T', 'Naveta': 'N' }

interface CustomModalState {
    isOpen: boolean
    type: 'error' | 'success' | 'warning' | 'info'
    title: string
    message: string
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [showLoginForm, setShowLoginForm] = useState(false)

  // Modais
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  
  // PDF States
  const [pdfMonth, setPdfMonth] = useState(new Date().toISOString().slice(0, 7))
  const [currentMonthName, setCurrentMonthName] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState({ type: '', text: '' })

  // Email Cadastro States
  const [acolitosAtivos, setAcolitosAtivos] = useState<any[]>([])
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' })
  const [emailForm, setEmailForm] = useState({ acolitoId: '', email: '' })

  const [form, setForm] = useState({
    usuario: '',
    password: ''
  })

  const [modalState, setModalState] = useState<CustomModalState>({
      isOpen: false,
      type: 'info',
      title: '',
      message: ''
  })

  useEffect(() => {
      const date = new Date()
      const monthName = date.toLocaleString('pt-BR', { month: 'long' })
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
      setCurrentMonthName(capitalized)

      // Busca acólitos (APENAS OS QUE NÃO TÊM E-MAIL)
      const fetchAcolitos = async () => {
          try {
              const q = query(collection(db, 'acolitos'), where('ativo', '==', true))
              const snap = await getDocs(q)
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
              
              // Filtro mágico: Só passa quem NÃO tem o campo email preenchido
              const listSemEmail = list.filter(a => !a.email || a.email.trim() === '')
              listSemEmail.sort((a, b) => a.nome.localeCompare(b.nome))
              
              setAcolitosAtivos(listSemEmail)
          } catch (error) {
              console.error("Erro ao buscar acólitos:", error)
          }
      }
      fetchAcolitos()
  }, [])

  const triggerModal = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
      setModalState({ isOpen: true, title, message, type })
  }

  const closeModal = () => {
      setModalState(prev => ({ ...prev, isOpen: false }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (showLoginForm) handleLogin()
    }
  }

  const handleLogin = async () => {
    if (!form.usuario || !form.password) {
        setError('Preencha usuário e senha.')
        return
    }
    setLoading(true)
    setError('')

    try {
      const q = query(
          collection(db, 'acolitos'), 
          where("usuario", "==", form.usuario),
          where("senha", "==", form.password),
          where("ativo", "==", true)
      )
      
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('Usuário ou senha incorretos.')
      }

      const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any

      if (userData.perfil === 'padrao') {
          throw new Error('Acesso restrito à Diretoria.')
      }

      localStorage.setItem('auth_token', JSON.stringify(userData))
      window.location.href = '/'

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribeEmail = async () => {
    if (!emailForm.acolitoId || !emailForm.email) {
        setEmailMessage({ type: 'error', text: 'Selecione o nome e preencha o e-mail.' })
        return
    }
    
    setLoading(true)
    setEmailMessage({ type: '', text: '' })

    try {
        const acolitoSelecionado = acolitosAtivos.find(a => a.id === emailForm.acolitoId)
        if (!acolitoSelecionado) throw new Error('Acólito não encontrado.')

        // 1. Atualiza o e-mail no banco de dados
        await updateDoc(doc(db, 'acolitos', acolitoSelecionado.id), { 
            email: emailForm.email 
        })

        // 2. Busca as escalas futuras deste acólito
        const todayStr = new Date().toISOString().split('T')[0]
        const qEscalas = query(collection(db, 'escalas'), where("data", ">=", todayStr))
        const snapEscalas = await getDocs(qEscalas)
        
        const minhasEscalas: any[] = []
        const nomeBusca = acolitoSelecionado.nome.trim().toLowerCase()
        
        snapEscalas.forEach(docSnap => {
            const dataEscala = docSnap.data()
            const listaEscalados = Array.isArray(dataEscala.acolitos) ? dataEscala.acolitos : []
            
            const meuRegistro = listaEscalados.find((a: any) => {
                if (!a) return false
                if (a.id === acolitoSelecionado.id || a.acolitoId === acolitoSelecionado.id) return true
                const nomeEscala = (a.nome || '').trim().toLowerCase()
                return nomeEscala === nomeBusca || nomeBusca.includes(nomeEscala.replace('.', ''))
            })
            
            if (meuRegistro) {
                minhasEscalas.push({
                    data: dataEscala.data,
                    hora: dataEscala.hora,
                    local: dataEscala.local,
                    funcao: meuRegistro.funcao
                })
            }
        })

        minhasEscalas.sort((a, b) => new Date(`${a.data}T${a.hora||'00:00'}`).getTime() - new Date(`${b.data}T${b.hora||'00:00'}`).getTime())

        // 3. Monta o texto do E-mail (Layout Compacto)
        const primeiroNome = acolitoSelecionado.nome.split(' ')[0]
        
        let htmlEmail = `
            <div style="margin-bottom: 15px;">
                <p style="font-size: 15px; margin: 0 0 5px 0; color: #1f2937;">Olá, <b>${primeiroNome}</b>!</p>
                <p style="font-size: 13px; margin: 0; color: #475569;">Seu e-mail foi cadastrado para receber alertas de missas.</p>
            </div>
        `
        
        if (minhasEscalas.length > 0) {
            htmlEmail += `<h3 style="color: #1f2937; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-size: 14px; text-transform: uppercase;">📅 Suas Próximas Escalas (${minhasEscalas.length})</h3>`
            
            minhasEscalas.forEach(esc => {
                const dataFormatada = esc.data.split('-').reverse().join('/')
                const horaMissa = esc.hora?.substring(0,5)

                const dataStr = esc.data.replace(/-/g, '')
                const [h, m] = (esc.hora || '00:00').split(':')
                const startTime = `${dataStr}T${h}${m}00`
                const endHour = (parseInt(h) + 1).toString().padStart(2, '0')
                const endTime = `${dataStr}T${endHour}${m}00`

                const text = encodeURIComponent('Missa: ' + esc.local)
                const details = encodeURIComponent('Sua Função: ' + (esc.funcao || 'Padrão'))
                const location = encodeURIComponent(esc.local)
                const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startTime}/${endTime}&details=${details}&location=${location}`

                htmlEmail += `
                    <div style="margin-bottom: 8px; padding: 10px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 6px;">
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">
                            ${dataFormatada} às ${horaMissa}
                        </p>
                        <p style="margin: 0 0 8px 0; color: #475569; font-size: 13px;">
                            📍 ${esc.local} &nbsp;|&nbsp; 👕 Função: <b>${esc.funcao || 'Padrão'}</b>
                        </p>
                        <a href="${gCalUrl}" target="_blank" style="background-color: #16a34a; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">
                            + Salvar na Agenda
                        </a>
                    </div>
                `
            })
        } else {
            htmlEmail += `<p style="margin: 10px 0; font-size: 13px; color: #475569;">Você não possui escalas futuras agendadas.</p>`
        }
        
        htmlEmail += `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 11px; color: #64748b; margin: 0;">Você será avisado 24h e 3h antes de cada missa.</p>
            </div>
        `

        const emailBodyLimpo = htmlEmail.replace(/\n/g, '').replace(/\s+/g, ' ')

        // 4. Dispara o e-mail
        const res = await fetch('/api/enviar-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                titulo: 'Sua Lista de Escalas', 
                mensagem: emailBodyLimpo,
                emails: [emailForm.email] 
            })
        })

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || "Falha ao enviar e-mail. Verifique as credenciais no servidor.")
        }

        // Remove o acólito da lista na mesma hora (para ele sumir do seletor)
        setAcolitosAtivos(prev => prev.filter(a => a.id !== emailForm.acolitoId))

        setEmailMessage({ type: 'success', text: `Enviado! ${minhasEscalas.length} escalas foram pro seu e-mail.` })
        setTimeout(() => { 
            setIsEmailModalOpen(false)
            setEmailMessage({ type: '', text: '' })
            setEmailForm({ acolitoId: '', email: '' }) 
        }, 4000)

    } catch (err: any) {
        setEmailMessage({ type: 'error', text: err.message })
    } finally { 
        setLoading(false) 
    }
  }

  const handlePublicDownload = async () => {
      setIsDownloading(true)
      setDownloadMessage({ type: '', text: '' })

      try {
          const [year, month] = pdfMonth.split('-').map(Number)
          const startDate = `${pdfMonth}-01`
          const endDate = `${pdfMonth}-${new Date(year, month, 0).getDate()}`

          const escalasRef = collection(db, 'escalas')
          const q = query(
              escalasRef, 
              where("data", ">=", startDate), 
              where("data", "<=", endDate)
          )
          
          const snap = await getDocs(q)
          const rawEvents = snap.docs.map(d => ({id: d.id, ...d.data()}) as any)
          
          rawEvents.sort((a, b) => new Date(a.data + 'T' + (a.hora || '00:00')).getTime() - new Date(b.data + 'T' + (b.hora || '00:00')).getTime())

          if (rawEvents.length === 0) {
              setDownloadMessage({ type: 'error', text: 'Nenhuma escala encontrada para este mês.' })
              return
          }

          const jsPDF = (await import('jspdf')).default
          const doc = new jsPDF('p', 'mm', 'a4')

          const refDate = new Date(parseInt(pdfMonth.split('-')[0]), parseInt(pdfMonth.split('-')[1]) - 1, 1)
          const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()
          const yearStr = refDate.getFullYear()

          doc.setFont("helvetica", "bold")
          doc.setFontSize(14)
          doc.text("ESCALA DOS ACÓLITOS – " + monthName + "/" + yearStr, 105, 15, { align: "center" })

          const startX = 10; const startY = 25; const boxWidth = 47.5; const boxHeight = 24; const gap = 0; const columns = 4
          let cursorX = startX; let cursorY = startY; doc.setFontSize(8)

          rawEvents.forEach((evt: any, index: number) => {
              if (index > 0 && index % columns === 0) { cursorX = startX; cursorY += boxHeight + gap }
              if (cursorY + boxHeight > 280) { doc.addPage(); cursorY = 20 }

              const d = new Date(evt.data + 'T12:00:00')
              const day = d.getDate()
              const weekDayRaw = d.toLocaleDateString('pt-BR', { weekday: 'long' })
              const weekDay = weekDayRaw.charAt(0).toUpperCase() + weekDayRaw.slice(1)
              const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              const timeFormatted = evt.hora ? evt.hora.substring(0, 5) : ''
              const placeSigla = PLACE_SIGLA[evt.local] || '???'

              let isSpecial = false
              if (day === 19 && placeSigla === 'SJO') isSpecial = true
              if (day === 15 && placeSigla === 'NSA') isSpecial = true

              if (isSpecial) doc.setFillColor(220, 230, 255); else doc.setFillColor(240, 240, 240)
              doc.rect(cursorX, cursorY, boxWidth, 6, 'F'); doc.setDrawColor(0); doc.rect(cursorX, cursorY, boxWidth, boxHeight)

              doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(0, 0, 0)
              doc.text(`${weekDay}, ${timeFormatted} - ${placeSigla}`, cursorX + (boxWidth / 2), cursorY + 4, { align: 'center' })
              doc.text(dayMonth, cursorX + boxWidth - 2, cursorY + 4, { align: 'right' })

              doc.setFont("helvetica", "normal"); let listY = cursorY + 10
              const acolitosList = Array.isArray(evt.acolitos) ? evt.acolitos : []
              
              acolitosList.forEach((ac: any) => {
                  const siglaFuncao = ROLE_SIGLA[ac.funcao] || (ac.funcao ? ac.funcao.substring(0,1) : 'A')
                  doc.setFillColor(50, 50, 50); doc.roundedRect(cursorX + 2, listY - 3, 6, 4, 1, 1, 'F')
                  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold")
                  doc.text(siglaFuncao, cursorX + 5, listY, { align: 'center' })
                  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal")
                  doc.text(ac.nome || '', cursorX + 12, listY); listY += 3.5
              })

              if (evt.observacao && evt.observacao.includes('Votiva')) doc.setTextColor(0)
              cursorX += boxWidth + gap
          })

          doc.save(`escala_${monthName}_${yearStr}.pdf`)
          setDownloadMessage({ type: 'success', text: 'PDF gerado com sucesso!' })
          setTimeout(() => { setIsPdfModalOpen(false); setDownloadMessage({ type: '', text: '' }) }, 2000)

      } catch (err: any) {
          console.error(err)
          setDownloadMessage({ type: 'error', text: 'Erro ao gerar PDF.' })
      } finally { setIsDownloading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-sans p-4" onKeyDown={handleKeyDown}>
      
      {modalState.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      modalState.type === 'error' ? 'bg-red-50 text-red-500' : 
                      modalState.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                      modalState.type === 'warning' ? 'bg-amber-50 text-amber-500' : 
                      'bg-blue-50 text-blue-500'
                  }`}>
                      {modalState.type === 'error' && <AlertCircle size={28}/>}
                      {modalState.type === 'success' && <CheckCircle2 size={28}/>}
                      {modalState.type === 'warning' && <AlertTriangle size={28}/>}
                      {modalState.type === 'info' && <Info size={28}/>}
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{modalState.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{modalState.message}</p>
                  </div>
                  <div className="pt-2">
                      <button onClick={closeModal} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition active:scale-95">Entendi</button>
                  </div>
              </div>
          </div>
      )}

      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><FileText className="text-blue-600" size={20}/> Baixar Escala</h3>
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Selecione o Mês</label>
                        <input type="month" value={pdfMonth} onChange={e => setPdfMonth(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-blue-600 transition" />
                    </div>
                    {downloadMessage.text && (
                        <div className={`text-xs p-3 rounded-lg flex items-center gap-2 ${downloadMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                            {downloadMessage.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>} {downloadMessage.text}
                        </div>
                    )}
                    <button onClick={handlePublicDownload} disabled={isDownloading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                        {isDownloading ? <span className="animate-pulse">Gerando...</span> : <><Download size={18}/> Baixar Arquivo PDF</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setIsEmailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                <div className="mb-6 text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100"><Mail size={24}/></div>
                    <h3 className="text-lg font-bold text-gray-900">Suas Escalas</h3>
                    <p className="text-xs text-gray-500 mt-1">Cadastre-se para receber sua escala na hora e ser lembrado antes das missas.</p>
                </div>
                
                <div className="space-y-4">
                    {emailMessage.text && (
                        <div className={`text-xs p-3 rounded-lg flex items-center gap-2 ${emailMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                            {emailMessage.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>} {emailMessage.text}
                        </div>
                    )}
                    
                    {acolitosAtivos.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-center text-sm font-medium">
                            Todos os acólitos ativos já cadastraram o e-mail!
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Selecione seu Nome</label>
                                <select 
                                    value={emailForm.acolitoId} 
                                    onChange={e => setEmailForm({...emailForm, acolitoId: e.target.value})} 
                                    className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 outline-none transition text-gray-900 text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {acolitosAtivos.map(ac => (
                                        <option key={ac.id} value={ac.id}>{ac.nome} {ac.sobrenome}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Seu Melhor E-mail</label>
                                <input 
                                    type="email" 
                                    placeholder="exemplo@gmail.com" 
                                    value={emailForm.email} 
                                    onChange={e => setEmailForm({...emailForm, email: e.target.value})} 
                                    className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 outline-none transition text-gray-900 text-sm" 
                                />
                            </div>

                            <button 
                                onClick={handleSubscribeEmail} 
                                disabled={loading} 
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                {loading ? <span className="animate-pulse">Buscando Escalas...</span> : 'Cadastrar e Receber Escalas'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[2rem] border border-gray-200 shadow-2xl overflow-hidden relative transition-all duration-300">
        <div className="bg-gray-50 p-8 text-center border-b border-gray-200 relative">
          {showLoginForm && (
              <button 
                onClick={() => { setShowLoginForm(false); setError('') }} 
                className="absolute top-6 left-6 p-2 bg-white rounded-full text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition shadow-sm"
              >
                  <ChevronLeft size={20} />
              </button>
          )}
          
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/40 transition-transform hover:scale-105">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Paróquia São José Operário</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Acesso ao Sistema de Escalas</p>
        </div>

        <div className="p-8">
            {!showLoginForm ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <button 
                            onClick={() => setIsPdfModalOpen(true)}
                            className="group w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-between"
                        >
                            <div className="text-left"><span className="block text-lg font-bold">Baixar Escala de {currentMonthName}</span></div>
                            <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition"><Download size={24} /></div>
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsEmailModalOpen(true)}
                        className="w-full bg-green-50 border border-green-200 hover:border-green-300 hover:bg-green-100 text-green-700 p-4 rounded-xl transition flex items-center justify-center gap-3 group shadow-sm"
                    >
                        <BellRing size={20} className="group-hover:animate-bounce" />
                        <span className="font-bold">Cadastrar Alertas e Ver Escalas</span>
                    </button>

                    <div className="relative py-5">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest"><span className="bg-white px-4 text-gray-400">Diretoria</span></div>
                    </div>

                    <button 
                        onClick={() => setShowLoginForm(true)}
                        className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 p-4 rounded-xl transition flex items-center justify-center gap-3 group shadow-sm"
                    >
                        <UserCog size={20} className="text-gray-400 group-hover:text-blue-600 transition"/>
                        <span className="font-bold">Acesso Administrativo</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-pulse flex items-center gap-2 justify-center">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuário</label>
                        <div className="relative">
                            <input 
                                type="text" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})}
                                className="w-full p-4 pl-12 rounded-xl bg-white border border-gray-300 focus:border-blue-600 outline-none transition text-gray-900 font-medium lowercase"
                                placeholder="ex: joao.silva" autoFocus
                            />
                            <AtSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                                className="w-full p-4 pl-12 rounded-xl bg-white border border-gray-300 focus:border-blue-600 outline-none transition text-gray-900 font-medium"
                                placeholder="••••••••"
                            />
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <button 
                        onClick={handleLogin} disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 mt-4 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Verificando...' : 'Entrar no Painel'}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}