const axios = require('axios');
const { buildPrompt, constructMessagesList } = require('../utils/helperFunctions');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';
const PROMPT_LIMIT = 3750;
const CHATGPT_MODEL = 'gpt-4-1106-preview';

const getEmbedding = async (chunk) => {
    const url = 'https://api.openai.com/v1/embeddings';
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
    };
    const data = {
        model: OPENAI_EMBEDDING_MODEL,
        input: chunk
    };

    try {
        const response = await axios.post(url, data, { headers });
        const embedding = response.data.data[0].embedding;
        return embedding;
    } catch (error) {
        console.error(`Error getting embedding: ${error}`);
        throw error;
    }
};

const constructLLMPayload = (question, contextChunks, chatHistory) => {
    const prompt = buildPrompt(question, contextChunks);
    console.log("\n==== PROMPT ====\n");
    console.log(prompt);

    const messages = constructMessagesList(chatHistory, prompt);

    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
    };

    const data = {
        model: CHATGPT_MODEL,
        messages,
        temperature: 1,
        max_tokens: 1000,
        stream: true
    };

    return { headers, data };
};

module.exports = { getEmbedding, constructLLMPayload };
