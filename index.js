const xlsx = require('xlsx');
const workbook = xlsx.readFile('./xlsx/data.xlsx');

// workbook.Sheets는 해당 엑셀 파일 내 시트 목록을 반환한다.
// '영화목록'은 영화 정보를 저장한 시트 이름이다.
// sheet_to_json를 통해 해당 시트의 정보들을 json 형태로 가공해 리스트로 반환한다.
const ws = workbook.Sheets.영화목록;
const records = xlsx.utils.sheet_to_json(ws);

records.forEach((record, idx) => {
    console.log(record.제목, record.링크);
});