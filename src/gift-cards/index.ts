import axios, { AxiosInstance } from "axios";

import { IGetGiftVirtualCardsData } from "./interface";

export class GiftCardsService {
  private httpService = axios.create({
    baseURL: process.env.GIFT_CARDS_URL,
  });

  public getGiftCardsData = async (card: string) => {
    const data = await this.httpService
      .get(`cards/${card}?limit=100`)
      .then((res) => res.data);

    return data;
  };

  public getGiftVirtualCardsData = async (
    number: string,
    card: string
  ): Promise<IGetGiftVirtualCardsData> => {
    const data = await this.httpService
      .get(`virtual-cards/${number}/${card}?limit=100`)
      .then((res) => res.data);

    return data;
  };

  public checkGiftCardsData = async (card: string): Promise<boolean> => {
    const data = await this.httpService
      .get<{ status: string }>(`cards/${card}`)
      .then((res) => res.data);

    return data.status === "OK";
  };

  public checkGiftVirtualCardsData = async (number: string, card: string) => {
    const data = await this.httpService
      .get<{ status: string }>(`virtual-cards/${number}/${card}`)
      .then((res) => res.data);

    return data.status === "OK";
  };
}
