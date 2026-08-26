'use client'

import React, { useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc } from 'firebase/firestore'
import Papa from 'papaparse'

export default function ImportarCSV() {
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    const handleImport = () => {
        if (!file) {
            setStatus('Selecione um arquivo CSV primeiro.')
            return
        }

        setLoading(true)
        setStatus('Lendo arquivo CSV...')

        Papa.parse(file, {
            header: true, // Avisa que a primeira linha tem os nomes das colunas
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as any[]
                setStatus(`Iniciando importação de ${data.length} acólitos...`)
                
                let successCount = 0
                let errorCount = 0

                for (const row of data) {
                    try {
                        // Converte a string do CSV para booleano onde necessário
                        const payload = {
                            nome: row.nome || '',
                            sobrenome: row.sobrenome || '',
                            usuario: row.usuario || '',
                            telefone: row.telefone || '',
                            data_nascimento: row.data_nascimento || '',
                            genero: row.genero || 'M',
                            perfil: row.perfil || 'padrao',
                            senha: row.senha || '123',
                            // Converte "true"/"false" ou "1"/"0" para booleano verdadeiro
                            ativo: row.ativo === 'true' || row.ativo === 'TRUE' || row.ativo === '1',
                            apenas_fim_de_semana: row.apenas_fim_de_semana === 'true' || row.apenas_fim_de_semana === '1',
                            manuseia_missal: row.manuseia_missal === 'true' || row.manuseia_missal === '1',
                            manuseia_turibulo: row.manuseia_turibulo === 'true' || row.manuseia_turibulo === '1',
                            experiencia: row.experiencia === 'true' || row.experiencia === '1',
                            parceiro_id: row.parceiro_id ? String(row.parceiro_id) : null,
                        }

                        // Cria uma referência com ID automático na coleção 'acolitos'
                        const novoDocRef = doc(collection(db, 'acolitos'))
                        await setDoc(novoDocRef, payload)
                        successCount++
                    } catch (err) {
                        console.error('Erro na linha:', row, err)
                        errorCount++
                    }
                }

                setLoading(false)
                setStatus(`Importação concluída! Sucesso: ${successCount} | Erros: ${errorCount}. Você já pode apagar esta página.`)
            },
            error: (error) => {
                setLoading(false)
                setStatus(`Erro ao ler CSV: ${error.message}`)
            }
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Migração para Firebase</h1>
                
                <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full mb-6 block border border-gray-300 rounded-lg p-2 text-sm text-gray-700"
                />
                
                <button 
                    onClick={handleImport} 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                >
                    {loading ? 'Importando...' : 'Importar Acólitos'}
                </button>

                {status && (
                    <div className="mt-6 p-4 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">
                        {status}
                    </div>
                )}
            </div>
        </div>
    )
}