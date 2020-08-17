/* module import */
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const fs = require('fs');
const axios = require('axios');
const db = require('./models');

dotenv.config();

/* constants handling */
const MAX_NUM_OF_IMAGES = 1000;
const SEARCH_WORD = '수원맛집';
const URL = `https://www.instagram.com/`

/* folder handling */
fs.readdir('image', (err) => {
    if(err) {
        console.error('image 폴더가 없어 image 폴더를 생성합니다.');
        fs.mkdirSync('image');
    }
});

/* create crawler */
const crawler = async () => {
    try {
        await db.sequelize.sync();

        const browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--window--size=1920, 1080', '--disable-notifications'] 
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080
        });
        await page.goto(URL);
        
        // 페이스북으로 로그인 버튼이 로딩될 때까지 기다리고 클릭한다.
        await page.waitForSelector('button.sqdOP.yWX7d.y3zKF');     
        await page.click('button.sqdOP.yWX7d.y3zKF'); 

        // 페이스북 로그인 페이지가 로딩되는 것을 기다린다.               
        await page.waitForNavigation();

        // 페이스북 로그인 페이지의 input 태그에 계정 정보를 타이핑한다.
        await page.waitForSelector('#email');
        await page.type('#email', process.env.EMAIL);
        await page.type('#pass', process.env.PASSWORD);

        // 로그인 버튼을 클릭한다.
        await page.waitForSelector('#loginbutton');
        await page.click('#loginbutton');

        // 페이스북으로 로그인이 완료되면 다시 인스타 페이지로 넘어가므로!
        await page.waitForNavigation();

        await page.waitForSelector('.zGtbP.IPQK5.VideM');

        // 페이지 새로고침
        await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

        // 태그 입력 과정!
        await page.waitForSelector('input.XTCLo.x3qfX');
        await page.click('input.XTCLo.x3qfX');
        await page.keyboard.type(SEARCH_WORD);
        await page.waitForSelector('.drKGC');
        const href = await page.evaluate(() => {
            return document.querySelector('div.drKGC > div.fuqBx > a:nth-child(1)').href;
        });
        await page.goto(href);

        /* 스크롤하면서 크롤링하기 */
        let result = [];
        let prevPostId = '';

        // 맨 처음의 인기 게시물 9개를 긁어온다.
        await page.waitForSelector('div.Nnq7C.weEfm');
        const popularPosts = await page.evaluate(() => {
            let imgs = document.querySelector('div.EZdmt');
            imgs = imgs.querySelectorAll('div.Nnq7C.weEfm');

            let container = [];

            for(let i = 0; i < imgs.length; i++) {
                let temp = imgs[i].children;
                temp = Array.from(imgs);

                temp.forEach(async (img) => {
                    const image = img.querySelector('img').src;
                    const postId = img.querySelector('a').href.split('/').slice(-2, -1)[0];
                    
                    container.push({
                        postId,
                        image
                    });
                });
            }

            return container;
        });

        popularPosts.forEach(async (post) => {
            if(post.postId) {
                if(post.postId !== prevPostId) {
                    // 현재 삽입 중인 배열에 기존 원소가 있는지 확인한다.
                    if(!result.find( (x) => x.postId === post.postId) ) {
                        // DB에도 저장이 되었는지 확인해본다.
                        const exist = await db.Instagram.findOne({ where: {postId: post.postId} });
                        if(!exist) {
                            result.push(post);
                        }
                    }

                    prevPostId = post.postId;
                }
            }
        });

        await page.evaluate(() => {
            window.scrollBy(0, 1200);
        });

        // 상수로 지정한 최대 이미지 크롤링 개수만큼 긁어오기
        while(result.length < MAX_NUM_OF_IMAGES) {
            console.log('===========================================');
            console.log('현재 담은 데이터 길이 : ', result.length);
            console.log('===========================================');
            await page.waitForSelector('div.Nnq7C.weEfm');
            const posts = await page.evaluate(() => {
                let article = document.querySelector('article.KC1QD');
                let divs = article.querySelectorAll('div');
                let imgContainer = divs[44];                // 수시로 변하므로 주의! (44 | 45 | 46 | 48) => 컨테이너 다 선택되는 거! 
                let imgs = imgContainer.querySelector('div.Nnq7C.weEfm');

                imgs = imgs.children;
                imgs = Array.from(imgs);

                let container = [];
    
                imgs.forEach(async (img) => {
                    const image = img.querySelector('img').src;
                    const postId = img.querySelector('a').href.split('/').slice(-2, -1)[0];
                    
                    container.push({
                        postId,
                        image
                    });
                });

                return container;
            });

            posts.forEach(async (post) => {
                if(post.postId) {
                    if(post.postId !== prevPostId) {
                        // 현재 삽입 중인 배열에 기존 원소가 있는지 확인한다.
                        if(!result.find( (x) => x.postId === post.postId) ) {
                            // DB에도 저장이 되었는지 확인해본다.
                            const exist = await db.Instagram.findOne({ where: {postId: post.postId} });
                            if(!exist) {
                                result.push(post);
                            }
                        }

                        prevPostId = post.postId;
                    }
                }
            });

            await page.evaluate(() => {
                window.scrollBy(0, 800);
            });
        }

        // 로컬 폴더에 이미지 저장 및 DB에 데이터 저장!
        await Promise.all(result.map(async (r, i) => {
            if(r.image) {
                const imgResult = await axios.get(r.image, {
                    responseType: 'arraybuffer'
                });

                fs.writeFileSync(`image/${r.postId}.jpg`, imgResult.data)
            }

            return db.Instagram.create({
                postId: r.postId,
                image: r.image
            });
        }));
    } catch(e) {
        console.error(e);
    }
}

crawler();