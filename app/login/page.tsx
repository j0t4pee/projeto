'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { 
    Lock, AtSign, ArrowRight, Download, X, FileText, 
    CheckCircle2, AlertCircle, UserCog, ChevronLeft, 
    BellRing, Info, AlertTriangle, Mail, UserCircle
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

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  
  const [pdfMonth, setPdfMonth] = useState(new Date().toISOString().slice(0, 7))
  const [currentMonthName, setCurrentMonthName] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState({ type: '', text: '' })

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

      const fetchAcolitos = async () => {
          try {
              const q = query(collection(db, 'acolitos'), where('ativo', '==', true))
              const snap = await getDocs(q)
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
              
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

        await updateDoc(doc(db, 'acolitos', acolitoSelecionado.id), { 
            email: emailForm.email 
        })

        const todayStr = new Date().toISOString().split('T')[0]
        const qEscalas = query(collection(db, 'escalas'), where("data", ">=", todayStr))
        const snapEscalas = await getDocs(qEscalas)
        
        const minhasEscalas: any[] = []
        
        const normalizeStr = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ')
        const nomeCompleto = normalizeStr(`${acolitoSelecionado.nome || ''} ${acolitoSelecionado.sobrenome || ''}`)
        
        snapEscalas.forEach(docSnap => {
            const dataEscala = docSnap.data()
            const listaEscalados = Array.isArray(dataEscala.acolitos) ? dataEscala.acolitos : []
            
            const meuRegistro = listaEscalados.find((a: any) => {
                if (!a) return false
                if (a.id === acolitoSelecionado.id || a.acolitoId === acolitoSelecionado.id) return true
                
                const nomeEscala = normalizeStr(a.nome || '')
                return nomeEscala === nomeCompleto 
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

        const primeiroNome = acolitoSelecionado.nome.split(' ')[0]
        
        let htmlEmail = `
            <div style="margin-bottom: 15px; font-family: Arial, sans-serif;">
                <p style="font-size: 15px; margin: 0 0 5px 0; color: #1f2937;">Olá, <b>${primeiroNome}</b>!</p>
                <p style="font-size: 13px; margin: 0; color: #475569;">Seu e-mail foi cadastrado para receber alertas de missas.</p>
            </div>
        `
        
        if (minhasEscalas.length > 0) {
            htmlEmail += `<h3 style="color: #1f2937; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-size: 13px; text-transform: uppercase; font-family: Arial, sans-serif;">Suas Próximas Escalas (${minhasEscalas.length})</h3>`
            
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
                    <div style="margin-bottom: 8px; padding: 10px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #2563eb; border-radius: 6px; font-family: Arial, sans-serif;">
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">
                            ${dataFormatada} às ${horaMissa}
                        </p>
                        <p style="margin: 0 0 8px 0; color: #475569; font-size: 12px;">
                            <b>Local:</b> ${esc.local} &nbsp;|&nbsp; <b>Função:</b> ${esc.funcao || 'Padrão'}
                        </p>
                        <a href="${gCalUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">
                            Adicionar ao Calendário
                        </a>
                    </div>
                `
            })
        } else {
            htmlEmail += `<p style="margin: 10px 0; font-size: 13px; color: #475569; font-family: Arial, sans-serif;">Você não possui escalas futuras agendadas.</p>`
        }
        
        htmlEmail += `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-family: Arial, sans-serif;">
                <p style="font-size: 11px; color: #64748b; margin: 0;">Você será avisado automaticamente pelo sistema de escalas da Paróquia.</p>
            </div>
        `

        const emailBodyLimpo = htmlEmail.replace(/\n/g, '').replace(/\s+/g, ' ')

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
            throw new Error(errorData.error || "Falha ao enviar e-mail.")
        }

        setAcolitosAtivos(prev => prev.filter(a => a.id !== emailForm.acolitoId))

        setEmailMessage({ type: 'success', text: `Enviado! ${minhasEscalas.length} escala(s) no seu e-mail.` })
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-slate-800 font-sans p-4" onKeyDown={handleKeyDown}>
      
      {modalState.isOpen && (
          <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 w-full max-w-sm shadow-xl text-center space-y-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                      modalState.type === 'error' ? 'bg-red-50 text-red-500' : 
                      modalState.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                      modalState.type === 'warning' ? 'bg-amber-50 text-amber-500' : 
                      'bg-blue-50 text-blue-500'
                  }`}>
                      {modalState.type === 'error' && <AlertCircle size={24}/>}
                      {modalState.type === 'success' && <CheckCircle2 size={24}/>}
                      {modalState.type === 'warning' && <AlertTriangle size={24}/>}
                      {modalState.type === 'info' && <Info size={24}/>}
                  </div>
                  <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">{modalState.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{modalState.message}</p>
                  </div>
                  <div className="pt-2">
                      <button onClick={closeModal} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl border border-gray-200 transition active:scale-95 text-sm">
                          Compreendido
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
                <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={18}/></button>
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText className="text-blue-600" size={18}/> Baixar Escala Mensal</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 font-semibold uppercase block mb-1">Mês de Referência</label>
                        <input 
                            type="month" 
                            value={pdfMonth} 
                            onChange={e => setPdfMonth(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-2.5 text-sm text-gray-900 outline-none transition" 
                        />
                    </div>
                    {downloadMessage.text && (
                        <div className={`text-xs p-3 rounded-xl flex items-center gap-2 border ${downloadMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {downloadMessage.type === 'error' ? <AlertCircle size={14}/> : <CheckCircle2 size={14}/>} {downloadMessage.text}
                        </div>
                    )}
                    <button onClick={handlePublicDownload} disabled={isDownloading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 text-sm">
                        {isDownloading ? <span className="animate-pulse">Gerando Documento...</span> : <><Download size={16}/> Baixar Arquivo PDF</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-xl relative max-h-[90vh] overflow-y-auto [scrollbar-width:none]">
                <button onClick={() => setIsEmailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={18}/></button>
                <div className="mb-5 text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100"><BellRing size={20}/></div>
                    <h3 className="text-base font-semibold text-gray-900">Alertas de Escala</h3>
                    <p className="text-xs text-gray-500 mt-1">Inscreva-se para receber avisos antes das missas.</p>
                </div>
                
                <div className="space-y-4">
                    {emailMessage.text && (
                        <div className={`text-xs p-3 rounded-xl flex items-center gap-2 border ${emailMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {emailMessage.type === 'error' ? <AlertCircle size={14}/> : <CheckCircle2 size={14}/>} {emailMessage.text}
                        </div>
                    )}
                    
                    {acolitosAtivos.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-xl text-center text-xs font-medium">
                            Todos os acólitos ativos já cadastraram seus e-mails.
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Localize seu Nome</label>
                                <div className="relative">
                                    <UserCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={emailForm.acolitoId} 
                                        onChange={e => setEmailForm({...emailForm, acolitoId: e.target.value})} 
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900 text-sm"
                                    >
                                        <option value="">Selecione...</option>
                                        {acolitosAtivos.map(ac => (
                                            <option key={ac.id} value={ac.id}>{ac.nome} {ac.sobrenome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Endereço de E-mail</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="email" 
                                        placeholder="exemplo@email.com" 
                                        value={emailForm.email} 
                                        onChange={e => setEmailForm({...emailForm, email: e.target.value})} 
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900 text-sm" 
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleSubscribeEmail} 
                                disabled={loading} 
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-sm active:scale-95 text-sm"
                            >
                                {loading ? <span className="animate-pulse">Configurando...</span> : 'Confirmar Cadastro'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="w-full max-w-[380px] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden relative transition-all duration-300">
        
        <div className="bg-slate-50 p-6 text-center border-b border-gray-100 relative">
          {showLoginForm && (
              <button 
                onClick={() => { setShowLoginForm(false); setError('') }} 
                className="absolute top-5 left-5 p-1.5 bg-white rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition shadow-sm"
              >
                  <ChevronLeft size={18} />
              </button>
          )}
          
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-3 shadow-md shadow-blue-600/20">
            <Lock size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Paróquia SJO</h1>
          <p className="text-gray-500 text-xs mt-1">Acesso ao Sistema de Escalas</p>
        </div>

        <div className="p-6">
            {!showLoginForm ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    <button 
                        onClick={() => setIsPdfModalOpen(true)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 p-3.5 rounded-xl transition flex items-center justify-between group shadow-sm"
                    >
                        <span className="text-sm font-medium">Baixar Escala Mensal</span>
                        <Download size={18} className="text-blue-500 group-hover:scale-110 transition" />
                    </button>

                    <button 
                        onClick={() => setIsEmailModalOpen(true)}
                        className="w-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 p-3.5 rounded-xl transition flex items-center justify-between group shadow-sm"
                    >
                        <span className="text-sm font-medium">Cadastrar Alertas</span>
                        <BellRing size={18} className="text-emerald-500 group-hover:animate-bounce" />
                    </button>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-widest">
                            <span className="bg-white px-3 text-gray-400">Acesso Restrito</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowLoginForm(true)}
                        className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 p-3.5 rounded-xl transition flex items-center justify-center gap-2 group shadow-sm text-sm font-medium"
                    >
                        <UserCog size={16} className="text-gray-400 group-hover:text-gray-700 transition"/>
                        <span>Área Administrativa</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl text-center font-medium flex items-center gap-2 justify-center">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Usuário</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={form.usuario}
                                onChange={e => setForm({...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})}
                                className="w-full p-3 pl-10 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900 text-sm"
                                placeholder="ex: joao.silva"
                                autoFocus
                            />
                            <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={form.password}
                                onChange={e => setForm({...form, password: e.target.value})}
                                className="w-full p-3 pl-10 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900 text-sm"
                                placeholder="••••••••"
                            />
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <button 
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl transition-all active:scale-95 shadow-md mt-2 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? 'Verificando...' : 'Entrar no Painel'}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}