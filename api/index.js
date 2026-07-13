module.exports = async (req, res) => {
    // Configuração de segurança (CORS) para a Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Use POST" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Chave da OpenAI (OPENAI_API_KEY) não configurada na Vercel." });

    const { acao, ingredientes, meta, peso } = req.body;

    try {
        // ==========================================
        // 1. GERADOR DE DIETA (VIA CHATGPT TEXTO)
        // ==========================================
        if (acao === 'gerar_dieta') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{
                        role: "user",
                        content: `Crie uma dieta hiperproteica com base nestes ingredientes: ${ingredientes}. Responda APENAS em formato JSON com o seguinte formato exato: {"choices": [{"message": {"content": "Escreva a dieta aqui com quebras de linha"}}]}`
                    }],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            if (data.error) return res.status(400).json({ error: data.error.message });
            return res.status(200).json(data);
        }

        // ==========================================
        // 2. SIMULADOR DE EVOLUÇÃO (VIA DALL-E 3)
        // ==========================================
        if (acao === 'gerar_projecao') {
            // Instrução para a IA gerar a foto realista
            const promptImagem = `A highly realistic professional photography of a fitness transformation. A person standing with an athletic, lean and muscular body, representing a target weight of ${meta}kg. Dramatic gym lighting, 8k resolution, cinematic.`;
            
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
            if (data.error) return res.status(400).json({ error: data.error.message });
            
            // Retorna o Link da imagem gerada pela Inteligência Artificial
            return res.status(200).json({ imageUrl: data.data[0].url });
        }

        return res.status(400).json({ error: "Ação não reconhecida." });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};