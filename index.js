/* module import */
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');


/* customized module import */
const add_to_sheet = require('./add_to_sheet');


/* file import */
const workbook = xlsx.readFile('./xlsx/data.xlsx');
const ws = workbook.Sheets.영화목록;
const records = xlsx.utils.sheet_to_json(ws);


/* folder handling */
fs.readdir('poster', (err) => {
    if(err) {
        console.error('poster 폴더가 없어 poster 폴더를 생성합니다.');
        fs.mkdirSync('poster');
    }
});

fs.readdir('screenshot', (err) => {
    if(err) {
        console.error('screenshot 폴더가 없어 poster 폴더를 생성합니다.');
        fs.mkdirSync('screenshot');
    }
})


/* create crawler */
const crawler = async () => {
    try {
        const browser = await puppeteer.launch({ 
            headless: process.env.NODE.ENV === 'production',
            args: ['--window--size=1920, 1080']
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080
        });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36");
        add_to_sheet(ws, 'C1', 's', '평점');

        // 탭을 새로 안 띄우고 한 페이지(page)에서 링크를 넘나들 것이다.
        for(const [idx, record] of records.entries()) {
            await page.goto(record.링크);
            
            // const 태그핸들러 = await page.$(선택자);
            const result = await page.evaluate(() => {
                // 이 내부에서는 document.querySelector 문법을 쓸 수 있다.
                const scoreEl = document.querySelector('.score.score_left .star_score');
                let score = '';
                if(scoreEl) {
                    score = scoreEl.textContent;
                }

                const imgEl = document.querySelector('.poster img');
                let img = '';
                if(imgEl) {
                    img = imgEl.src;
                }

                return { score, img };
            });
            
            if(result.score) {
                console.log(record.제목, '평점', result.score.trim());
                const newCell = 'C' + (idx + 2);
                add_to_sheet(ws, newCell, 'n', parseFloat(result.score.trim()));
            }

            if(result.img) {
                console.log("이미지 소스 : ", result.img.split('?')[0]);

                await page.screenshot({
                    path: `screenshot/${record.제목}.png`,
                    fullPage: true
                });

                // 이미지 주소로 get 요청을 보낸다. 그 응답 결과가 arraybuffer 형태로 imgResult에 담긴다.
                const imgResult = await axios.get(result.img.split('?')[0], {
                    responseType: 'arraybuffer'
                });

                // 현재 index.js 폴더의 poster 폴더 내에 해당 파일 명으로 이미지 저장하기
                fs.writeFileSync(`poster/${record.제목}.jpg`, imgResult.data);
            }

            // 페이지 로드 후 3초간 대기한다
            await page.waitFor(3000);
        }
            
        // 한 페이지에 대해 크롤링 처리를 완료했으면 페이지를 닫아준다.
        await page.close();
        
        // 브라우저 종료
        await browser.close();

        // 엑셀 파일에 써 넣기
        xlsx.writeFile(workbook, './xlsx/result.xlsx')
    } catch(e) {
        console.error(e);
    }
}

crawler();