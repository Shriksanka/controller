import { Injectable } from '@nestjs/common';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteerExtra.use(StealthPlugin());

@Injectable()
export class TradeService {
  private browser: any;
  private page: any;
  private readonly AMOUNT = 200;
  private initialized = false;

  async init() {
    if (this.initialized) return;

    this.browser = await puppeteerExtra.launch({
      userDataDir: './user_data',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();
    this.initialized = true;
  }

  async gotoSymbol(symbol: string) {
    const url = `https://www.mexc.com/en-GB/futures/${symbol}`;
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async closeModalsIfAny() {
    const modalCloseSelectors = [
      'button.ant-modal-close', // обычные модалки
      'div.modal-close', // кастомные
      'button[class*=ant-btn][aria-label=Close]', // ARIA совместимые
      'div[class*=announcement] button', // объявления
      'div[class*=noticeModal] button', // иногда бывает
    ];

    for (const selector of modalCloseSelectors) {
      const closeBtn = await this.page.$(selector);
      if (closeBtn) {
        console.log('[MEXC] Обнаружено всплывающее окно. Закрываем...');
        try {
          await closeBtn.click();
          await this.page.waitForTimeout(300); // немного подождать после закрытия
        } catch (err) {
          console.warn('[MEXC] Не удалось закрыть модалку:', err.message);
        }
      }
    }
  }

  async enterPosition(
    symbol: string,
    direction: 'long' | 'short',
    price: number,
    reason: string,
  ) {
    await this.init();
    await this.gotoSymbol(symbol);

    await this.closeModalsIfAny();

    const inputSelector = '.extend-wrapper input.ant-input';
    await this.page.waitForSelector(inputSelector);
    await this.page.click(inputSelector, { clickCount: 3 });
    await this.page.type(inputSelector, this.AMOUNT.toString());

    const openBtnSelector =
      direction === 'long'
        ? 'button[data-testid="contract-trade-open-long-btn"]'
        : 'button[data-testid="contract-trade-open-short-btn"]';

    await this.page.waitForSelector(openBtnSelector);
    await this.page.click(openBtnSelector);

    const confirmSelector =
      direction === 'long'
        ? 'button.ForcedReminder_btnBuy__uZYuh'
        : 'button.ForcedReminder_btnSell__sTbsO';

    await this.page.waitForSelector(confirmSelector);
    await this.page.click(confirmSelector);

    return {
      status: 'opened',
      symbol,
      direction,
      amount: this.AMOUNT,
      reason,
      price,
    };
  }

  async exitPosition(
    symbol: string,
    direction: 'long' | 'short',
    price: number,
    reason: string,
  ) {
    if (!this.page || typeof this.page.click !== 'function') {
      console.warn('[MEXC] Puppeteer page not ready. Reinitializing...');
      await this.init();
    }

    try {
      await this.gotoSymbol(symbol);
      await this.closeModalsIfAny();

      await this.clickFlashCloseButton(); // <--- новый метод

      const confirmSelector =
        direction === 'long'
          ? 'button.ForcedReminder_btnSell__sTbsO'
          : 'button.ForcedReminder_btnBuy__uZYuh';

      await this.page.waitForSelector(confirmSelector, { timeout: 5000 });
      await this.page.click(confirmSelector);

      return {
        status: 'closed',
        symbol,
        direction,
        price,
        reason,
      };
    } catch (err) {
      console.error('[MEXC] Error during exitPosition:', err.message);
      return {
        status: 'error',
        message: err.message,
      };
    }
  }

  async clickFlashCloseButton() {
    const cssSelector = 'button.FastClose_flashCloseBtn__4uyRa';
    const xpath = "//button[span[text()='Flash Close']]";

    try {
      await this.page.waitForSelector(cssSelector, { timeout: 3000 });
      await this.page.click(cssSelector);
    } catch (err) {
      console.warn('[MEXC] Flash Close not found by class, trying XPath...');
      const [btn] = await this.page.$x(xpath);
      if (btn) {
        await btn.click();
      } else {
        throw new Error(
          'Flash Close button not found (both CSS and XPath failed)',
        );
      }
    }
  }
}
