/* module import */
const puppeteer = require('puppeteer');


/* customized module import */
const dotenv = require('dotenv');
dotenv.config();

/* create crawler */
const crawler = async () => {
    try {
        const browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--window--size=1920, 1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080
        });
        await page.goto('https://facebook.com/');

        const id = process.env.EMAIL;
        const password = process.env.PASSWORD;
        await page.evaluate((id, password) => {
            document.querySelector('#email').value = id;
            document.querySelector('#pass').value = password;
            document.querySelector('#loginbutton').click();
        }, id, password);
        // await page.close();
        // await browser.close();
    } catch(e) {
        console.error(e);
    }
}

crawler();