module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        const { acao, ingredientes, meta, meses } = req.body;

        if (acao === 'gerar_dieta') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: `Crie dieta hiperproteica. Refeições: café, almoço, jantar. Ingredientes: ${ingredientes}. Responda como nutricionista.` }]
                })
            });
            const data = await response.json();
            return res.status(200).json({ result: data.choices[0].message.content });
        }

        if (acao === 'gerar_projecao') {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: `Fitness transformation, goal weight ${meta}kg, ${meses} months progress.`,
                    n: 1, size: "1024x1024"
                })
            });
            const data = await response.json();
            return res.status(200).json({ imageUrl: data.data[0].url });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};