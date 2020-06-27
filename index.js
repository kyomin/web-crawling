/* module import */
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const add_to_sheet = require('./add_to_sheet');

/* file import */
const workbook = xlsx.readFile('./xlsx/data.xlsx');
const ws = workbook.Sheets.영화목록;
const records = xlsx.utils.sheet_to_json(ws);

// 에러 처리 : 하나의 async 메소드 당 하나의 try ~ catch문을 넣어준다.
const crawler = async () => {
    try {
        const browser = await puppeteer.launch({ headless: process.env.NODE.ENV === 'production' });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36");
        add_to_sheet(ws, 'C1', 's', '평점');

        // 탭을 새로 안 띄우고 한 페이지(page)에서 링크를 넘나들 것이다.
        for(const [idx, record] of records.entries()) {
            await page.goto(record.링크);
            
            // const 태그핸들러 = await page.$(선택자);
            const text = await page.evaluate(() => {
                // 이 내부에서는 document.querySelector 문법을 쓸 수 있다.
                const score = document.querySelector('.score.score_left .star_score');

                if(score) {
                    return score.textContent;
                }
            });
            
            if(text) {
                const newCell = 'C' + (idx + 2);
                add_to_sheet(ws, newCell, 'n', parseFloat(text.trim()));
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