/**
 * AuraFitt AI - Cérebro do Servidor Atualizado (api/index.js)
 */

const apiKey = process.env.GEMINI_API_KEY || ""; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

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
            return res.status(500).json({ error: 'Chave GEMINI_API_KEY ausente na Vercel.' });
        }

        // =========================================================================
        // FUNCIONALIDADE 1: GERADOR DE DIETA (MODELO ATUALIZADO 1.5-FLASH)
        // =========================================================================
        if (action === 'dieta') {
            const { ingredientes, peso, meta, idade, altura } = payload;

            const systemPrompt = `Atue como um Nutricionista Clínico e Esportivo de Elite da equipe AuraFitt. 
            Você deve criar um plano de refeições focado em emagrecimento saudável, alta saciedade e máxima preservação de massa muscular. 
            Calcule os macronutrientes de forma aproximada baseado no peso corporal de ${peso}kg, altura ${altura}m e meta de ${meta}kg.
            
            Gere um cardápio com 3 refeições utilizando primordialmente os ingredientes informados: "${ingredientes}".
            
            Retorne a resposta estritamente no seguinte formato JSON, sem marcações markdown:
            {
                "breakfast_title": "Nome do café da manhã",
                "breakfast_desc": "Instruções de preparo.",
                "breakfast_prot": "Carb: ~Xg | Prot: Yg",
                "lunch_title": "Nome do almoço",
                "lunch_desc": "Instruções de montagem.",
                "lunch_prot": "Carb: ~Xg | Prot: Yg",
                "dinner_title": "Nome do jantar",
                "dinner_desc": "Instruções de preparo.",
                "dinner_prot": "Carb: ~Xg | Prot: Yg"
            }`;

            // Mudamos para v1beta e o modelo estável gemini-1.5-flash
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
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
                throw new Error(`Erro na IA de Dieta: ${errText}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            return res.status(200).json(JSON.parse(textResponse));
        }

        // =========================================================================
        // FUNCIONALIDADE 2: SIMULADOR DE IMAGEM
        // =========================================================================
        if (action === 'simulador') {
            const { fotoBase64, peso, meta, meses, cintura } = payload;

            if (!fotoBase64) {
                return res.status(400).json({ error: 'A foto de referência é obrigatória.' });
            }

            const promptImagem = `Professional fitness and health evolution analysis infographic portrait. 
            Highly realistic, clinically precise depiction of a man's body and face transforming over ${meses} months. 
            Starting weight is ${peso}kg going down to target of ${meta}kg. Projected waist is around ${cintura}cm.
            Show reduction of visceral fat, defined jawline, toned abdominal muscles. High-end clinic design aesthetic.`;

            // Mudamos para o modelo estável de imagem multimodal
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erro na IA de Imagem: ${errText}`);
            }

            const data = await response.json();
            const base64ImageOut = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

            if (!base64ImageOut) {
                throw new Error("A IA processou o pedido mas não retornou nenhuma imagem de saída.");
            }

            return res.status(200).json({
                success: true,
                imagemResultado: `data:image/png;base64,${base64ImageOut}`
            });
        }

        return res.status(400).json({ error: 'Ação inválida.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno: ' + error.message });
    }
};