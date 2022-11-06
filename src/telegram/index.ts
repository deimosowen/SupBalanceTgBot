import TelegramBot from "node-telegram-bot-api";

import { CardService } from "../db";
import { GiftCardsService } from "../gift-cards";

import { IAnswerCallbacks } from "./interface";
import { botCommond, keyboardMain, keyboardTwo } from "../common";

export class Main {
  private cardService = new CardService();
  private giftCardsService = new GiftCardsService();

  private answerCallbacks: { [key: number]: IAnswerCallbacks } = {};

  private bot = new TelegramBot(process.env.TELEGRAM_TOKEN as string, {
    polling: true,
  });

  private sendBalanceMessage = async (chatId: number) => {
    const card = await this.cardService.getCard(chatId);

    if (!card) {
      return this.bot.sendMessage(
        chatId,
        "Вы не зарегистрированы.\nВоспользуйтесь командой /start"
      );
    }

    const cardData = card.isVirtual
      ? await this.giftCardsService.getGiftVirtualCardsData(
        card.number,
        card.card
      )
      : await this.giftCardsService.getGiftCardsData(card.card);

    const messageText = `Баланс карты: <b>${cardData.data.balance.availableAmount}</b> руб.`;

    return this.bot.sendMessage(chatId, messageText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboardMain,
      },
    });
  };

  private async history(msg: TelegramBot.Message) {
    const card = await this.cardService.getCard(msg.chat.id);

    const cardData = card.isVirtual
      ? await this.giftCardsService.getGiftVirtualCardsData(
        card.number,
        card.card
      )
      : await this.giftCardsService.getGiftCardsData(card.card);

    let messageText = `<b>Последние ${process.env.HISTORY_COUNT} покупок:</b>\n`;

    cardData.data.history
      .slice(0, process.env.HISTORY_COUNT)
      .forEach((location: any) => {
        if (location.amount > 0) return;
        messageText += `${location.locationName[0]} ${location.amount
          } руб. в ${new Date(location.time).toLocaleString("ru-RU")} \n`;
      });

    return this.bot.editMessageText(messageText, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboardMain,
      },
    });
  }

  private async refresh(msg: TelegramBot.Message) {
    const card = await this.cardService.getCard(msg.chat.id);

    const cardData = card.isVirtual
      ? await this.giftCardsService.getGiftVirtualCardsData(
        card.number,
        card.card
      )
      : await this.giftCardsService.getGiftCardsData(card.card);

    const updateTime = new Date().toLocaleString("ru-RU");

    const messageText = `Баланс карты: <b>${cardData.data.balance.availableAmount}</b> руб.\nОбновлено: ${updateTime}`;

    return this.bot.editMessageText(messageText, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboardMain,
      },
    });
  }

  private async isVirtualCard(msg: TelegramBot.Message) {
    await this.bot.sendMessage(
      msg.chat.id,
      "Поделитесь номером телефона для продолжения",
      {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          resize_keyboard: true,
          keyboard: [
            [
              {
                text: "Поделиться",
                request_contact: true,
              },
            ],
            [
              {
                text: "Отмена",
              },
            ],
          ],
        },
      }
    );

    this.bot.once("contact", async (contact_msg) => {
      await this.bot.sendMessage(
        msg.chat.id,
        "Введите последние 4 цифры номера карты"
      );

      this.answerCallbacks[msg.chat.id] = async (answer: { text: string }) => {
        if (contact_msg.contact === undefined) {
          throw new Error("Error: contact_msg.contact is undefined");
        }

        const phone_number = contact_msg.contact.phone_number.replace(
          /[^+\d]/g,
          ""
        );
        const check = await this.giftCardsService.checkGiftVirtualCardsData(
          phone_number,
          answer.text
        );

        if (!check) {
          return this.bot.sendMessage(
            msg.chat.id,
            `Ошибка. Проверьте Ваш номер телефона и карту.`
          );
        }

        this.cardService.setCard({
          userId: msg.chat.id,
          number: phone_number,
          card: answer.text,
          isVirtual: true,
        });

        return await this.sendBalanceMessage(msg.chat.id);
      };
    });
  }

  private async isPlasticCard(msg: TelegramBot.Message) {
    await this.bot.sendMessage(
      msg.chat.id,
      "Введите 13-значный номер штрих-кода, расположенный на обратной стороне Вашей карты."
    );

    this.answerCallbacks[msg.chat.id] = async (answer: { text: string }) => {
      const check = await this.giftCardsService.checkGiftCardsData(answer.text);

      if (check === false) {
        return this.bot.sendMessage(
          msg.chat.id,
          `Ошибка в штрих-коде. Проверьте Вашу карту и попробуйте снова.`
        );
      }

      this.cardService.setCard({
        userId: msg.chat.id,
        card: answer.text,
        isVirtual: false,
        number: "", // TODO Почему при чтении такое поле есть а записи не вижу добавил но могут быть ошибки
      });

      return await this.sendBalanceMessage(msg.chat.id);
    };
  }

  public init() {
    this.bot.setMyCommands(botCommond);

    this.bot.onText(/^\/start/, async (msg) => {
      const card = await this.cardService.getCard(msg.chat.id);

      if (card) {
        return this.bot.sendMessage(msg.chat.id, "Вы уже зарегистрированы.");
      }

      return this.bot.sendMessage(msg.chat.id, "Выберите тип карты.", {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: keyboardTwo,
        },
      });
    });

    this.bot.onText(/\/balance/, async (msg) => {
      const chatId = msg.chat.id;

      return await this.sendBalanceMessage(chatId);
    });

    this.bot.onText(/\/stop/, async (msg) => {
      const chatId = msg.chat.id;

      await this.cardService.removeCard(chatId);
      return this.bot.sendMessage(chatId, "Ваши данные удалены.");
    });

    this.bot.on("message", (message) => {
      const callback = this.answerCallbacks[message.chat.id];

      if (callback) {
        delete this.answerCallbacks[message.chat.id];
        return callback(message);
      }
    });

    this.bot.on("callback_query", async (callbackQuery) => {
      const msg = callbackQuery.message;

      if (msg === undefined) {
        throw new Error("Error: msg is undefined");
      }

      if (callbackQuery.data === undefined) {
        throw new Error("Error: callbackQuery.data is undefined");
      }

      const callbackQueryData = JSON.parse(callbackQuery.data);

      if (callbackQueryData.command === "history") {
        return await this.history(msg);
      }

      if (callbackQueryData.command === "refresh") {
        return await this.refresh(msg);
      }

      if (callbackQueryData.command === "is_virtual_card") {
        return await this.isVirtualCard(msg);
      }

      if (callbackQueryData.command === "is_plastic_card") {
        return await this.isPlasticCard(msg);
      }
    });
  }
}
