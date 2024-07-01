const PineconeClient = require('@pinecone-database/pinecone-client');
const { getEmbedding } = require('./openAIHandler');
require('dotenv').config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const EMBEDDING_DIMENSION = 1536;

const pinecone = new PineconeClient();
pinecone.init({ apiKey: PINECONE_API_KEY });

const embedChunksAndUploadToPinecone = async (chunks, indexName) => {
    const existingIndexes = await pinecone.listIndexes();
    
    if (existingIndexes.includes(indexName)) {
        console.log("\nIndex already exists. Deleting index ...");
        await pinecone.deleteIndex({ indexName });
    }

    console.log("\nCreating a new index: ", indexName);
    await pinecone.createIndex({
        indexName,
        dimension: EMBEDDING_DIMENSION,
        metric: 'cosine',
        pods: 1,
        replicas: 1,
        shards: 1
    });

    const index = pinecone.Index(indexName);

    console.log("\nEmbedding chunks using OpenAI ...");
    const embeddingsWithIds = await Promise.all(chunks.map(async (chunk, i) => {
        const embedding = await getEmbedding(chunk);
        return { id: i.toString(), values: embedding, metadata: { chunk_text: chunk } };
    }));

    console.log("\nUploading chunks to Pinecone ...");
    await index.upsert({ vectors: embeddingsWithIds });

    console.log(`\nUploaded ${chunks.length} chunks to Pinecone index '${indexName}'.`);
};

const getMostSimilarChunksForQuery = async (query, indexName) => {
    console.log("\nEmbedding query using OpenAI ...");
    const questionEmbedding = await getEmbedding(query);

    console.log("\nQuerying Pinecone index ...");
    const index = pinecone.Index(indexName);
    const queryResults = await index.query({
        vector: questionEmbedding,
        topK: 3,
        includeMetadata: true
    });

    const contextChunks = queryResults.matches.map(match => match.metadata.chunk_text);
    return contextChunks;
};

const deleteIndex = async (indexName) => {
    console.log("I am in the delete index function within pinecone");
    const existingIndexes = await pinecone.listIndexes();

    if (existingIndexes.includes(indexName)) {
        console.log("conditional met");
        await pinecone.deleteIndex({ indexName });
        console.log("index deleted");
    }
};

module.exports = { embedChunksAndUploadToPinecone, getMostSimilarChunksForQuery, deleteIndex };
