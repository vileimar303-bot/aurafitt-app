module.exports = async (req, res) => {
    // Permite que o seu site converse com o servidor
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Método não permitido" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Chave da OpenAI (OPENAI_API_KEY) não encontrada na Vercel." });

    const { acao, ingredientes, refeicoes, meta, meses } = req.body;

    try {
        // ==========================================
        // 1. GERADOR DE DIETA (VIA CHATGPT)
        // ==========================================
        if (acao === 'gerar_dieta') {
            const prompt = `Crie uma dieta hiperproteica estrita. Refeições solicitadas: ${refeicoes}. Ingredientes disponíveis: ${ingredientes}. Responda como um nutricionista clínico, indo direto ao ponto do cardápio.`;
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return res.status(200).json({ result: data.choices[0].message.content });
        }

        // ==========================================
        // 2. SIMULADOR DE IMAGEM (VIA DALL-E)
        // ==========================================
        if (acao === 'gerar_projecao') {
            // A OpenAI gera um corpo baseado no texto (ela não faz deepfake do rosto)
            const promptImagem = `Professional fitness photography of an athletic transformation. A highly muscular, lean and shredded person representing a goal weight of ${meta}kg after ${meses} months of training. Gym setting, dramatic cinematic lighting, 8k resolution, photorealistic.`;
            
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: promptImagem,
                    n: 1,
                    size: "1024x1024"
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return res.status(200).json({ imageUrl: data.data[0].url });
        }

        return res.status(400).json({ error: "Comando desconhecido." });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};