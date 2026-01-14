
import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspect() {
    try {
        // Determine the redirect URL first or just hit the new page
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

        // First, hit the main new product page
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
            console.log('contentsNav HTML (truncated):');
            console.log(contentsNav.html()?.substring(0, 1000));

            console.log('Structure inside contentsNav:');
            contentsNav.children().each((i, el) => {
                console.log(`Child ${i}: tag=${el.tagName}, class=${$(el).attr('class')}, content=${$(el).text().substring(0, 50).replace(/\n/g, '')}`);
            });

            // Search for date like elements
            const dates = contentsNav.find('p, li, div').filter((i, el) => {
                return $(el).text().includes('発売');
            });
            console.log('Found elements with "発売":', dates.length);
            dates.each((i, el) => {
                if (i < 5) console.log(`Date item ${i}: ${$(el).text().trim()} | Href? ${$(el).find('a').attr('href')}`);
            });
        } else {
            console.log('.contentsNav NOT found. Listing all root classes:');
            $('body').children().each((i, el) => {
                if ($(el).attr('class')) console.log($(el).attr('class'));
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
