/* module import */
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const fs = require('fs');
const axios = require('axios');
const db = require('./models');

dotenv.config();

/* constants handling */
const MAX_NUM_OF_IMAGES = 1000;
const SEARCH_WORD = '';
const URL = `https://www.instagram.com`;

/* folder handling */
fs.readdir('image', (err) => {
  if (err) {
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
      args: ['--window--size=1920, 1080', '--disable-notifications'],
      userDataDir: `C:\Users\USER\AppData\Local\Google\Chrome\User Data`,
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
    });
    await page.goto(`${URL}/explore/tags/${SEARCH_WORD}/`);

    // 페이지 새로고침
    await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });

    // 돔 삽입 및 전역 변수 등록
    await page.evaluate(() => {
      let dom = document.querySelector('header');
      dom.innerHTML = `
        <div style="position: fixed; z-index: 1000 !important;">          
          <button id="myChangeBtn" type="button">크롤링 중단</button>
        </div>
      `;

      window.haltFlag = false;
    });

    // 이벤트 등록
    await page.evaluate(() => {
      const buttonElement = document.querySelector('#myChangeBtn');

      buttonElement.addEventListener('click', () => {
        window.haltFlag = true;
      });
    });

    /* 스크롤하면서 크롤링하기 */
    let result = [];
    let prevPostId = '';

    // 맨 처음의 인기 게시물 9개를 긁어온다.
    await page.waitForSelector('div._ac7v ');
    const popularPosts = await page.evaluate(() => {
      let imgs = document.querySelector('div._aaq8');
      imgs = imgs.querySelectorAll('div._ac7v');

      let container = [];

      for (let i = 0; i < imgs.length; i++) {
        let temp = imgs[i].children;
        temp = Array.from(imgs);

        temp.forEach(async (img) => {
          const image = img.querySelector('img').src;
          const postId = img
            .querySelector('a')
            .href.split('/')
            .slice(-2, -1)[0];

          container.push({
            postId,
            image,
          });
        });
      }

      return container;
    });

    popularPosts.forEach(async (post) => {
      if (post.postId) {
        if (post.postId !== prevPostId) {
          // 현재 삽입 중인 배열에 기존 원소가 있는지 확인한다.
          if (!result.find((x) => x.postId === post.postId)) {
            // DB에도 저장이 되었는지 확인해본다.
            const exist = await db.Instagram.findOne({
              where: { postId: post.postId },
            });
            if (!exist) {
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
    while (result.length < MAX_NUM_OF_IMAGES) {
      await setTimeout(async () => {
        console.log('===========================================');
        console.log('현재 담은 데이터 길이 : ', result.length);
        console.log('===========================================');
      }, 1000);

      const haltFlag = await page.evaluate(() => haltFlag);
      if (haltFlag) {
        break;
      }

      await page.waitForSelector('div._ac7v');
      const posts = await page.evaluate(() => {
        let article = document.querySelector('article._aao7');
        let divs = article.querySelectorAll('div');
        let imgContainer;
        let imgs;

        for (let i = 40; i <= 100; i++) {
          imgContainer = divs[i];
          imgs = imgContainer.querySelector('div._ac7v');

          if (imgs) {
            break;
          }
        }

        imgs = imgs.children;
        imgs = Array.from(imgs);

        let container = [];

        imgs.forEach(async (img) => {
          const image = img.querySelector('img').src;
          const postId = img
            .querySelector('a')
            .href.split('/')
            .slice(-2, -1)[0];

          container.push({
            postId,
            image,
          });
        });

        return container;
      });

      posts.forEach(async (post) => {
        if (post.postId) {
          if (post.postId !== prevPostId) {
            // 현재 삽입 중인 배열에 기존 원소가 있는지 확인한다.
            if (!result.find((x) => x.postId === post.postId)) {
              // DB에도 저장이 되었는지 확인해본다.
              const exist = await db.Instagram.findOne({
                where: { postId: post.postId },
              });
              if (!exist) {
                result.push(post);
              }
            }

            prevPostId = post.postId;
          }
        }
      });

      await page.evaluate(() => {
        window.scrollBy(0, 100);
      });
    }

    // 로컬 폴더에 이미지 저장 및 DB에 데이터 저장!
    await Promise.all(
      result.map(async (r, i) => {
        if (r.image) {
          const imgResult = await axios.get(r.image, {
            responseType: 'arraybuffer',
          });

          fs.writeFileSync(`image/${r.postId}.jpg`, imgResult.data);
        }

        return db.Instagram.create({
          postId: r.postId,
          image: r.image,
        });
      })
    );
  } catch (e) {
    console.error(e);
  }
};

crawler();
