const https = require('https');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.OPENAI_API_KEY;
    const { action, payload } = req.body;

    const options = {
        hostname: 'api.openai.com',
        path: action === 'dieta' ? '/v1/chat/completions' : '/v1/images/generations',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    };

    const body = JSON.stringify(action === 'dieta' ? {
        model: "gpt-4o",
        messages: [{ role: "user", content: `Dieta: ${payload.peso}kg, meta ${payload.meta}kg, ingredientes ${payload.ingredientes}. JSON format: {breakfast_title, breakfast_desc, breakfast_prot, lunch_title, lunch_desc, lunch_prot, dinner_title, dinner_desc, dinner_prot}` }],
        response_format: { type: "json_object" }
    } : {
        model: "dall-e-3",
        prompt: `Fitness portrait, ${payload.meses} months progress.`,
        n: 1, size: "1024x1024"
    });

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (action === 'dieta') res.status(200).json(JSON.parse(parsed.choices[0].message.content));
                else res.status(200).json({ imagemResultado: parsed.data[0].url });
            } catch (e) { res.status(500).json({ error: data }); }
        });
    });

    request.write(body);
    request.end();
};