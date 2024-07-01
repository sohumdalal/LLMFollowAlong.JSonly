const PROMPT_LIMIT = 3750;

function chunkText(text, chunkSize = 200) {
    const sentences = text.split('. ');
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= chunkSize) {
            currentChunk += sentence + '. ';
        } else {
            chunks.push(currentChunk);
            currentChunk = sentence + '. ';
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// buildPrompt.js
function buildPrompt(query, contextChunks) {
    const promptStart = (
        "Answer the question based on the context below. If you don't know the answer based on the context provided below, just respond with 'I don't know' instead of making up an answer. Don't start your response with the word 'Answer:'\n"
        "Context:\n"
    );

    const promptEnd = (
        `\n\nQuestion: ${query}\nAnswer:`
    );

    let prompt = "";

    for (let i = 1; i < contextChunks.length; i++) {
        const contextPrompt = `\n\n---\n\n${contextChunks.slice(0, i).join("\n\n---\n\n")}`;

        if (contextPrompt.length >= PROMPT_LIMIT) {
            prompt = `${promptStart}${contextChunks.slice(0, i - 1).join("\n\n---\n\n")}${promptEnd}`;
            break;
        } else if (i === contextChunks.length - 1) {
            prompt = `${promptStart}${contextChunks.join("\n\n---\n\n")}${promptEnd}`;
        }
    }

    return prompt;
}



// constructMessagesList.js
function constructMessagesList(chatHistory, prompt) {
    const messages = [{ role: "system", content: "You are a helpful assistant." }];

    for (const message of chatHistory) {
        if (message.isBot) {
            messages.push({ role: "system", content: message.text });
        } else {
            messages.push({ role: "user", content: message.text });
        }
    }

    messages[messages.length - 1].content = prompt;

    return messages;
}

module.exports = {chunkText, buildPrompt, constructMessagesList}

