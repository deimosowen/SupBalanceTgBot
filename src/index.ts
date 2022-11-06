import * as dotenv from "dotenv";

import { Main } from "./telegram";

dotenv.config();

const bot = new Main();
bot.init();
