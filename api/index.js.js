const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, payload } = req.body;

    if (action === 'dieta') {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: "Crie um plano de dieta com 3 refeições em formato JSON puro: {breakfast_title, breakfast_desc, breakfast_prot, lunch_title, lunch_desc, lunch_prot, dinner_title, dinner_desc, dinner_prot}."
        }, {
          role: "user",
          content: `Dieta para peso ${payload.peso}kg, meta ${payload.meta}kg. Ingredientes: ${payload.ingredientes}`
        }],
        response_format: { type: "json_object" }
      });
      return res.status(200).json(JSON.parse(completion.choices[0].message.content));
    }

    if (action === 'simulador') {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Fitness evolution portrait showing weight loss from ${payload.peso}kg to ${payload.meta}kg in ${payload.meses} months. High quality, realistic.`,
        n: 1,
        size: "1024x1024"
      });
      return res.status(200).json({ imagemResultado: response.data[0].url });
    }

    res.status(400).json({ error: "Ação desconhecida" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};