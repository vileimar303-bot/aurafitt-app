/**
 * AuraFitt AI - Cérebro com OpenAI (GPT-4o + DALL-E 3)
 */

const apiKey = process.env.OPENAI_API_KEY || ""; 

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    try {
        const { action, payload } = req.body;

        // DIETA COM GPT-4o
        if (action === 'dieta') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{
                        role: "system",
                        content: "Você é um nutricionista de elite. Retorne APENAS um JSON seguindo este esquema: {\"breakfast_title\": \"...\", \"breakfast_desc\": \"...\", \"breakfast_prot\": \"...\", \"lunch_title\": \"...\", \"lunch_desc\": \"...\", \"lunch_prot\": \"...\", \"dinner_title\": \"...\", \"dinner_desc\": \"...\", \"dinner_prot\": \"...\"}"
                    }, {
                        role: "user",
                        content: `Crie dieta hiperproteica com: ${payload.ingredientes}`
                    }],
                    response_format: { type: "json_object" }
                })
            });
            const data = await response.json();
            return res.status(200).json(JSON.parse(data.choices[0].message.content));
        }

        // SIMULADOR COM DALL-E 3
        if (action === 'simulador') {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: `Professional fitness transformation photo. A person who lost weight, looking healthier and muscular, maintaining natural facial features. Studio lighting, high definition.`,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const data = await response.json();
            return res.status(200).json({ success: true, imagemResultado: data.data[0].url });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};