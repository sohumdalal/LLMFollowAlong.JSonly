const { Pinecone } = require('@pinecone-database/pinecone');
const { getEmbedding } = require('./openai_service.js');
require('dotenv').config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const EMBEDDING_DIMENSION = 1536;

const pc = new Pinecone({
    apiKey: PINECONE_API_KEY
});

const embedChunksAndUploadToPinecone = async (chunks, indexName) => {
    const existingIndexes = await pc.listIndexes();
    
    if (existingIndexes.includes(indexName)) {
        console.log("\nIndex already exists. Deleting index ...");
        await pc.deleteIndex({ indexName });
    }

    console.log("\nCreating a new index: ", indexName);
    await pc.createIndex({
        indexName,
        dimension: EMBEDDING_DIMENSION,
        metric: 'cosine',
        pods: 1,
        replicas: 1,
        shards: 1
    });

    console.log("\nEmbedding chunks using OpenAI ...");
    const embeddingsWithIds = await Promise.all(chunks.map(async (chunk, i) => {
        const embedding = await getEmbedding(chunk);
        return { id: i.toString(), values: embedding, metadata: { chunk_text: chunk } };
    }));

    console.log("\nUploading chunks to Pinecone ...");
    const index = pc.Index(indexName);
    await index.upsert({ vectors: embeddingsWithIds });

    console.log(`\nUploaded ${chunks.length} chunks to Pinecone index '${indexName}'.`);
};

const getMostSimilarChunksForQuery = async (query, indexName) => {
    console.log("\nEmbedding query using OpenAI ...");
    const questionEmbedding = await getEmbedding(query);

    console.log("\nQuerying Pinecone index ...");
    const index = pc.Index(indexName);
    const queryResults = await index.query({
        vector: questionEmbedding,
        topK: 3,
        includeMetadata: true
    });

    const contextChunks = queryResults.matches.map(match => match.metadata.chunk_text);
    return contextChunks;
};

const deleteIndex = async (indexName) => {
    console.log("Deleting index: ", indexName);
    const existingIndexes = await pc.list_indexes()

    if (existingIndexes.includes(indexName)) {
        console.log("Index exists. Deleting ...");
        await pc.deleteIndex({ indexName });
        console.log("Index deleted.");
    } else {
        console.log("Index not found.");
    }
};

module.exports = { embedChunksAndUploadToPinecone, getMostSimilarChunksForQuery, deleteIndex };
