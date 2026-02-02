'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { 
    Lock, AtSign, ArrowRight, Download, X, FileText, 
    Calendar as CalendarIcon, CheckCircle2, AlertCircle, 
    UserCog, ChevronLeft, LogIn
} from 'lucide-react'

// --- CONSTANTES ---
const PLACE_SIGLA: { [key: string]: string } = {
    "São José Operário": "SJO", "Capela Nsa. Sra. das Graças": "NSG",
    "Nsa. Sra. da Abadia": "NSA", "Santa Clara": "SC"
}
const ROLE_SIGLA: { [key: string]: string } = { 'Missal': 'M', 'Vela': 'V', 'Turíbulo': 'T', 'Naveta': 'N' }

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Controle de visualização do formulário
  const [showLoginForm, setShowLoginForm] = useState(false)

  // Estados do PDF
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfMonth, setPdfMonth] = useState(new Date().toISOString().slice(0, 7))
  const [currentMonthName, setCurrentMonthName] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState({ type: '', text: '' })

  const [form, setForm] = useState({
    usuario: '',
    password: ''
  })

  useEffect(() => {
      const date = new Date()
      const monthName = date.toLocaleString('pt-BR', { month: 'long' })
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
      setCurrentMonthName(capitalized)
  }, [])

  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s/g, '')
    setForm({ ...form, usuario: value })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleLogin()
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
      const { data, error } = await supabase
        .from('acolitos')
        .select('*')
        .eq('usuario', form.usuario)
        .eq('senha', form.password)
        .eq('ativo', true)
        .single()

      if (error || !data) {
        throw new Error('Usuário ou senha incorretos.')
      }

      if (data.perfil === 'padrao') {
          throw new Error('Acesso restrito à Diretoria.')
      }

      localStorage.setItem('auth_token', JSON.stringify(data))
      window.location.href = '/'

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePublicDownload = async () => {
      setIsDownloading(true);
      setDownloadMessage({ type: '', text: '' });

      try {
          const [year, month] = pdfMonth.split('-').map(Number);
          const startDate = `${pdfMonth}-01`;
          const endDate = `${pdfMonth}-${new Date(year, month, 0).getDate()}`;

          const { data: rawEvents, error } = await supabase
              .from('escalas')
              .select('*')
              .gte('data', startDate)
              .lte('data', endDate)
              .order('data', { ascending: true })
              .order('hora', { ascending: true });

          if (error) throw error;

          if (!rawEvents || rawEvents.length === 0) {
              setDownloadMessage({ type: 'error', text: 'Nenhuma escala encontrada para este mês.' });
              return;
          }

          const jsPDF = (await import('jspdf')).default;
          const doc = new jsPDF('p', 'mm', 'a4');

          const refDate = new Date(parseInt(pdfMonth.split('-')[0]), parseInt(pdfMonth.split('-')[1]) - 1, 1);
          const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
          const yearStr = refDate.getFullYear();

          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("ESCALA DOS ACÓLITOS – " + monthName + "/" + yearStr, 105, 15, { align: "center" });

          const startX = 10; const startY = 25; const boxWidth = 47.5; const boxHeight = 24; const gap = 0; const columns = 4;
          let cursorX = startX; let cursorY = startY; doc.setFontSize(8);

          rawEvents.forEach((evt: any, index: number) => {
              if (index > 0 && index % columns === 0) { cursorX = startX; cursorY += boxHeight + gap; }
              if (cursorY + boxHeight > 280) { doc.addPage(); cursorY = 20; }

              const d = new Date(evt.data + 'T12:00:00');
              const day = d.getDate();
              const weekDayRaw = d.toLocaleDateString('pt-BR', { weekday: 'long' });
              const weekDay = weekDayRaw.charAt(0).toUpperCase() + weekDayRaw.slice(1);
              const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              const timeFormatted = evt.hora.substring(0, 5);
              const placeSigla = PLACE_SIGLA[evt.local] || '???';

              let isSpecial = false;
              if (day === 19 && placeSigla === 'SJO') isSpecial = true;
              if (day === 15 && placeSigla === 'NSA') isSpecial = true;

              if (isSpecial) doc.setFillColor(220, 230, 255); else doc.setFillColor(240, 240, 240);
              doc.rect(cursorX, cursorY, boxWidth, 6, 'F'); doc.setDrawColor(0); doc.rect(cursorX, cursorY, boxWidth, boxHeight);

              doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
              doc.text(`${weekDay}, ${timeFormatted} - ${placeSigla}`, cursorX + (boxWidth / 2), cursorY + 4, { align: 'center' });
              doc.text(dayMonth, cursorX + boxWidth - 2, cursorY + 4, { align: 'right' });

              doc.setFont("helvetica", "normal"); let listY = cursorY + 10;
              const acolitosList = Array.isArray(evt.acolitos) ? evt.acolitos : [];
              
              acolitosList.forEach((ac: any) => {
                  const siglaFuncao = ROLE_SIGLA[ac.funcao] || ac.funcao.substring(0,1);
                  doc.setFillColor(50, 50, 50); doc.roundedRect(cursorX + 2, listY - 3, 6, 4, 1, 1, 'F');
                  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
                  doc.text(siglaFuncao, cursorX + 5, listY, { align: 'center' });
                  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
                  doc.text(ac.nome, cursorX + 12, listY); listY += 3.5;
              });

              if (evt.observacao && evt.observacao.includes('Votiva')) doc.setTextColor(0);
              cursorX += boxWidth + gap;
          });

          doc.save(`escala_${monthName}_${yearStr}.pdf`);
          setDownloadMessage({ type: 'success', text: 'PDF gerado com sucesso!' });
          setTimeout(() => { setIsPdfModalOpen(false); setDownloadMessage({ type: '', text: '' }); }, 2000);

      } catch (err: any) {
          console.error(err);
          setDownloadMessage({ type: 'error', text: 'Erro ao gerar PDF.' });
      } finally { setIsDownloading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans p-4" onKeyDown={handleKeyDown}>
      
      {/* MODAL DE PDF */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><X size={20}/></button>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="text-blue-500" size={20}/> Baixar Escala</h3>
                <div className="space-y-4">
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                        <label className="text-xs text-zinc-500 font-bold uppercase block mb-2">Selecione o Mês</label>
                        <input type="month" value={pdfMonth} onChange={e => setPdfMonth(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600 transition" style={{colorScheme: 'dark'}} />
                    </div>
                    {downloadMessage.text && (
                        <div className={`text-xs p-3 rounded-lg flex items-center gap-2 ${downloadMessage.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-green-900/30 text-green-400 border border-green-900/50'}`}>
                            {downloadMessage.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>} {downloadMessage.text}
                        </div>
                    )}
                    <button onClick={handlePublicDownload} disabled={isDownloading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                        {isDownloading ? <span className="animate-pulse">Gerando...</span> : <><Download size={18}/> Baixar Arquivo PDF</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- CARTÃO PRINCIPAL --- */}
      <div className="w-full max-w-md bg-zinc-900 rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden relative transition-all duration-300">
        
        {/* HEADER */}
        <div className="bg-zinc-800/50 p-8 text-center border-b border-zinc-800 relative">
          {showLoginForm && (
              <button 
                onClick={() => { setShowLoginForm(false); setError(''); }} 
                className="absolute top-6 left-6 p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition"
              >
                  <ChevronLeft size={20} />
              </button>
          )}
          
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50 transition-transform hover:scale-105">
            <Lock size={32} />
          </div>
          <h1 className="text-2x2 font-bold text-white">Acólitos - Paróquia São José Operário</h1>
          <p className="text-gray-400 text-sm mt-2">  </p>
        </div>

        {/* BODY */}
        <div className="p-8">
            
            {!showLoginForm ? (
                // --- MODO 1: MENU DE ESCOLHA (HUB) ---
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Botão Principal: Download */}
                    <div>
                        <button 
                            onClick={() => setIsPdfModalOpen(true)}
                            className="group w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-5 rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-between"
                        >
                            <div className="text-left">
                                <span className="block text-blue-200 text-xs font-bold uppercase tracking-wider mb-1"></span>
                                <span className="block text-lg font-bold">Baixar Escala de {currentMonthName}</span>
                            </div>
                            <div className="bg-blue-500/30 p-3 rounded-xl group-hover:bg-blue-500/50 transition">
                                <Download size={24} />
                            </div>
                        </button>
                    </div>

                    {/* Divisor */}
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                            <span className="bg-zinc-900 px-3 text-zinc-600">DIRETORIA</span>
                        </div>
                    </div>

                    {/* Botão Secundário: Login */}
                    <button 
                        onClick={() => setShowLoginForm(true)}
                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white p-4 rounded-xl transition flex items-center justify-center gap-3 group"
                    >
                        <UserCog size={20} className="group-hover:text-blue-500 transition"/>
                        <span className="font-medium">Acesso Administrativo</span>
                    </button>

                </div>
            ) : (
                // --- MODO 2: FORMULÁRIO DE LOGIN ---
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center font-medium animate-pulse flex items-center gap-2 justify-center">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuário</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={form.usuario}
                                onChange={handleUsuarioChange}
                                className="w-full p-4 pl-12 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-blue-400 font-medium lowercase"
                                placeholder="ex: joao.silva"
                                autoFocus
                            />
                            <AtSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={form.password}
                                onChange={e => setForm({...form, password: e.target.value})}
                                className="w-full p-4 pl-12 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white"
                                placeholder="••••••••"
                            />
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        </div>
                    </div>

                    <button 
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20 mt-4 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Verificando...' : 'Acessar Sistema'}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  )
}