/* module import */
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const db = require('./models');

dotenv.config();


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
        await page.goto('https://www.instagram.com/');
        
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


        // 스크롤 하면서 크롤링하기
        let result = [];
        let prevPostId = '';
        
        // 10개까지만 긁어온다.
        while(result.length < 10) {
            const newPost = await page.evaluate(() => {
                const article = document.querySelector('article:nth-child(1)');
                const postId = article && article.querySelector('.c-Yi7') && article.querySelector('.c-Yi7').href.split('/').slice(-2, -1)[0];
                const img = article && article.querySelector('div.KL4Bh img') && article.querySelector('div.KL4Bh img').src;
                
                return {
                    postId, img
                }
            });

            if(newPost.postId && newPost.img) {
                if(newPost.postId !== prevPostId) {
                    if(!result.find((x) => x.postId === newPost.postId)) {
                        // DB에도 저장이 되어있는지 확인해본다.
                        const exist = await db.Instagram.findOne({ where: {postId: newPost.postId} });
                        if(!exist) {
                            result.push(newPost);
                        }
                    }
                    prevPostId = newPost.postId;
                }
            }

            await page.evaluate(() => {
                window.scrollBy(0, 800);
            });
        }

        await Promise.all(result.map((r) => {
            return db.Instagram.create({
                postId: r.postId,
                image: r.img
            })
        }));
    } catch(e) {
        console.error(e);
    }
}

crawler();