const { OpenAI } = require('openai');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (req.method === 'POST') {
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: "Crie uma dieta hiperproteica usando estes ingredientes: " + req.body.ingredientes }],
                response_format: { type: "json_object" }
            });
            res.status(200).json(JSON.parse(completion.choices[0].message.content));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).send("Method Not Allowed");
    }
};