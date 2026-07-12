const https = require('https');

module.exports = async (req, res) => {
    // Configuração de CORS para aceitar requisições do teu front-end
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Segurança: Se não houver chave API, o servidor falha antes de tentar conectar
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('Erro: Chave OPENAI_API_KEY não definida.');
        return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    const { action, payload } = req.body;
    console.log(`Ação recebida: ${action}`);

    const options = {
        hostname: 'api.openai.com',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    };

    // Define o endpoint e o corpo da requisição com base na ação
    let body;
    if (action === 'dieta') {
        options.path = '/v1/chat/completions';
        body = JSON.stringify({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: `Dieta para peso ${payload.peso}kg, meta ${payload.meta}kg. Ingredientes: ${payload.ingredientes}. Formato JSON: {"breakfast_title": "...", "breakfast_desc": "...", "breakfast_prot": "...", "lunch_title": "...", "lunch_desc": "...", "lunch_prot": "...", "dinner_title": "...", "dinner_desc": "...", "dinner_prot": "..."}`
            }],
            response_format: { type: 'json_object' }
        });
    } else if (action === 'simulador') {
        options.path = '/v1/images/generations';
        body = JSON.stringify({
            model: 'dall-e-3',
            prompt: `Fitness portrait, ${payload.meses} months progress, transformation from ${payload.peso}kg to ${payload.meta}kg. Highly realistic.`,
            n: 1,
            size: '1024x1024'
        });
    } else {
        return res.status(400).json({ error: 'Ação desconhecida' });
    }

    // Faz a chamada direta para a OpenAI usando o módulo nativo 'https'
    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                // Verifica se a OpenAI retornou um erro
                if (parsed.error) {
                    console.error('Erro da OpenAI:', parsed.error);
                    // Retorna um erro 500 com a mensagem da OpenAI (substituindo o "Erro interno")
                    return res.status(500).json({ error: `Falha na IA: ${parsed.error.message}` });
                }
                
                // Se a ação for dieta, certifica-te de que o conteúdo é um JSON válido
                if (action === 'dieta') {
                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) {
                        const dietaJson = JSON.parse(parsed.choices[0].message.content);
                        res.status(200).json(dietaJson);
                    } else {
                        throw new Error('Formato de resposta da OpenAI inválido para dieta.');
                    }
                } else {
                    // Se a ação for simulador, retorna o URL da imagem gerada
                    if (parsed.data && parsed.data[0] && parsed.data[0].url) {
                        res.status(200).json({ imagemResultado: parsed.data[0].url });
                    } else {
                        throw new Error('Formato de resposta da OpenAI inválido para imagem.');
                    }
                }
            } catch (e) {
                console.error('Erro ao processar resposta:', e);
                res.status(500).json({ error: `Erro ao processar dados: ${e.message}` });
            }
        });
    });

    request.on('error', (e) => {
        console.error('Erro na requisição https:', e);
        res.status(500).json({ error: `Falha na comunicação com a IA: ${e.message}` });
    });

    request.write(body);
    request.end();
};
