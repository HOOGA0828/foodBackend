
import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspect() {
    try {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

        console.log('Fetching https://www.lawson.co.jp/recommend/new/');
        const response = await axios.get('https://www.lawson.co.jp/recommend/new/', {
            headers: { 'User-Agent': userAgent },
            maxRedirects: 5
        });

        const finalUrl = response.request.res.responseUrl;
        console.log('Final URL:', finalUrl);

        const $ = cheerio.load(response.data);

        const contentsNav = $('.contentsNav');
        console.log('contentsNav exists:', contentsNav.length > 0);

        if (contentsNav.length > 0) {
            // Output the raw HTML structure of contentsNav for analysis
            console.log('Structure inside contentsNav:');

            contentsNav.find('li').each((i, el) => {
                const text = $(el).text().trim().replace(/\s+/g, ' ');
                const href = $(el).find('a').attr('href');
                const isActive = $(el).hasClass('current') || $(el).attr('id') === 'current';
                console.log(`Item ${i}: Text="${text}" Href="${href}" Active=${isActive}`);
            });

        } else {
            console.log('.contentsNav NOT found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
