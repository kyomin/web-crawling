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

        // input 태그에 타이핑한다.
        await page.type('#email', process.env.EMAIL);
        await page.type('#pass', process.env.PASSWORD);

        // 마우스를 로그인 버튼 위에 올린다.
        await page.hover('#loginbutton');

        // 3초간 기다린다.
        await page.waitFor(3000);

        // 로그인 버튼을 클릭한다.
        await page.click('#loginbutton');
    } catch(e) {
        console.error(e);
    }
}

crawler();