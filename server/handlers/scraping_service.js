const axios = require('axios');
const cheerio = require('cheerio');

const scrapeWebsite = async (url) => {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const text = $('body').text().trim().replace(/\s+/g, '\n');
        return text;
    } catch (error) {
        console.error(`Error scraping website: ${error}`);
        throw error;
    }
};

module.exports = { scrapeWebsite };
