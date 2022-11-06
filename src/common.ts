export const keyboardMain = [
  [
    {
      text: "История покупок",
      callback_data: JSON.stringify({
        command: "history",
      }),
    },
    {
      text: "Обновить баланс",
      callback_data: JSON.stringify({
        command: "refresh",
      }),
    },
  ],
];

export const keyboardTwo = [
  [
    {
      text: "Пластиковая",
      callback_data: JSON.stringify({
        command: "is_plastic_card",
      }),
    },
    {
      text: "Виртуальная",
      callback_data: JSON.stringify({
        command: "is_virtual_card",
      }),
    },
  ],
];

export const botCommond = [
  {
    command: "/start",
    description: "Запустить",
  },
  {
    command: "/balance",
    description: "Баланс",
  },
  {
    command: "/stop",
    description: "Остановить",
  },
];
