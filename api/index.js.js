/**
 * AuraFitt AI - Cérebro do Servidor (api/index.js)
 * -------------------------------------------------------------------------
 * Este código roda em segredo nos servidores da Vercel.
 * Ele recebe as fotos e ingredientes do seu 'index.html' e envia com segurança
 * para as APIs de Inteligência Artificial do Google Gemini.
 */

// A chave de API do Google fica protegida aqui (Vercel lê das variáveis de ambiente)
const apiKey = process.env.GEMINI_API_KEY || ""; 

// Função para fazer o sistema esperar (usada nas tentativas de re-conexão)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Função de requisição com tentativas automáticas (Retry)
 * Se a internet falhar ou o Google estiver sobrecarregado, ele tenta de novo até 5 vezes.
 */
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
    try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if ((response.status === 429 || response.status >= 500) && retries > 0) {
            await sleep(delay);
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            await sleep(delay);
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}

module.exports = async (req, res) => {
    // Configurações de segurança (CORS) para permitir que seu index.html acesse este arquivo
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde requisições de teste de conexão do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { action, payload } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Ação não especificada.' });
        }

        if (!apiKey) {
            return res.status(500).json({ error: 'Configuração incompleta: Chave GEMINI_API_KEY não foi encontrada na Vercel.' });
        }

        // =========================================================================
        // AÇÃO 1: GERADOR DE DIETA (AURA DIETA)
        // =========================================================================
        if (action === 'dieta') {
            const { ingredientes, peso, meta, idade, altura } = payload;

            const systemPrompt = `Atue como um Nutricionista Clínico e Esportivo de Elite da equipe AuraFitt. 
            Você deve criar um plano de refeições focado em emagrecimento saudável, alta saciedade (ideal para usuários de co-agonistas como Mounjaro) e máxima preservação de massa muscular. 
            Calcule os macronutrientes de forma aproximada baseado no peso corporal de ${peso}kg, altura ${altura}m e meta de ${meta}kg.
            
            Gere um cardápio com 3 refeições hiperproteicas utilizando primordialmente os ingredientes informados pelo usuário: "${ingredientes}".
            
            Retorne a resposta estritamente no seguinte formato JSON, sem marcações de markdown como \`\`\`json:
            {
                "breakfast_title": "Nome criativo do café da manhã",
                "breakfast_desc": "Instruções fáceis e rápidas de preparo.",
                "breakfast_prot": "Carb: ~Xg | Prot: Yg",
                "lunch_title": "Nome do almoço",
                "lunch_desc": "Instruções de montagem do prato principal.",
                "lunch_prot": "Carb: ~Xg | Prot: Yg",
                "dinner_title": "Nome do jantar leve",
                "dinner_desc": "Instruções de preparo fáceis para a noite.",
                "dinner_prot": "Carb: ~Xg | Prot: Yg"
            }`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            
            const response = await fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erro na API de Dieta do Gemini: ${errText}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            return res.status(200).json(JSON.parse(textResponse));
        }

        // =========================================================================
        // AÇÃO 2: SIMULADOR DE IMAGEM (AURA EVOLUÇÃO)
        // =========================================================================
        if (action === 'simulador') {
            const { fotoBase64, peso, meta, meses, cintura } = payload;

            if (!fotoBase64) {
                return res.status(400).json({ error: 'A foto de referência é obrigatória.' });
            }

            const promptImagem = `Professional fitness and health evolution analysis infographic portrait. 
            Highly realistic, clinically precise depiction of a man's body and face transforming over ${meses} months. 
            Starting weight is ${peso}kg going down to target of ${meta}kg. Projected waist is around ${cintura}cm.
            Show reduction of visceral fat, highly defined jawline, toned abdominal muscles, and an athletic, healthy posture. 
            Preserve the exact facial features, skin tone, and hair of the original subject. High-end clinic design aesthetic.`;

            // Modelo oficial do Gemini configurado para receber imagem e devolver imagem modificada
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

            // Remove o cabeçalho do base64 (ex: 'data:image/png;base64,') se o navegador enviar
            const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, "");

            const response = await fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: promptImagem },
                                {
                                    inlineData: {
                                        mimeType: "image/png",
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseModalities: ["IMAGE"]
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erro na API de Imagem do Gemini: ${errText}`);
            }

            const data = await response.json();
            const base64ImageOut = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

            if (!base64ImageOut) {
                throw new Error("O Google processou a sua imagem mas não conseguiu devolver o resultado. Verifique se a foto de rosto está clara e de frente.");
            }

            return res.status(200).json({
                success: true,
                imagemResultado: `data:image/png;base64,${base64ImageOut}`
            });
        }

        return res.status(400).json({ error: 'Ação inválida.' });

    } catch (error) {
        console.error("Erro interno no servidor AuraFitt:", error);
        return res.status(500).json({ error: error.message });
    }
};