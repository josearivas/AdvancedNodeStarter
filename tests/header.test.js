Number.prototype._called = {};

const Page = require('./helpers/page');

let page;

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
});

afterEach(async () => {
  await page.close();
});

test('the header has the correct text', async () => {
  // Serialize function and send to Chromium.
  // Chromium deserialize and execute and send back to Nodejs runtime
  const text = await page.$eval('a.brand-logo', el => el.innerHTML);

  expect(text).toEqual('Blogster');
});

test('clicking login starts the oauth flow', async () => {
  await page.click('.right a');

  const url = page.url();
  expect(url).toMatch(/accounts\.google\.com/);
});

test('when signed in, show logout button', async () => {
  await page.login();

  const text = await page.getContentsOf('a[href="/auth/logout"]');

  expect(text).toEqual('Logout');
});
