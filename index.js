/* module import */
const puppeteer = require('puppeteer');


/* customized module import */
const dotenv = require('dotenv');
dotenv.config();


/* create crawler */
const crawler = async () => {
    try {
        let browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--window--size=1920, 1080'] 
        });
        let page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080
        });
        await page.goto('http://spys.one/en/free-proxy-list/');
        
        const proxies = await page.evaluate(() => {
            const ips = Array.from(document.querySelectorAll('tr > td:nth-child(1) > .spy14')).map((x) => {
                let v = x.textContent
                let ip = v.split(':')[0].split('d')[0];
                let port = v.split(':')[2];

                return ip + ':' + port;
            });
            const protocols = Array.from(document.querySelectorAll('tr > td:nth-child(2) > a > .spy1')).map((x) => x.textContent);
            const latencies = Array.from(document.querySelectorAll('tr > td:nth-child(6) > .spy1')).map((x) => x.textContent);
        
            return ips.map((x, i) => {
                return {
                    ip: x,
                    protocol: protocols[i],
                    latency: latencies[i]
                }
            });
        });

        // HTTP 프로토콜을 사용하고 지연 시간이 작은 순서대로 정렬한다.
        const filtered = proxies.filter((x) => x.protocol.startsWith("HTTP")).sort((a, b) => a.latency - b.latency);
        
        // 페이지와 브라우저를 닫고
        await page.close();         
        await browser.close();      

        // 다시 브라우저를 킨다.
        browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--window--size=1920, 1080', `--proxy-server=${filtered[0].ip}`] 
        });
        page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080
        });
    } catch(e) {
        console.error(e);
    }
}

crawler();