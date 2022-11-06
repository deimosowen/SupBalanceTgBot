import Datastore from "nedb";

import { ICard } from "./interface";

export class CardService {
  constructor() {
    this.db = new Datastore<ICard>({ filename: "cards" });

    this.db.ensureIndex({ fieldName: "userId" });
    this.db.loadDatabase();
  }

  private db: Datastore<ICard>;

  public getCard = (id: number): Promise<ICard> =>
    new Promise((resolve, reject) => {
      this.db.findOne<ICard>({ userId: id }, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });

  public setCard = (data: ICard) => {
    this.db.insert(data);
  };

  public removeCard = async (id: number) => {
    this.db.remove({ userId: id }, {});
  };
}
