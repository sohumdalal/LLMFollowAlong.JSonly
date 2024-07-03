const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const EventSource = require('eventsource');
const openAIService = require('./handlers/openai_service.js');
const pineconeService = require('./handlers/pinecone_service.js');
const scrapingService = require('./handlers/scraping_service.js');
const { chunkText, addCorsHeaders} = require('./helperFunctions.js');

const app = express();
const PINECONE_INDEX_NAME = 'index237';

app.use(bodyParser.json());

// Middleware to handle CORS headers
app.use((req, res, next) => {
    addCorsHeaders(res);
    next();
});


// POST /handle-query
app.post('/api/handle-query', async (req, res) => {
    const { question, chatHistory } = req.body;

    // Get the most similar chunks from Pinecone
    const contextChunks = await pineconeService.getMostSimilarChunksForQuery(question, PINECONE_INDEX_NAME);

    // Build the payload to send to OpenAI
    const { headers, data } = openAIService.constructLLMPayload(question, contextChunks, chatHistory);

    // Send to OpenAI's LLM to generate a completion
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await axios.post(url, data, { headers, responseType: 'stream' });
    const eventSource = new EventSource(response.data);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    eventSource.onmessage = (event) => {
        if (event.data !== '[DONE]') {
            try {
                const text = JSON.parse(event.data).choices[0].delta.content;
                res.write(text);
            } catch (error) {
                console.error(`Error parsing event data: ${error}`);
                res.write('');
            }
        } else {
            res.end();
        }
    };

    eventSource.onerror = (error) => {
        console.error(`EventSource error: ${error}`);
        res.end();
    };
});

// POST /embed-and-store
app.post('/api/embed-and-store', async (req, res) => {
    const { url } = req.body;

    // Scrape the website and get text
    const urlText = await scrapingService.scrapeWebsite(url);
    const chunks = chunkText(urlText);

    // Embed chunks and upload to Pinecone
    await pineconeService.embedChunksAndUploadToPinecone(chunks, PINECONE_INDEX_NAME);

    res.json({ message: 'Chunks embedded and stored successfully' });
});

// POST /delete-index
app.post('/api/delete-index', async (req, res) => {
    await pineconeService.deleteIndex(PINECONE_INDEX_NAME);
    res.json({ message: `Index ${PINECONE_INDEX_NAME} deleted successfully` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
