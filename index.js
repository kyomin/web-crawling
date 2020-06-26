/* module import */
const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');

/* file import */
const workbook = xlsx.readFile('./xlsx/data.xlsx');

// workbook.Sheets는 해당 엑셀 파일 내 시트 목록을 반환한다.
// '영화목록'은 영화 정보를 저장한 시트 이름이다.
// sheet_to_json를 통해 해당 시트의 정보들을 json 형태로 가공해 리스트로 반환한다.
const ws = workbook.Sheets.영화목록;
const records = xlsx.utils.sheet_to_json(ws);

const crawler = async () => {
    await Promise.all(records.map(async (record) => {
        const response = await axios.get(record.링크);
        if(response.status === 200) {       // 응답이 성공한 경우
            const html = response.data;     // 클라이언트 view로 요청한 get은 html 응답이다.
            const $ = cheerio.load(html);   // 이를 통해 html 태그들에 접근할 수 있다.

            // 태그의 클래스로 선택을 특정한다.
            // 해당 조건의 태그 내에서 text만 추출한다.
            const text = $('.score.score_left .star_score').text();
            console.log(record.제목, '평점', text.trim());
        }
    }));
}

crawler();