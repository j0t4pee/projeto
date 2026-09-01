'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, where, getDoc, setDoc } from 'firebase/firestore'

import MainLayout from '@/app/components/MainLayout'
import { 
  X, LogOut, Users, DollarSign, ClipboardList, Settings, ChevronLeft,
  ArrowLeft, Save, Trash2, User, CheckCircle2, Edit2, 
  Cake, AlertCircle, AlertTriangle, Heart, CalendarClock, 
  BookOpen, Flame, Plus, PartyPopper, Search, Shield, Clock, LockKeyhole, Download, FileText, BellRing, Mail, Send, Timer, Play, Settings2, CalendarDays, MessageSquare
} from 'lucide-react'

interface AlertState {
    isOpen: boolean;
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
}

const MODULES = [
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'equipe', label: 'Gestão de Equipe' },
    { id: 'atas', label: 'Atas / Documentos' },
    { id: 'restricoes', label: 'Gerenciar Restrições' },
    { id: 'escalas', label: 'Gerar/Editar Escalas' } 
]

export default function AcolitosPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [acolitos, setAcolitos] = useState<any[]>([])
  const [userRole, setUserRole] = useState('padrao')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isCustomMailModalOpen, setIsCustomMailModalOpen] = useState(false)
  const [sendMode, setSendMode] = useState<'geral' | 'individual'>('individual')
  const [sendMonth, setSendMonth] = useState(new Date().toISOString().slice(0, 7))

  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [configNotif, setConfigNotif] = useState({ lembrete1_dias: 1, lembrete2_horas: 3, ativo: true })
  const [testForm, setTestForm] = useState({ email: '', minutos: 3 })
  const [testCountdown, setTestCountdown] = useState<number | null>(null)

  const [customMailForm, setCustomMailForm] = useState({
      destinatario: 'todos',
      acolitoId: '',
      assunto: '',
      mensagem: ''
  })

  const [reportTab, setReportTab] = useState<'niver' | 'dados'>('niver')
  const [reportCols, setReportCols] = useState({
      telefone: true, usuario: true, perfil: true, liturgia: true
  })

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'success', title: '', message: ''
  })

  const [form, setForm] = useState({
    nome: '', sobrenome: '', usuario: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', 
    data_nascimento: '', perfil: 'padrao', senha: '123', genero: 'M', email: '',
    apenas_fim_de_semana: false, parceiro_id: '', acessos: [] as string[],
    manuseia_missal: false, manuseia_turibulo: false, disponivel_inicio: '00:00', disponivel_fim: '23:59'
  })

  useEffect(() => {
    setMounted(true)
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil || 'padrao')
    } catch (e) { router.push('/login') }
    
    fetchAcolitos()
    fetchConfigNotif()
  }, [])

  useEffect(() => {
    if (testCountdown !== null && testCountdown > 0) {
        const timer = setTimeout(() => setTestCountdown(testCountdown - 1), 1000)
        return () => clearTimeout(timer)
    } else if (testCountdown === 0) {
        setTestCountdown(null)
        dispararEmailDeTeste()
    }
  }, [testCountdown])

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault(); localStorage.removeItem('auth_token'); window.location.href = '/login'
  }

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type })
  }
  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
      setCustomAlert({ isOpen: true, title, message, type: 'warning', onConfirm })
  }
  const closeAlert = () => { setCustomAlert({ ...customAlert, isOpen: false, onConfirm: undefined }) }

  async function fetchAcolitos() {
    setLoading(true)
    try {
        const q = query(collection(db, 'acolitos'), orderBy('nome', 'asc'))
        const querySnapshot = await getDocs(q)
        setAcolitos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (error: any) { 
        triggerAlert('Erro', 'Não foi possível carregar os dados.', 'error')
    } finally { setLoading(false) }
  }

  async function fetchConfigNotif() {
      try {
          const docRef = doc(db, 'configuracoes', 'notificacoes')
          const snap = await getDoc(docRef)
          if (snap.exists()) {
              const data = snap.data()
              setConfigNotif({
                  lembrete1_dias: data.lembrete1_dias || (data.lembrete1_horas ? Math.round(data.lembrete1_horas / 24) : 1),
                  lembrete2_horas: data.lembrete2_horas || 3,
                  ativo: data.ativo ?? true
              })
          }
      } catch (e) { console.log("Erro ao buscar configs:", e) }
  }

  async function saveConfigNotif() {
      try {
          const docRef = doc(db, 'configuracoes', 'notificacoes')
          await setDoc(docRef, configNotif)
          triggerAlert('Sucesso', 'Parâmetros de notificação atualizados!', 'success')
      } catch (e) { triggerAlert('Erro', 'Falha ao salvar os parâmetros.', 'error') }
  }

  const iniciarTesteTimer = () => {
      if(!testForm.email) return triggerAlert('Atenção', 'Preencha o e-mail de teste.', 'warning')
      setTestCountdown(testForm.minutos * 60)
  }

  const cancelarTeste = () => { setTestCountdown(null) }

  async function dispararEmailDeTeste() {
      try {
          triggerAlert('Enviando', 'Disparando e-mail de teste...', 'info')
          const htmlMsg = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 18px;">Teste de Envio</h2>
                </div>
                <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
                  <p style="margin-top: 0;">Olá! Este é um e-mail de teste simulado disparado pelo painel da diretoria após <b>${testForm.minutos} minuto(s)</b>.</p>
                  <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 15px 0;">
                    <p style="margin: 0; font-weight: bold; color: #1e293b;">Status do Servidor: Operacional</p>
                  </div>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 11px; color: #64748b;">Sistema de Escalas • Paróquia São José Operário</p>
                </div>
              </div>
          `
          const res = await fetch('/api/enviar-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ titulo: 'Teste de Envio do Sistema', mensagem: htmlMsg.replace(/\n/g, ''), emails: [testForm.email] })
          })
          if (!res.ok) throw new Error("Falha no servidor ao enviar.")
          triggerAlert('Sucesso!', 'O e-mail de teste foi enviado. Verifique sua caixa de entrada.', 'success')
          setIsTestModalOpen(false)
      } catch (e: any) { triggerAlert('Erro', e.message, 'error') }
  }

  async function handleSendCustomEmail() {
      if(!customMailForm.assunto || !customMailForm.mensagem) {
          return triggerAlert('Atenção', 'Preencha o assunto e a mensagem do e-mail.', 'warning')
      }

      setLoading(true)
      triggerAlert('Enviando', 'Disparando comunicado por e-mail...', 'info')

      try {
          let listaEmails: string[] = []

          if (customMailForm.destinatario === 'todos') {
              listaEmails = acolitos.filter(a => a.email && a.email.trim() !== '' && a.ativo).map(a => a.email)
              if (listaEmails.length === 0) throw new Error("Nenhum acólito ativo com e-mail cadastrado.")
          } else {
              const ac = acolitos.find(a => a.id === customMailForm.acolitoId)
              if (!ac || !ac.email) throw new Error("Acólito selecionado não possui e-mail cadastrado.")
              listaEmails = [ac.email]
          }

          const htmlFormatado = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #2563eb; padding: 24px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">${customMailForm.assunto}</h2>
                  <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 13px;">Comunicado Paroquial • Escalas de Acólitos</p>
                </div>
                <div style="padding: 28px; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                  ${customMailForm.mensagem}
                </div>
                <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold;">Paróquia São José Operário</p>
                </div>
              </div>
          `

          const res = await fetch('/api/enviar-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  titulo: customMailForm.assunto,
                  mensagem: htmlFormatado.replace(/\n/g, ''),
                  emails: listaEmails
              })
          })

          if (!res.ok) throw new Error("Erro de comunicação ao enviar comunicado.")

          triggerAlert('Sucesso!', `Comunicado enviado para ${listaEmails.length} endereço(s).`, 'success')
          setIsCustomMailModalOpen(false)
          setCustomMailForm({ destinatario: 'todos', acolitoId: '', assunto: '', mensagem: '' })
      } catch (e: any) {
          triggerAlert('Erro', e.message, 'error')
      } finally {
          setLoading(false)
      }
  }

  const getAniversariantesData = () => {
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth() + 1
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const currentCompareValue = (currentMonth * 100) + currentDay;

    const todos = acolitos.filter(a => a.data_nascimento).map(a => {
        const [ano, mes, dia] = a.data_nascimento.split('-')
        const diaNum = parseInt(dia); const mesNum = parseInt(mes)
        const userCompareValue = (mesNum * 100) + diaNum;
        return { ...a, dia: diaNum, mes: mesNum, mesNome: meses[mesNum - 1], compareValue: userCompareValue, isToday: userCompareValue === currentCompareValue }
    }).sort((a, b) => a.compareValue - b.compareValue)

    return { hoje: todos.filter(a => a.isToday), proximos: todos.filter(a => a.compareValue > currentCompareValue).slice(0, 5) }
  }
  const { hoje, proximos } = getAniversariantesData()

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 4) v = v.slice(0, 4)
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1/$2')
    setForm({...form, data_nascimento: v})
  }
  
  const toggleAccess = (moduleId: string) => {
      setForm(prev => {
          const exists = prev.acessos.includes(moduleId)
          if (exists) return { ...prev, acessos: prev.acessos.filter(a => a !== moduleId) }
          return { ...prev, acessos: [...prev.acessos, moduleId] }
      })
  }

  function openNewForm() {
      setEditingId(null)
      setForm({ 
        nome: '', sobrenome: '', usuario: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', data_nascimento: '', 
        perfil: 'padrao', senha: '123', genero: 'M', email: '', apenas_fim_de_semana: false, parceiro_id: '', acessos: [],
        manuseia_missal: false, manuseia_turibulo: false, disponivel_inicio: '00:00', disponivel_fim: '23:59'
      })
      setIsFormOpen(true)
  }

  function handleEdit(acolito: any) {
    setEditingId(acolito.id)
    let formattedDate = ''
    if (acolito.data_nascimento) {
        const [ano, mes, dia] = acolito.data_nascimento.split('-')
        formattedDate = `${dia}/${mes}`
    }
    setForm({ ...acolito, data_nascimento: formattedDate, email: acolito.email || '', parceiro_id: acolito.parceiro_id || '', acessos: acolito.acessos || [] })
    setIsFormOpen(true)
  }

  async function handleSave() {
    try {
        let dataNascDB = null
        if (form.data_nascimento && form.data_nascimento.length === 5) {
            const [dia, mes] = form.data_nascimento.split('/')
            dataNascDB = `2000-${mes}-${dia}`
        }
        const payload = { ...form, data_nascimento: dataNascDB, parceiro_id: form.parceiro_id !== '' ? form.parceiro_id : null }
        if (editingId) {
            await updateDoc(doc(db, 'acolitos', editingId), payload)
        } else {
            await addDoc(collection(db, 'acolitos'), { ...payload, ativo: true })
        }
        setIsFormOpen(false); fetchAcolitos(); triggerAlert('Sucesso', 'Dados atualizados com sucesso.', 'success')
    } catch (error: any) { triggerAlert('Erro', error.message, 'error') }
  }

  async function toggleStatus(e: any, id: string, statusAtual: boolean) {
    e.stopPropagation(); 
    try { await updateDoc(doc(db, 'acolitos', id), { ativo: !statusAtual }); fetchAcolitos() } 
    catch { triggerAlert('Erro', 'Falha ao mudar status.', 'error') }
  }

  async function handleQuickToggle(e: any, id: string, field: string, currentValue: boolean) {
      e.stopPropagation();
      if(userRole !== 'admin' && userRole !== 'diretoria') return;
      try { await updateDoc(doc(db, 'acolitos', id), { [field]: !currentValue }); fetchAcolitos(); } 
      catch (err) { triggerAlert('Erro', 'Falha ao atualizar.', 'error'); }
  }

  async function handleDelete(e: any, id: string) {
    e.stopPropagation();
    triggerConfirm('Excluir?', 'Esta ação é irreversível.', async () => {
        try { await deleteDoc(doc(db, 'acolitos', id)); fetchAcolitos(); closeAlert() } 
        catch (e: any) { triggerAlert('Erro', e.message, 'error') }
    })
  }

  const handleDispararEscalas = async () => {
      setLoading(true); triggerAlert("Enviando...", "Processando as escalas.", "info");
      try {
          const [year, month] = sendMonth.split('-').map(Number);
          const startDate = `${sendMonth}-01`; const endDate = `${sendMonth}-${new Date(year, month, 0).getDate()}`;
          const mesNome = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });

          const acolitosComEmail = acolitos.filter(a => a.email && a.email.trim() !== '' && a.ativo);
          if(acolitosComEmail.length === 0) throw new Error("Nenhum acólito ativo possui e-mail cadastrado.");

          const qEscalas = query(collection(db, 'escalas'), where("data", ">=", startDate), where("data", "<=", endDate));
          const snapEscalas = await getDocs(qEscalas);
          const escalasMes = snapEscalas.docs.map(d => ({id: d.id, ...d.data()}) as any);
          escalasMes.sort((a,b) => new Date(`${a.data}T${a.hora||'00:00'}`).getTime() - new Date(`${b.data}T${b.hora||'00:00'}`).getTime());

          if(escalasMes.length === 0) throw new Error(`Nenhuma escala encontrada para ${mesNome}/${year}.`);

          let enviados = 0;
          if (sendMode === 'geral') {
              let htmlGeral = `<div style="margin-bottom:20px; font-family: Arial, sans-serif;"><h2 style="color:#2563eb;margin:0;">Escala Geral</h2><p style="color:#475569;margin:5px 0 0 0;">Mês de ${mesNome.toUpperCase()} de ${year}</p></div>`;
              escalasMes.forEach(esc => {
                  const dataFormatada = esc.data.split('-').reverse().join('/');
                  const equipe = (esc.acolitos || []).map((a:any) => `<b>${a.nome}</b> (${a.funcao ? a.funcao.substring(0,1) : 'A'})`).join(', ');
                  htmlGeral += `<div style="margin-bottom:10px;padding:12px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:6px; font-family: Arial, sans-serif;"><p style="margin:0 0 5px 0;font-size:14px;font-weight:bold;color:#0f172a;">${dataFormatada} às ${esc.hora?.substring(0,5)} - ${esc.local}</p><p style="margin:0;color:#475569;font-size:13px;">Equipe: ${equipe || 'Ninguém escalado'}</p></div>`;
              });
              const emailsLista = acolitosComEmail.map(a => a.email);
              const res = await fetch('/api/enviar-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: `Escala Geral - ${mesNome.toUpperCase()}/${year}`, mensagem: htmlGeral.replace(/\n/g, '').replace(/\s+/g, ' '), emails: emailsLista }) });
              if(!res.ok) throw new Error("Falha ao enviar.");
              enviados = emailsLista.length;
          } else {
              const normalizeStr = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ')
              
              for (const acolito of acolitosComEmail) {
                  const nomeCompleto = normalizeStr(`${acolito.nome || ''} ${acolito.sobrenome || ''}`)

                  const minhasEscalas = escalasMes.filter(esc => {
                      const lista = Array.isArray(esc.acolitos) ? esc.acolitos : [];
                      return lista.some((a:any) => {
                          if(!a) return false;
                          if(a.id === acolito.id || a.acolitoId === acolito.id) return true;
                          const nomeEscala = normalizeStr(a.nome || '');
                          return nomeEscala === nomeCompleto;
                      });
                  });

                  if (minhasEscalas.length > 0) {
                      const primeiroNome = acolito.nome.split(' ')[0];
                      let htmlIndiv = `<div style="margin-bottom:15px; font-family: Arial, sans-serif;"><p style="font-size:15px;margin:0 0 5px 0;color:#1f2937;">Olá, <b>${primeiroNome}</b>!</p><p style="font-size:13px;margin:0;color:#475569;">Aqui estão suas escalas para o mês de ${mesNome.toUpperCase()} de ${year}.</p></div>`;
                      
                      minhasEscalas.forEach(esc => {
                          const dataFormatada = esc.data.split('-').reverse().join('/')
                          const myAc = (esc.acolitos || []).find((a:any) => { 
                              if(!a) return false;
                              if(a.id === acolito.id || a.acolitoId === acolito.id) return true;
                              const nomeEscala = normalizeStr(a.nome || '');
                              return nomeEscala === nomeCompleto;
                          });

                          const dataStr = esc.data.replace(/-/g, ''); const [h, m] = (esc.hora || '00:00').split(':'); const endHour = (parseInt(h) + 1).toString().padStart(2, '0');
                          const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Missa: '+esc.local)}&dates=${dataStr}T${h}${m}00/${dataStr}T${endHour}${m}00&details=${encodeURIComponent('Função: '+(myAc?.funcao||'Padrão'))}&location=${encodeURIComponent(esc.local)}`;
                          
                          htmlIndiv += `<div style="margin-bottom:8px;padding:10px 12px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #16a34a;border-radius:6px; font-family: Arial, sans-serif;"><p style="margin:0 0 4px 0;font-size:14px;font-weight:bold;color:#0f172a;">${dataFormatada} às ${esc.hora?.substring(0,5)}</p><p style="margin:0 0 8px 0;color:#475569;font-size:13px;"><b>Local:</b> ${esc.local} &nbsp;|&nbsp; <b>Função:</b> ${myAc?.funcao || 'Padrão'}</p><a href="${gCalUrl}" target="_blank" style="background-color:#16a34a;color:#ffffff;padding:6px 12px;text-decoration:none;border-radius:4px;font-size:11px;font-weight:bold;display:inline-block;">Adicionar ao Calendário</a></div>`;
                      });

                      const res = await fetch('/api/enviar-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: `Suas Escalas - ${mesNome.toUpperCase()}/${year}`, mensagem: htmlIndiv.replace(/\n/g, '').replace(/\s+/g, ' '), emails: [acolito.email] }) });
                      if (res.ok) enviados++;
                  }
              }
          }
          triggerAlert("Sucesso", `Foram enviados ${enviados} e-mails com sucesso!`, "success"); setIsSendModalOpen(false);
      } catch(e: any) { triggerAlert("Erro", e.message, "error"); } finally { setLoading(false); }
  }

  const generateBirthdayReport = async () => {
      triggerAlert("Aguarde", "Gerando PDF de aniversariantes...", "info");
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text("RELATÓRIO DE ANIVERSARIANTES", 105, 20, { align: "center" });
      const mesesStr = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      let y = 35;
      mesesStr.forEach((mesNome, index) => {
          const mesNum = index + 1;
          const aniversariantesMes = acolitos.filter(a => {
              if(!a.data_nascimento) return false;
              return parseInt(a.data_nascimento.split('-')[1]) === mesNum;
          }).sort((a, b) => a.nome.localeCompare(b.nome));
          if(aniversariantesMes.length > 0) {
              if(y > 270) { doc.addPage(); y = 20; }
              doc.setFillColor(240, 240, 240); doc.rect(10, y-5, 190, 8, 'F');
              doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
              doc.text(mesNome.toUpperCase(), 15, y); y += 8;
              doc.setFont("helvetica", "normal"); doc.setFontSize(10);
              aniversariantesMes.forEach(a => {
                  if(y > 280) { doc.addPage(); y = 20; }
                  doc.text(`Dia ${a.data_nascimento.split('-')[2]} - ${a.nome} ${a.sobrenome || ''}`, 20, y); y += 6;
              });
              y += 4;
          }
      });
      doc.save("aniversariantes_equipe.pdf"); setIsReportModalOpen(false); closeAlert();
  }

  const generateDataReport = async () => {
      triggerAlert("Aguarde", "Gerando PDF de dados cadastrais...", "info");
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('l', 'mm', 'a4'); 
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text("RELATÓRIO CADASTRAL - EQUIPE", 148.5, 20, { align: "center" });
      let y = 35; doc.setFontSize(9); let currentX = 10;
      doc.setFont("helvetica", "bold"); doc.setFillColor(230, 230, 230); doc.rect(10, y-5, 277, 8, 'F');
      const cols = [{ label: "NOME", width: 70, key: 'nome' }];
      if(reportCols.telefone) cols.push({ label: "TELEFONE", width: 35, key: 'telefone' });
      if(reportCols.usuario) cols.push({ label: "USUÁRIO", width: 35, key: 'usuario' });
      if(reportCols.perfil) cols.push({ label: "PERFIL", width: 30, key: 'perfil' });
      if(reportCols.liturgia) cols.push({ label: "LITURGIA (FUNÇÕES)", width: 60, key: 'liturgia' });
      cols[0].width = 277 - (cols.reduce((sum, c) => sum + c.width, 0) - 70);
      cols.forEach(c => { doc.text(c.label, currentX + 2, y); currentX += c.width; });
      y += 8; doc.setFont("helvetica", "normal");
      [...acolitos].sort((a, b) => a.nome.localeCompare(b.nome)).forEach((ac, idx) => {
          if(y > 190) { doc.addPage(); y = 20; }
          if(idx % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(10, y-4, 277, 6, 'F'); }
          let cx = 10;
          cols.forEach(c => {
              let text = "";
              if(c.key === 'nome') text = `${ac.nome} ${ac.sobrenome || ''}`;
              if(c.key === 'telefone') text = ac.telefone || '-';
              if(c.key === 'usuario') text = ac.usuario || '-';
              if(c.key === 'perfil') text = ac.perfil.toUpperCase();
              if(c.key === 'liturgia') {
                  let parts = [];
                  if(ac.manuseia_missal) parts.push('Missal');
                  if(ac.manuseia_turibulo) parts.push('Turíbulo');
                  if(ac.apenas_fim_de_semana) parts.push('Só FDS');
                  text = parts.length > 0 ? parts.join(', ') : 'Padrão';
              }
              const maxChars = Math.floor(c.width / 2); 
              if(text.length > maxChars) text = text.substring(0, maxChars-3) + '...';
              doc.text(text, cx + 2, y); cx += c.width;
          });
          y += 6;
      });
      doc.save("dados_cadastrais_equipe.pdf"); setIsReportModalOpen(false); closeAlert();
  }

  const filteredAcolitos = acolitos.filter(a => (a.nome + ' ' + a.sobrenome).toLowerCase().includes(searchTerm.toLowerCase()))
  const canManage = userRole === 'admin' || userRole === 'diretoria';

  if (!mounted) return null;

  return (
    <>
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 w-full max-w-sm shadow-xl text-center space-y-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${customAlert.type === 'error' ? 'bg-red-50 text-red-500' : customAlert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : customAlert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                      {customAlert.type === 'error' && <AlertCircle size={24}/>}{customAlert.type === 'success' && <CheckCircle2 size={24}/>}{customAlert.type === 'warning' && <AlertTriangle size={24}/>}{customAlert.type === 'info' && <AlertCircle size={24}/>}
                  </div>
                  <div><h3 className="text-base font-semibold text-gray-900 mb-1">{customAlert.title}</h3><p className="text-sm text-gray-500 leading-relaxed">{customAlert.message}</p></div>
                  <div className="flex gap-3 pt-2">
                      {!customAlert.onConfirm ? (
                          <button onClick={closeAlert} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl border border-gray-200 transition active:scale-95 text-sm">Compreendido</button>
                      ) : (
                          <>
                              <button onClick={closeAlert} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2.5 rounded-xl transition text-sm">Cancelar</button>
                              <button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); closeAlert(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition text-sm">Confirmar</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      <MainLayout userProfile={userRole} onLogout={handleLogout}>
          <main className="px-4 py-8 max-w-7xl mx-auto w-full pt-20 lg:pt-8 animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div><h2 className="text-2xl font-bold text-gray-900 leading-tight">Gestão de Equipe</h2></div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600 shadow-sm w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {acolitos.length} Membros
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                <div className="lg:col-span-3 space-y-6">
                    
                    {/* PAINEL DE PARÂMETROS DE NOTIFICAÇÃO */}
                    {canManage && (
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Settings2 size={18} className="text-blue-600"/> Parâmetros de Notificação</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Configure a antecedência dos alertas automáticos e envie comunicados.</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => setIsSendModalOpen(true)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition">
                                        <Send size={14}/> Disparar Escalas
                                    </button>
                                    <button onClick={() => setIsCustomMailModalOpen(true)} className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition">
                                        <MessageSquare size={14}/> Comunicado
                                    </button>
                                    <button onClick={() => setIsTestModalOpen(true)} className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition">
                                        <Timer size={14}/> Teste de Envio
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Lembrete 1 (Dias antes)</label>
                                    <div className="relative">
                                        <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" min="1" max="15" value={configNotif.lembrete1_dias} onChange={e => setConfigNotif({...configNotif, lembrete1_dias: Number(e.target.value)})} className="w-full pl-10 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 transition"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Lembrete 2 (Horas antes)</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" min="1" max="24" value={configNotif.lembrete2_horas} onChange={e => setConfigNotif({...configNotif, lembrete2_horas: Number(e.target.value)})} className="w-full pl-10 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 transition"/>
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={saveConfigNotif} className="w-full bg-slate-900 hover:bg-black text-white font-medium py-2 rounded-xl transition active:scale-95 flex items-center justify-center gap-2 text-sm">
                                        <Save size={15}/> Salvar Parâmetros
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search e Ações Gerais */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="relative w-full md:w-80 lg:w-96">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 text-gray-900 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 focus:bg-white transition" />
                        </div>
                        {canManage && (
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <button onClick={() => setIsReportModalOpen(true)} className="flex-1 md:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-sm">
                                    <FileText size={18}/> <span className="hidden sm:inline">Relatórios</span>
                                </button>
                                <button onClick={openNewForm} className="flex-1 md:w-auto px-4 py-2.5 bg-green-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-sm">
                                    <Plus size={18}/> <span>Registrar</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-gray-400 animate-pulse font-medium">Carregando equipe...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredAcolitos.map((acolito) => (
                                <div key={acolito.id} onClick={() => canManage ? handleEdit(acolito) : null} className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${!acolito.ativo ? 'opacity-60 grayscale bg-gray-50' : 'border-gray-200'} ${canManage ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}>
                                    <div className="p-4 pb-14"> 
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                    {acolito.nome?.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{acolito.nome} {acolito.sobrenome}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        {acolito.email ? (
                                                            <span title={acolito.email} className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><BellRing size={10}/> Alertas Ativos</span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Mail size={10}/> Sem E-mail</span>
                                                        )}
                                                        {acolito.perfil !== 'padrao' && <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Shield size={10}/> {acolito.perfil}</span>}
                                                        {acolito.parceiro_id && <span className="text-[9px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Heart size={10}/> Dupla</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {canManage && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(e, acolito.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-100 h-11 flex items-center justify-around transition-transform duration-200 z-10 ${canManage ? 'translate-y-full group-hover:translate-y-0' : ''}`}>
                                        <button onClick={(e) => handleQuickToggle(e, acolito.id, 'apenas_fim_de_semana', acolito.apenas_fim_de_semana)} title="FDS" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 border-r border-gray-200/50 ${acolito.apenas_fim_de_semana ? 'text-amber-500' : 'text-gray-400'}`}><CalendarClock size={16}/></button>
                                        <button onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_missal', acolito.manuseia_missal)} title="Missal" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 border-r border-gray-200/50 ${acolito.manuseia_missal ? 'text-blue-500' : 'text-gray-400'}`}><BookOpen size={16}/></button>
                                        <button onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_turibulo', acolito.manuseia_turibulo)} title="Turíbulo" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 border-r border-gray-200/50 ${acolito.manuseia_turibulo ? 'text-orange-500' : 'text-gray-400'}`}><Flame size={16}/></button>
                                        <button onClick={(e) => toggleStatus(e, acolito.id, acolito.ativo)} title="Status" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 ${acolito.ativo ? 'text-emerald-500' : 'text-red-500'}`}><CheckCircle2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="lg:col-span-1 lg:sticky lg:top-8 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <Cake size={18} className="text-pink-600" />
                            <h3 className="font-semibold text-xs uppercase tracking-widest text-gray-700">Aniversariantes</h3>
                        </div>
                        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto [scrollbar-width:none]">
                            {hoje.length > 0 && (
                                <div className="space-y-3">
                                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">Aniversário do Dia</span>
                                    {hoje.map(aniv => (
                                        <div key={aniv.id} className="bg-pink-50 border border-pink-200 p-3 rounded-xl flex items-center gap-3 shadow-sm">
                                            <div className="flex flex-col items-center justify-center bg-pink-500 text-white w-10 h-10 rounded-lg shrink-0 shadow-sm"><span className="text-sm font-black leading-none">{aniv.dia}</span><span className="text-[8px] uppercase font-bold">{aniv.mesNome}</span></div>
                                            <div className="min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{aniv.nome}</p><span className="text-[10px] font-bold text-pink-600 flex items-center gap-1"><PartyPopper size={12}/> Parabéns!</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-3">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Próximos</span>
                                {proximos.length === 0 && hoje.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center italic py-2">Nenhum aniversário próximo.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {proximos.map(aniv => (
                                            <div key={aniv.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200 group">
                                                <div className="flex flex-col items-center justify-center bg-white border border-gray-200 text-gray-600 w-9 h-9 rounded-lg shrink-0 group-hover:border-gray-300 transition-colors shadow-sm"><span className="text-xs font-bold leading-none">{aniv.dia}</span><span className="text-[7px] uppercase font-bold">{aniv.mesNome}</span></div>
                                                <div className="min-w-0"><p className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate transition-colors">{aniv.nome} {aniv.sobrenome}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
          </main>

          {/* MODAL COMUNICADO CUSTOMIZADO */}
          {isCustomMailModalOpen && (
              <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border border-gray-200 w-full max-w-lg rounded-3xl shadow-xl flex flex-col relative max-h-[90vh] animate-in zoom-in-95">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50/50 shrink-0 rounded-t-3xl">
                          <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
                              <MessageSquare size={18} className="text-blue-600"/> Enviar Comunicado
                          </h2>
                          <button onClick={() => setIsCustomMailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={18}/></button>
                      </div>

                      <div className="p-6 space-y-4 overflow-y-auto [scrollbar-width:none]">
                          <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Para quem enviar?</label>
                              <select 
                                  value={customMailForm.destinatario} 
                                  onChange={e => setCustomMailForm({...customMailForm, destinatario: e.target.value})}
                                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition"
                              >
                                  <option value="todos">Todos os Acólitos (Com e-mail cadastrado)</option>
                                  <option value="especifico">Um Acólito Específico</option>
                              </select>
                          </div>

                          {customMailForm.destinatario === 'especifico' && (
                              <div>
                                  <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Selecione o Acólito</label>
                                  <select 
                                      value={customMailForm.acolitoId} 
                                      onChange={e => setCustomMailForm({...customMailForm, acolitoId: e.target.value})}
                                      className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition"
                                  >
                                      <option value="">Selecione...</option>
                                      {acolitos.filter(a => a.email && a.ativo).map(a => (
                                          <option key={a.id} value={a.id}>{a.nome} {a.sobrenome} ({a.email})</option>
                                      ))}
                                  </select>
                              </div>
                          )}

                          <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Assunto do E-mail</label>
                              <input 
                                  type="text" 
                                  placeholder="Ex: Aviso sobre a Missa de Quinta-feira" 
                                  value={customMailForm.assunto} 
                                  onChange={e => setCustomMailForm({...customMailForm, assunto: e.target.value})}
                                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition"
                              />
                          </div>

                          <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Conteúdo da Mensagem</label>
                              <textarea 
                                  rows={5} 
                                  placeholder="Escreva seu comunicado aqui..." 
                                  value={customMailForm.mensagem} 
                                  onChange={e => setCustomMailForm({...customMailForm, mensagem: e.target.value})}
                                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition resize-none"
                              />
                          </div>

                          <button 
                              onClick={handleSendCustomEmail} 
                              disabled={loading} 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 mt-2"
                          >
                              <Send size={18} /> Disparar Comunicado
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL SIMULADOR / TESTE DE NOTIFICAÇÃO */}
          {isTestModalOpen && (
              <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border border-gray-200 w-full max-w-sm rounded-3xl shadow-xl flex flex-col relative animate-in zoom-in-95">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-100/80 shrink-0 rounded-t-3xl">
                          <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                              <Timer size={18} className="text-slate-600"/> Apenas Teste de Envio
                          </h2>
                          <button onClick={() => { setIsTestModalOpen(false); cancelarTeste(); }} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={18}/></button>
                      </div>

                      <div className="p-6 space-y-4">
                          {testCountdown !== null ? (
                              <div className="text-center py-4">
                                  <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200 animate-pulse shadow-sm">
                                      <span className="text-xl font-black">{Math.floor(testCountdown / 60)}:{(testCountdown % 60).toString().padStart(2, '0')}</span>
                                  </div>
                                  <h3 className="font-semibold text-gray-900 text-sm">Contagem iniciada</h3>
                                  <p className="text-xs text-gray-500 mt-1">O e-mail será enviado automaticamente ao zerar.</p>
                                  <button onClick={cancelarTeste} className="mt-5 text-xs font-semibold text-red-500 hover:text-red-700 transition px-4 py-2 bg-red-50 rounded-lg">Cancelar Teste</button>
                              </div>
                          ) : (
                              <>
                                  <div>
                                      <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">E-mail para Teste</label>
                                      <input type="email" placeholder="Seu e-mail aqui" value={testForm.email} onChange={e => setTestForm({...testForm, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                                  </div>
                                  <div>
                                      <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Tempo de Espera (Minutos)</label>
                                      <input type="number" min="1" max="60" value={testForm.minutos} onChange={e => setTestForm({...testForm, minutos: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                                  </div>
                                  <button onClick={iniciarTesteTimer} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 text-sm mt-2">
                                      <Play size={16} /> Iniciar Teste
                                  </button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL DE DISPARAR ESCALAS */}
          {isSendModalOpen && (
              <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-xl flex flex-col relative max-h-[90vh] animate-in zoom-in-95">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50 shrink-0 rounded-t-3xl">
                          <h2 className="text-base font-semibold flex items-center gap-2 text-indigo-900">
                              <Send size={18} className="text-indigo-600"/> Enviar Escalas
                          </h2>
                          <button onClick={() => setIsSendModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={18}/></button>
                      </div>

                      <div className="p-6 space-y-5 overflow-y-auto [scrollbar-width:none]">
                          <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Mês de Referência</label>
                              <input type="month" value={sendMonth} onChange={e => setSendMonth(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                          </div>

                          <div>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Formato de Envio</p>
                              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                  <button onClick={() => setSendMode('individual')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${sendMode === 'individual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                      Para Cada Um (Individual)
                                  </button>
                                  <button onClick={() => setSendMode('geral')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${sendMode === 'geral' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                      Geral (Lista Completa)
                                  </button>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-2 text-center leading-relaxed">
                                  {sendMode === 'individual' ? 'Cada acólito receberá um e-mail contendo apenas as missas dele, com botão de salvar no calendário.' : 'Todos receberão um único e-mail com a lista de todas as missas e equipes do mês.'}
                              </p>
                          </div>

                          <button onClick={handleDispararEscalas} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2">
                              <Send size={18} /> Disparar Agora
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL DE RELATÓRIOS */}
          {isReportModalOpen && (
              <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-xl flex flex-col relative max-h-[90vh] animate-in zoom-in-95">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0 rounded-t-3xl">
                          <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
                              <FileText size={18} className="text-gray-600"/> Gerar Relatórios
                          </h2>
                          <button onClick={() => setIsReportModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={18}/></button>
                      </div>

                      <div className="p-6 space-y-5 overflow-y-auto [scrollbar-width:none]">
                          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                              <button onClick={() => setReportTab('niver')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${reportTab === 'niver' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Aniversariantes</button>
                              <button onClick={() => setReportTab('dados')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${reportTab === 'dados' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Dados Cadastrais</button>
                          </div>

                          {reportTab === 'niver' && (
                              <div className="space-y-4">
                                  <p className="text-xs text-gray-600 leading-relaxed text-center bg-gray-50 p-3 rounded-lg border border-gray-100">Gera uma lista com as datas de aniversário de todos os membros ativos.</p>
                                  <button onClick={generateBirthdayReport} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 text-sm">
                                      <Download size={16} /> Baixar Arquivo PDF
                                  </button>
                              </div>
                          )}

                          {reportTab === 'dados' && (
                              <div className="space-y-4">
                                  <div>
                                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide mb-2">Quais dados incluir no PDF?</p>
                                      <div className="grid grid-cols-2 gap-2">
                                          <label className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-not-allowed">
                                              <input type="checkbox" checked disabled className="w-3.5 h-3.5 accent-slate-800 rounded"/>
                                              <span className="text-xs font-semibold text-gray-900">Nome</span>
                                          </label>
                                          <label className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition">
                                              <input type="checkbox" checked={reportCols.telefone} onChange={e => setReportCols({...reportCols, telefone: e.target.checked})} className="w-3.5 h-3.5 accent-slate-800 rounded"/>
                                              <span className="text-xs font-medium text-gray-700">Telefone</span>
                                          </label>
                                          <label className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition">
                                              <input type="checkbox" checked={reportCols.usuario} onChange={e => setReportCols({...reportCols, usuario: e.target.checked})} className="w-3.5 h-3.5 accent-slate-800 rounded"/>
                                              <span className="text-xs font-medium text-gray-700">Usuário</span>
                                          </label>
                                          <label className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition">
                                              <input type="checkbox" checked={reportCols.perfil} onChange={e => setReportCols({...reportCols, perfil: e.target.checked})} className="w-3.5 h-3.5 accent-slate-800 rounded"/>
                                              <span className="text-xs font-medium text-gray-700">Perfil</span>
                                          </label>
                                          <label className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition col-span-2">
                                              <input type="checkbox" checked={reportCols.liturgia} onChange={e => setReportCols({...reportCols, liturgia: e.target.checked})} className="w-3.5 h-3.5 accent-slate-800 rounded"/>
                                              <span className="text-xs font-medium text-gray-700">Liturgia</span>
                                          </label>
                                      </div>
                                  </div>
                                  <button onClick={generateDataReport} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 text-sm">
                                      <Download size={16} /> Baixar Arquivo PDF
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL DE CADASTRO/EDIÇÃO */}
          {isFormOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white border border-gray-200 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-xl flex flex-col relative overflow-hidden animate-in zoom-in-95">
                  
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 rounded-t-3xl">
                      <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
                        {editingId ? <Edit2 size={18} className="text-blue-600"/> : <User size={18} className="text-blue-600"/>} 
                        {editingId ? 'Editar Membro' : 'Novo Membro'}
                      </h2>
                      <button onClick={() => setIsFormOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={18}/></button>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto [scrollbar-width:none]">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Nome</label>
                              <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                          </div>
                          <div>
                              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Sobrenome</label>
                              <input value={form.sobrenome} onChange={e => setForm({...form, sobrenome: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Gênero</label>
                            <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition">
                                <option value="M">Masculino</option><option value="F">Feminino</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Usuário</label>
                            <input value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Nascimento (DD/MM)</label>
                            <input value={form.data_nascimento} onChange={handleDateChange} placeholder="Ex: 15/08" maxLength={5} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-sm text-gray-900 outline-none transition" />
                        </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">E-mail (Alertas Automáticos)</label>
                          <div className="relative">
                              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                  type="email"
                                  value={form.email} 
                                  onChange={e => setForm({...form, email: e.target.value.toLowerCase().trim()})} 
                                  placeholder="Opcional. Ex: joao@gmail.com" 
                                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm text-gray-900" 
                              />
                          </div>
                      </div>

                      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-3">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1"><Flame size={14}/> Liturgia & Disponibilidade</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-orange-400 transition">
                                <input type="checkbox" checked={form.manuseia_missal} onChange={e => setForm({...form, manuseia_missal: e.target.checked})} className="w-3.5 h-3.5 accent-orange-600 rounded"/>
                                <span className="text-xs font-medium text-gray-700">Missal</span>
                            </label>
                            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-orange-400 transition">
                                <input type="checkbox" checked={form.manuseia_turibulo} onChange={e => setForm({...form, manuseia_turibulo: e.target.checked})} className="w-3.5 h-3.5 accent-orange-600 rounded"/>
                                <span className="text-xs font-medium text-gray-700">Turíbulo</span>
                            </label>
                            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-amber-400 transition">
                                <input type="checkbox" checked={form.apenas_fim_de_semana} onChange={e => setForm({...form, apenas_fim_de_semana: e.target.checked})} className="w-3.5 h-3.5 accent-amber-600 rounded"/>
                                <span className="text-xs font-medium text-gray-700">Só FDS</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-orange-100 pt-3">
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1"><Clock size={12}/> Início Disponibilidade</label>
                                <input type="time" value={form.disponivel_inicio} onChange={e => setForm({...form, disponivel_inicio: e.target.value})} className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition" />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1"><Clock size={12}/> Fim Disponibilidade</label>
                                <input type="time" value={form.disponivel_fim} onChange={e => setForm({...form, disponivel_fim: e.target.value})} className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition" />
                            </div>
                        </div>
                      </div>

                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><Settings size={14}/> Configurações de Sistema</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                 <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Perfil de Acesso</label>
                                 <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition">
                                    <option value="padrao">Acólito (Padrão)</option><option value="diretoria">Diretoria</option><option value="admin">Administrador</option>
                                 </select>
                            </div>
                            <div>
                                 <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Dupla / Parceiro Fixo</label>
                                 <select value={form.parceiro_id} onChange={e => setForm({...form, parceiro_id: e.target.value})} className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition">
                                    <option value="">Nenhum</option>
                                    {acolitos.filter(a => a.id !== editingId).map(a => <option key={a.id} value={a.id}>{a.nome} {a.sobrenome}</option>)}
                                 </select>
                            </div>
                        </div>
                      </div>

                      {userRole === 'admin' && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><LockKeyhole size={12}/> Módulos Liberados</span>
                            <div className="flex flex-wrap gap-2">
                                {MODULES.map(mod => (
                                    <button key={mod.id} onClick={() => toggleAccess(mod.id)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${form.acessos.includes(mod.id) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                        {mod.label}
                                    </button>
                                ))}
                            </div>
                          </div>
                      )}
                  </div>

                  <div className="p-5 border-t border-gray-100 bg-gray-50/80 shrink-0 rounded-b-3xl">
                      <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 text-sm">
                          <Save size={18} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Membro'}
                      </button>
                  </div>
               </div>
            </div>
          )}
      </MainLayout>
    </>
  )
}