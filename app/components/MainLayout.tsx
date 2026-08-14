'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  X, Users, LogOut, Settings, Info, BookOpen, Menu, Download, 
  ShieldCheck, CalendarOff, Flame, Calendar as CalendarIcon 
} from 'lucide-react'

// --- Constantes Visuais ---
const APP_VERSION = "v3.98.5-ui-folder-light" 

const PLACE_LEGEND = [
    { name: 'São José Operário', color: 'bg-blue-600' },
    { name: 'Nsa. Sra. das Graças', color: 'bg-emerald-600' },
    { name: 'Nsa. Sra. Abadia', color: 'bg-orange-500' },
    { name: 'Santa Clara', color: 'bg-violet-600' }
]

interface MainLayoutProps {
    children: React.ReactNode;
    userProfile: string;
    onLogout: (e: React.MouseEvent) => void;
    customSidebarContent?: React.ReactNode; 
}

export default function MainLayout({ children, userProfile, onLogout, customSidebarContent }: MainLayoutProps) {
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)
    
    const canManage = userProfile === 'admin' || userProfile === 'diretoria'

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-500/30">
            
            {/* Cabeçalho Mobile */}
            <header className="lg:hidden fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 p-1 -ml-1"><Menu size={24}/></button>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-medium text-white text-sm shadow-md">JP</div>
                    <h1 className="text-sm font-medium text-gray-900">São José Operário</h1>
                </div>
            </header>

            {/* Overlay Mobile */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Menu Lateral (Sidebar) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-medium text-white shadow-md">JP</div>
                        <div>
                            <h1 className="text-sm font-medium leading-none text-gray-900">São José Operário</h1>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{userProfile === 'admin' ? 'Admin' : 'Acólito'}</span>
                        </div>
                    </div>
                    <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3 px-2">Menu Principal</div>
                    
                    {/* Link para a Home (Escalas) */}
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                        <BookOpen size={18}/> Escalas
                    </Link>

                    {canManage && (
                        <>
                            <Link href="/acolitos" onClick={() => setIsMobileMenuOpen(false)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${pathname === '/acolitos' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                                <Users size={18}/> Acólitos
                            </Link>
                            <Link href="/configuracoes" onClick={() => setIsMobileMenuOpen(false)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${pathname === '/configuracoes' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                                <Settings size={18}/> Restrições
                            </Link>
                        </>
                    )}
                    
                    {customSidebarContent}

                    <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
                        <div>
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 block mb-3">Cores das Igrejas</span>
                            <div className="space-y-2 px-2">
                                {PLACE_LEGEND.map(p => (
                                    <div key={p.name} className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                                        <div className={`w-3 h-3 rounded-sm ${p.color}`}></div> {p.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100 flex items-center gap-2">
                    <button onClick={() => {setIsAboutModalOpen(true); setIsMobileMenuOpen(false)}} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs font-medium transition"><Info size={16}/> Sobre</button>
                    <button onClick={() => {setIsRulesModalOpen(true); setIsMobileMenuOpen(false)}} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs font-medium transition"><BookOpen size={16}/> Regras</button>
                    <button onClick={onLogout} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"><LogOut size={18}/></button>
                </div>
            </aside>

            {/* Renderiza o conteúdo da Aba/Página ao lado do menu */}
            <div className="flex-1 lg:ml-64 w-full relative">
                {children}
            </div>

            {/* Modais Compartilhados (Sobre e Regras) */}
            {isAboutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                        <button onClick={() => setIsAboutModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                            <span className="text-white font-medium text-lg">JP</span>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-1">São José Operário</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">Versão {APP_VERSION}</p>
                    </div>
                </div>
            )}

            {isRulesModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <BookOpen size={20} className="text-purple-600"/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Regras e Algoritmos</h3>
                                    <p className="text-xs text-gray-500">Critérios do Gerador Automático</p>
                                </div>
                            </div>
                            <button onClick={() => setIsRulesModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-sm text-gray-600 leading-relaxed">
                            <p className="text-sm">O gerador automático utiliza um algoritmo de <strong>If/Else</strong> rígido para garantir uma distribuição justa. Abaixo estão as lógicas mapeadas:</p>

                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><ShieldCheck size={16} className="text-green-600"/> 1. Igualdade e Proporcionalidade</h4>
                                <p className="pl-6 border-l-2 border-gray-100">
                                    <strong>SE</strong> houver vagas na missa, <strong>ENTÃO</strong> o sistema cria um mapa de contagem. O robô ordena todos os acólitos pela quantidade de vezes que já serviram no mês atual. Quem serviu menos tem prioridade imediata.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><CalendarOff size={16} className="text-red-500"/> 2. Restrições e Conflitos Diários</h4>
                                <p className="pl-6 border-l-2 border-gray-100">
                                    <strong>SE</strong> o acólito estiver no banco de dados de restrições para a data atual,<br/>
                                    <strong>OU SE</strong> ele já foi sorteado para servir em qualquer outra missa no mesmo dia,<br/>
                                    <strong>OU SE</strong> ele serviu no dia anterior ou no dia seguinte (proteção de descanso),<br/>
                                    <strong>ENTÃO</strong> ele é sumariamente ignorado e removido do sorteio.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><Users size={16} className="text-blue-500"/> 3. Parceiros (Duplas Inseparáveis)</h4>
                                <p className="pl-6 border-l-2 border-gray-100">
                                    <strong>SE</strong> o acólito sorteado possuir um "Parceiro" cadastrado, o sistema tentará alocar a dupla nas próximas 2 vagas.<br/>
                                    <strong>SE</strong> faltar apenas 1 vaga para a missa fechar, <strong>ENTÃO</strong> o sistema ignora os dois para não quebrar a dupla, passando a vez.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><Flame size={16} className="text-orange-500"/> 4. Funções Litúrgicas (Vagas)</h4>
                                <p className="pl-6 border-l-2 border-gray-100">
                                    <strong>SE</strong> a vaga em aberto for a 1ª (Missal), <strong>ENTÃO</strong> exige que "Manuseia Missal" = Verdadeiro no cadastro.<br/>
                                    <strong>SE</strong> a vaga em aberto for a 3ª (Turíbulo), <strong>ENTÃO</strong> exige que "Manuseia Turíbulo" = Verdadeiro E que o Gênero seja Masculino.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><CalendarIcon size={16} className="text-purple-500"/> 5. Apenas Fim de Semana</h4>
                                <p className="pl-6 border-l-2 border-gray-100">
                                    <strong>SE</strong> a opção "Só FDS" estiver marcada, <strong>ENTÃO</strong> o robô só verifica se o dia da semana é `0` (Domingo) ou `6` (Sábado). Caso contrário, bloqueia.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><Settings size={16} className="text-gray-500"/> 6. Condicionais do Menu de Geração</h4>
                                <ul className="pl-6 border-l-2 border-gray-100 list-disc list-inside space-y-1">
                                    <li><strong>Missa Dia 19:</strong> SE marcado, eleva o tamanho da equipe de São José para 4 vagas automaticamente.</li>
                                    <li><strong>Novena:</strong> SE marcado, bloqueia geração normal nas Segundas às 19:30 e insere limite forçado de 1 vaga.</li>
                                    <li><strong>Semana (Qua/Sex):</strong> SE marcado, o tamanho da equipe (que seria 2) é forçado para = 1.</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-100 mt-4">
                            <button onClick={() => setIsRulesModalOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/20 active:scale-95">
                                Entendi a Lógica
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}