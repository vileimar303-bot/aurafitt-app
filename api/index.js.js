module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { action, payload } = req.body;
        const apiKey = process.env.OPENAI_API_KEY;

        if (action === 'dieta') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{
                        role: "system",
                        content: "Retorne APENAS um JSON (sem markdown) com as chaves: breakfast_title, breakfast_desc, breakfast_prot, lunch_title, lunch_desc, lunch_prot, dinner_title, dinner_desc, dinner_prot."
                    }, {
                        role: "user",
                        content: `Dieta para peso ${payload.peso}kg, meta ${payload.meta}kg. Ingredientes: ${payload.ingredientes}`
                    }],
                    response_format: { type: "json_object" }
                })
            });
            const data = await response.json();
            return res.status(200).json(JSON.parse(data.choices[0].message.content));
        }

        if (action === 'simulador') {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: `Fitness portrait, transformation, ${payload.meses} months progress.`,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const data = await response.json();
            return res.status(200).json({ imagemResultado: data.data[0].url });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};