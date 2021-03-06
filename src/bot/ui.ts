import Core from './_interface';
import { settings, ui } from './decorators';
import { onChange, onLoad } from './decorators/on';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import { filter, isString, set } from 'lodash';
import { getBroadcaster } from './commons';
import oauth from './oauth';
import general from './general';
import currency from './currency';
import webhooks from './webhooks';
import { find, list } from './helpers/register';
import { default as uiModule } from './ui';

import { timezone } from './helpers/dayjs';

class UI extends Core {
  @settings()
  @ui({
    type: 'selector',
    values: ['light', 'dark'],
  })
  public theme: 'light' | 'dark' = 'light';

  @settings()
  public domain = 'localhost';

  @settings()
  public percentage = true;

  @settings()
  public shortennumbers = true;

  @settings()
  public stickystats = true;

  @settings()
  public showdiff = true;

  @onChange('domain')
  @onLoad('domain')
  subscribeWebhook() {
    if (typeof webhooks === 'undefined') {
      setTimeout(() => this.subscribeWebhook(), 1000);
    } else {
      webhooks.subscribeAll();
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'configuration', async (cb) => {
      try {
        const data: any = {};

        for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch']) {
          if (typeof data.core === 'undefined') {
            data.core = {};
          }
          const self = find('core', system);
          if (!self) {
            throw new Error(`core.${name} not found in list`);
          }
          data.core[system] = await self.getAllSettings();
        }
        for (const dir of ['systems', 'games', 'overlays', 'integrations']) {
          for (const system of list(dir)) {
            set(data, `${dir}.${system.__moduleName__}`, await system.getAllSettings());
          }
        }
        // currencies
        data.currency = currency.mainCurrency;
        data.currencySymbol = currency.symbol(currency.mainCurrency);

        // timezone
        data.timezone = timezone;

        // lang
        data.lang = general.lang;

        data.isCastersSet = filter(oauth.generalOwners, (o) => isString(o) && o.trim().length > 0).length > 0 || getBroadcaster() !== '';

        cb(null, data);
      } catch (e) {
        cb(e.stack);
      }
    });

    publicEndpoint(this.nsp, 'configuration', async (cb) => {
      try {
        const data: any = {};

        for (const dir of ['systems', 'games']) {
          for (const system of list(dir)) {
            set(data, `${dir}.${system.__moduleName__}`, await system.getAllSettings());
          }
        }

        // currencies
        data.currency = currency.mainCurrency;
        data.currencySymbol = currency.symbol(currency.mainCurrency);

        // timezone
        data.timezone = timezone;

        // lang
        data.lang = general.lang;

        // theme
        set(data, 'core.ui.theme', uiModule.theme);

        cb(null, data);
      } catch (e) {
        cb(e.stack);
      }
    });
  }
}

export default new UI();
