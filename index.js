/* module import */
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');


/* create crawler */
const crawler = async () => {
    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('https://unsplash.com/');
        let result = [];
        
        // 이미지는 30개까지 긁어오기
        while(result.length <= 30) {
            const srcs = await page.evaluate(() => {
                window.scrollTo(0, 0);      // 초기 스크롤 맨 위로 옮기기
                let imgs = [];
                const imgEls = document.querySelectorAll('.nDTlD');
                
                if(imgEls.length) {
                    imgEls.forEach((v) => {
                        let src = v.querySelector('img._2zEKz');
    
                        if(src) {
                            imgs.push(src.src);
                        }
    
                        // 로딩된 이미지를 다운 받았으면 엘리먼트를 지운다.
                        v.parentElement.removeChild(v);
                    });
                }
    
                // 자바스크립트를 이용해 스크롤 내리기. 세로로 500px 내리기.
                // 그래야 지운 엘리먼트 자리에 새로운 이미지가 로딩된다.
                window.scrollBy(0, 100);
                setTimeout(() => {
                    window.scrollBy(0, 500);
                }, 500);
    
                return imgs;
            });
            result = result.concat(srcs);
            await page.waitForSelector('.nDTlD');   // 해당 클래스의 태그가 로딩되길 기다린다.
            console.log('새 이미지 태그 로딩 완료!');
        }
        
        console.log(result);
    } catch(e) {
        console.error(e);
    }
}

crawler();