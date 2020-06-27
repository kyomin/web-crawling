/* module import */
const parse = require('csv-parse/lib/sync');
const stringify = require('csv-stringify/lib/sync');
const fs = require('fs');
const puppeteer = require('puppeteer');

/* file import */
const csv = fs.readFileSync('./csv/data.csv');
const records = parse(csv.toString('utf-8'));

// 에러 처리 : 하나의 async 메소드 당 하나의 try ~ catch문을 넣어준다.
const crawler = async () => {
    try {
        const result = [];
        const browser = await puppeteer.launch({ headless: process.env.NODE.ENV === 'production' });
        
        // Promise.all에 의해 각 페이지를 동시에 처리를 할 것이다.
        await Promise.all(records.map(async (record, idx) => {
            try {
                // 페이지 객체 생성
                const page = await browser.newPage();
                
                // 해당 링크의 페이지 띄우기
                await page.goto(record[1]);
                
                // 해당 클래스로 특정하여 태그를 찾는다.
                const scoreEl = await page.$('.score.score_left .star_score');

                // 태그를 제대로 찾았으면
                if(scoreEl) {
                    // 그 내부의 텍스트 컨텐츠를 뱉어낸다.
                    const text = await page.evaluate(tag => tag.textContent, scoreEl);
                    console.log(record[0], '평점', text.trim());

                    // 결과들 배열화! 인덱스를 이용해 순서를 보장해주고 있다.
                    result[idx] = [record[0], record[1], text.trim()];     
                }

                // 페이지 로드 후 3초간 대기한다
                await page.waitFor(3000);

                // 한 페이지에 대해 크롤링 처리를 완료했으면 페이지를 닫아준다.
                await page.close();
            } catch(e) {
                console.error(e);
            }
        }));
        
        // 브라우저 종료
        await browser.close();

        // 결과 배열을 csv 파일에 다시 써 넣어준다.
        const str = stringify(result);
        fs.writeFileSync('./csv/result.csv', str, 'utf-8');
    } catch(e) {
        console.error(e);
    }
}

crawler();