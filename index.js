const parse = require('csv-parse/lib/sync');
const fs = require('fs');   // 파일 핸들링을 위한 모듈

// 파일을 읽어들여 csv 변수에 담는다.
// 형식이 버퍼이기 때문에 문자열로 바꿔주는 작업이 필요하다.
// parse에 의해 콤마와 줄바꿈을 기준으로 2차원 배열로 만들어 records에 저장해 준다.
const csv = fs.readFileSync('./csv/data.csv');
const records = parse(csv.toString('utf-8'));       

records.forEach((record, idx) => {
    console.log(idx, record);
});