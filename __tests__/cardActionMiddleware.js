import { By, Key } from 'selenium-webdriver';

import { imageSnapshotOptions, timeouts } from './constants.json';

import allOutgoingActivitiesSent from './setup/conditions/allOutgoingActivitiesSent';
import minNumActivitiesShown from './setup/conditions/minNumActivitiesShown.js';
import suggestedActionsShown from './setup/conditions/suggestedActionsShown';
import uiConnected from './setup/conditions/uiConnected';

// selenium-webdriver API doc:
// https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.html

jest.setTimeout(timeouts.test);

test('card action "openUrl"', async () => {
  const { driver, pageObjects } = await setupWebDriver({
    props: {
      cardActionMiddleware: ({ dispatch }) => next => ({ cardAction }) => {
        if (cardAction.type === 'openUrl') {
          dispatch({
            type: 'WEB_CHAT/SEND_MESSAGE',
            payload: {
              text: `Navigating to ${cardAction.value}`
            }
          });
        } else {
          return next(cardAction);
        }
      }
    }
  });

  await driver.wait(uiConnected(), timeouts.directLine);
  await pageObjects.sendMessageViaSendBox('card-actions', { waitForSend: true });

  await driver.wait(suggestedActionsShown(), timeouts.directLine);

  const openUrlButton = await driver.findElement(By.css('[role="form"] ul > li:first-child button'));

  await openUrlButton.click();
  await driver.wait(minNumActivitiesShown(4), timeouts.directLine);
  await driver.wait(allOutgoingActivitiesSent(), timeouts.directLine);

  const base64PNG = await driver.takeScreenshot();

  expect(base64PNG).toMatchImageSnapshot(imageSnapshotOptions);
});

test('card action "signin"', async () => {
  const { driver, pageObjects } = await setupWebDriver({
    props: {
      cardActionMiddleware: ({ dispatch }) => next => ({ cardAction, getSignInUrl }) => {
        if (cardAction.type === 'signin') {
          getSignInUrl().then(url => {
            dispatch({
              type: 'WEB_CHAT/SEND_MESSAGE',
              payload: {
                text: `Signing into ${new URL(url).host}`
              }
            });
          });
        } else {
          return next(cardAction);
        }
      }
    },
    useProductionBot: true
  });

  await driver.wait(uiConnected(), timeouts.directLine);
  await pageObjects.sendMessageViaSendBox('oauth', { waitForSend: true });

  await driver.wait(minNumActivitiesShown(2), timeouts.directLine);
  const openUrlButton = await driver.findElement(By.css('[role="log"] ul > li button'));

  await openUrlButton.click();
  await driver.wait(minNumActivitiesShown(4), timeouts.directLine);
  await driver.wait(allOutgoingActivitiesSent(), timeouts.directLine);

  // When the "Sign in" button is clicked, the focus move to it, need to blur it.
  await driver.executeScript(() => {
    for (let element of document.querySelectorAll(':focus')) {
      element.blur();
    }
  });

  const base64PNG = await driver.takeScreenshot();

  expect(base64PNG).toMatchImageSnapshot(imageSnapshotOptions);
});
