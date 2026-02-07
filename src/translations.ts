// src/translations.ts

export interface TranslationContent {
  titles: { [key: string]: string };
  shop_items: { [key: string]: string }; // Добавили сюда
  achievementsTab: string;
  shopTab: string;
  daily: string;
  saved: string;
  points: string;
  buy: string;
  noPoints: string;
  granted: string;
  tasksTitle: string;
  statsTitle: string;
  inProgress: string;
  availableTasks: string;
  done: string;
  approve: string;
  givePoints: string;
  executing: string;
  noRequests: string;
  taskSettings: string;
  taskName: string;
  averagePerDay: string;
  perWeek: string;
  noData: string;
  achievements: {
    title: string;
    nextLevel: string;
    needed: string;
    xp: string;
    bonus: string;
  };
  shop: {
    title: string;
    buyButton: string;
    exchange: string;
    buyPrefix?: string; // Для уведомлений "Куплено: ..."
  };
admin: {
    checkTasks: string;
    editTasks: string;
    settings: string;
    shopSettingsTitle: string;
    typeReward: string;
    typeMoney: string;
    placeholderName:string;
    placeholderBonus:string;
    placeholderDesc:string;
    labelPricePoints: string;
    labelAmountEuro: string;
    btnAdd: string;
    levelsTitle: string;
    clearConfirm: string;
    clearOld: string;
    templates: string;
    dailyLoad: string;
    requests: string;
    noRequests: string;
  };
  tasks: { [key: string]: string };
  auth: {
    welcome: string;
    finishRegistration: string;
    namePlaceholder: string;
    roleChild: string;
    roleParent: string;
    familyCodeLabel: string;
    familyCodePlaceholder: string;
    familyCodeHint: string;
    startAdventure: string;
    loading: string;
  };
  profile: {
    roleLabel: string;
    familyIdLabel: string;
    parent: string;
    child: string;
  };
  familySettings: {
    title: string;
    inviteTitle: string;
    inviteDesc: string;
    copyCode: string;
    copied: string;
    shareLink: string;
    addManual: string;
    namePlaceholder: string;
    pointsBalance: string;
    adminStatus: string;
    deleteConfirm: string;
   
  };
adminForm: {
    editTitle: string;
    createTitle: string;
    forLabel: string;
    pointsLabel: string;
    minutesLabel: string;
    saveBtn: string;
    createBtn: string;
    copyAsNewBtn: string;
  };
  stats: {
    average: string;
    weekly: string;
    recentTitle: string;
    noData: string;
  };
  howItWorks: {
  title: string;
  step1: { t: string; d: string };
  step2: { t: string; d: string };
  step3: { t: string; d: string };
  step4: { t: string; d: string };
}
}

export const translations: Record<'fi' | 'ru' | 'en', TranslationContent> = {
  fi: {
    daily: "Päivän saldo",
    saved: "Säästössä",
    points: "pistettä",
    buy: "Käytä бонус-aikaa",
    noPoints: "Ei tarpeeksi pisteitä!",
    granted: "Peliaika myönnetty!",
    tasksTitle: "Tehtävät",
    statsTitle: "Tilastot",
    inProgress: "Menossa:",
    availableTasks: "Vapaat tehtävät:",
    done: "VALMIS ✅",
    approve: "Salli aloitus ▶️",
    givePoints: "Anna pisteitä ✅",
    executing: "Suoritetaan...",
    noRequests: "Ei pyyntöjä",
    taskSettings: "Tehtävien hallinta",
    taskName: "Tehtävän nimi",
    averagePerDay: "Keskiarvo päivässä",
    perWeek: "Viikossa",
    noData: "Ei tietoja saatavilla",
    achievementsTab: "Tasot",
    shopTab: "Kauppa",
    achievements: {
      title: "Saavutukset",
      nextLevel: "Seuraava taso:",
      needed: "Tarvitaan:",
      xp: "XP",
      bonus: "Sinun bonuksesi",
    },
    shop: {
      title: "Kauppa",
      buyButton: "Osta",
      exchange: "Vaihto",
      buyPrefix: "Ostettu",
    },
    tasks: {
      laksyt: "Läksyt",
      jumppa: "Aamujumppa",
      ulkoilu: "Ulkoilu",
      kissat: "Kissat",
      kotityot: "Kotityöt",
      kaytos: "Käytös",
    },
admin: {
  checkTasks: "Tarkistus",
  editTasks: "Mallit",
  settings: "Perhe",
  shopSettingsTitle: "Kaupan asetukset",
  typeReward: "Tuote",
  typeMoney: "Raha",
  placeholderName: "Nimi...",
  placeholderBonus: "Palkinto...",
  placeholderDesc: "Kuvaus...",
  labelPricePoints: "Hinta (pisteitä)",
  labelAmountEuro: "Summa (€)",
  btnAdd: "Lisää",
  levelsTitle: "Tasot ja saavutukset",
  clearConfirm: "Haluatko varmasti poistaa kaikki kertatehtävät?",
  clearOld: "Tyhjennä vanhat",
  templates: "Kaikki tehtävät",
  dailyLoad: "Päivän tilanne",
  requests: "Pyynnöt",
  noRequests: "Ei uusia pyyntöjä"
},
    auth: {
      welcome: "✨ Melkein valmista",
      finishRegistration: "Viimeistele profiilisi",
      namePlaceholder: "Sinun nimesi",
      roleChild: "Olen lapsi",
      roleParent: "Olen vanhempi",
      familyCodeLabel: "Perhekoodi (jos on)",
      familyCodePlaceholder: "Esim: fam_xyz123",
      familyCodeHint: "* Jos jätät tyhjäksi, luomme uuden perheryhmän.",
      startAdventure: "Aloita seikkailu! 🚀",
      loading: "Hetkinen..."
    },
    profile: {
      roleLabel: "Rooli",
      familyIdLabel: "Perheen ID",
      parent: "Vanhempi",
      child: "Lapsi",
    },
    familySettings: {
      title: "Profiilien hallinta",
      inviteTitle: "Kutsu jäseniä",
      inviteDesc: "Lähetä linkki lapselle tai anna skannata QR-koodi",
      copyCode: "Kopioi koodi",
      copied: "Kopioitu!",
      shareLink: "Jaa linkki",
      addManual: "Lisää manuaalisesti",
      namePlaceholder: "Jäsenen nimi",
      pointsBalance: "Pisteet",
      adminStatus: "Ylläpitäjä",
      deleteConfirm: "Poistetaanko käyttäjä pysyvästi?",
    },

    adminForm: {
      editTitle: "Muokkaa tehtävää",
      createTitle: "Uusi tehtävä",
      forLabel: "KÄYTTÄJÄLLE",
      pointsLabel: "PISTEET",
      minutesLabel: "MINUUTIT",
      saveBtn: "Tallenna",
      createBtn: "Luo tehtävä",
      copyAsNewBtn: "Kopioi uusi",
    },
    titles: {
      level_novice: "Aloittelija",
      level_apprentice: "Oppipoika",
      level_master: "Mestari",
      level_hero: "Sankari",
      level_legend: "Legenda",
    },
    shop_items: {
      shop_icecream: "Jäätelö",
      shop_gaming: "30 min peliaikaa",
      shop_cinema: "Elokuva",
      shop_money: "Rahaa",
    },
    stats: {
    average: "Keskiarvo päivässä",
    weekly: "Viikossa",
    recentTitle: "Viimeisimmät",
    noData: "Ei tietoja saatavilla",
  },
howItWorks: {
  title: "Miten se toimii? 🚀",
  step1: { t: "Tee tehtäviä", d: "Valitse tehtävä listalta ja paina «Aloita»." },
  step2: { t: "Odota vahvistusta", d: "Vanhempi saa ilmoituksen ja hyväksyy suorituksen." },
  step3: { t: "Kerää pisteitä", d: "Saat XP:tä ja pisteitä jokaisesta tehtävästä." },
  step4: { t: "Käytä kaupassa", d: "Vaihda pisteet peliaikaan, herkkuun tai rahaan." },
}
  },
  ru: {
    daily: "Дневной баланс",
    saved: "В копилке",
    points: "баллов",
    buy: "Использовать бонусное время",
    noPoints: "Недостаточно баллов!",
    granted: "Доступ открыт!",
    tasksTitle: "Задания",
    statsTitle: "Статистика",
    inProgress: "В процессе:",
    availableTasks: "Доступные задания:",
    done: "ГОТОВО ✅",
    approve: "Разрешить начать ▶️",
    givePoints: "Дать баллы ✅",
    executing: "Выполняется...",
    noRequests: "Запросов пока нет",
    taskSettings: "Настройка заданий",
    taskName: "Название задачи",
    averagePerDay: "Среднее в день",
    perWeek: "За неделю",
    noData: "Нет данных",
    achievementsTab: "Уровни",
    shopTab: "Магазин",
    achievements: {
      title: "Твои достижения",
      nextLevel: "Следующий уровень:",
      needed: "Нужно:",
      xp: "XP",
      bonus: "Твой бонус",
    },
    shop: {
      title: "Магазин бонусов",
      buyButton: "Купить",
      exchange: "Обмен",
      buyPrefix: "Куплено",
    },
    tasks: {
      laksyt: "Домашнее задание",
      jumppa: "Зарядка",
      ulkoilu: "Прогулка",
      kissat: "Покормить кошек",
      kotityot: "Помощь по дому",
      kaytos: "Хорошее поведение",
    },
admin: {
  checkTasks: "Проверка",
  editTasks: "Шаблоны",
  settings: "Семья",
  shopSettingsTitle: "Настройка Магазина",
  typeReward: "Товар",
  typeMoney: "Деньги",
  placeholderName: "Название...",
  placeholderBonus: "Приз или бонус...",
  placeholderDesc: "Описание...",
  labelPricePoints: "Цена (баллы)",
  labelAmountEuro: "Сумма (€)",
  btnAdd: "Добавить",
  levelsTitle: "Настройка уровней",
  clearConfirm: "Удалить все разовые задачи?",
  clearOld: "Очистить старые",
  templates: "Все задачи",
  dailyLoad: "Загрузка на день",
  requests: "Запросы",
  noRequests: "Нет новых запросов"
},
    auth: {
      welcome: "✨ Почти готово",
      finishRegistration: "Настрой свой профиль",
      namePlaceholder: "Твоё имя",
      roleChild: "Я ребенок",
      roleParent: "Я родитель",
      familyCodeLabel: "Код семьи (если есть)",
      familyCodePlaceholder: "Например: fam_xyz123",
      familyCodeHint: "* Если оставить пустым, мы создадим новую группу.",
      startAdventure: "Начать приключение! 🚀",
      loading: "Секундочку..."
    },
    profile: {
      roleLabel: "Роль",
      familyIdLabel: "ID Семьи",
      parent: "Родитель",
      child: "Ребенок",
    },
    familySettings: {
      title: "Управление профилями",
      inviteTitle: "Пригласить участников",
      inviteDesc: "Отправь ссылку ребенку или дай отсканировать QR-код",
      copyCode: "Копировать код",
      copied: "Скопировано!",
      shareLink: "Поделиться",
      addManual: "Добавить вручную",
      namePlaceholder: "Имя участника",
      pointsBalance: "Баллы",
      adminStatus: "Админ",
      deleteConfirm: "Удалить пользователя навсегда?",
    },

    adminForm: {
      editTitle: "Редактирование",
      createTitle: "Новое задание",
      forLabel: "ДЛЯ",
      pointsLabel: "БАЛЛЫ",
      minutesLabel: "МИНУТЫ",
      saveBtn: "Сохранить",
      createBtn: "Создать задание",
      copyAsNewBtn: "Как новое",
    },
    titles: {
      level_novice: "Новичок",
      level_apprentice: "Ученик",
      level_master: "Мастер",
      level_hero: "Герой",
      level_legend: "Легенда",
    },
    shop_items: {
      shop_icecream: "Мороженое",
      shop_gaming: "30 мин приставки",
      shop_cinema: "Поход в кино",
      shop_money: "Деньги на карту",
    },
    stats: {
    average: "Среднее в день",
    weekly: "За неделю",
    recentTitle: "Последние действия",
    noData: "Нет данных",
  },
  howItWorks: {
  title: "Как это работает? 🚀",
  step1: { t: "Выполняй задачи", d: "Выбирай доступные задания в списке и жми «Начать»." },
  step2: { t: "Жди проверки", d: "Родитель получит уведомление и подтвердит выполнение." },
  step3: { t: "Копи баллы", d: "За каждое задание ты получаешь XP и баллы в копилку." },
  step4: { t: "Трать в магазине", d: "Обменивай баллы на игровое время, сладости или реальные деньги." },
},
  },
  en: {
    daily: "Daily balance",
    saved: "Saved",
    points: "points",
    buy: "Use bonus time",
    noPoints: "Not enough points!",
    granted: "Time granted!",
    tasksTitle: "Tasks",
    statsTitle: "Statistics",
    inProgress: "In progress:",
    availableTasks: "Available tasks:",
    done: "DONE ✅",
    approve: "Approve start ▶️",
    givePoints: "Give points ✅",
    executing: "Executing...",
    noRequests: "No requests",
    taskSettings: "Task settings",
    taskName: "Task name",
    averagePerDay: "Daily average",
    perWeek: "Per week",
    noData: "No data available",
    achievementsTab: "Levels",
    shopTab: "Shop",
    achievements: {
      title: "Achievements",
      nextLevel: "Next level:",
      needed: "Needed:",
      xp: "XP",
      bonus: "Your bonus",
    },
    shop: {
      title: "Bonus Shop",
      buyButton: "Buy",
      exchange: "Exchange",
      buyPrefix: "Purchased",
    },
    tasks: {
      laksyt: "Homework",
      jumppa: "Morning gym",
      ulkoilu: "Outdoors",
      kissat: "Feed cats",
      kotityot: "Housework",
      kaytos: "Behavior",
    },
admin: {
  checkTasks: "Review",
  editTasks: "Templates",
  settings: "Family",
  shopSettingsTitle: "Shop Settings",
  typeReward: "Item",
  typeMoney: "Money",
  placeholderName: "Name...",
  placeholderBonus: "Reward or bonus...", 
  placeholderDesc: "Description...",
  labelPricePoints: "Price (pts)",
  labelAmountEuro: "Amount (€)",
  btnAdd: "Add",
  levelsTitle: "Levels & Achievements",
  clearConfirm: "Are you sure you want to delete all one-time tasks?",
  clearOld: "Clear old",
  templates: "All tasks",
  dailyLoad: "Daily status",
  requests: "Requests",
  noRequests: "No new requests"
},
    auth: {
      welcome: "✨ Almost ready",
      finishRegistration: "Set up your profile",
      namePlaceholder: "Your name",
      roleChild: "I'm a child",
      roleParent: "I'm a parent",
      familyCodeLabel: "Family code (if any)",
      familyCodePlaceholder: "Example: fam_xyz123",
      familyCodeHint: "* If left empty, a new family group will be created.",
      startAdventure: "Start adventure! 🚀",
      loading: "One moment..."
    },
    profile: {
      roleLabel: "Role",
      familyIdLabel: "Family ID",
      parent: "Parent",
      child: "Child",
    },
    familySettings: {
      title: "Profile Management",
      inviteTitle: "Invite Members",
      inviteDesc: "Send link or scan QR",
      copyCode: "Copy code",
      copied: "Copied!",
      shareLink: "Share",
      addManual: "Add manually",
      namePlaceholder: "Member name",
      pointsBalance: "Points",
      adminStatus: "Admin",
      deleteConfirm: "Delete user permanently?",
    },

    adminForm: {
      editTitle: "Edit Task",
      createTitle: "New Task",
      forLabel: "FOR",
      pointsLabel: "POINTS",
      minutesLabel: "MINUTES",
      saveBtn: "Save",
      createBtn: "Create Task",
      copyAsNewBtn: "As New",
    },
    titles: {
      level_novice: "Novice",
      level_apprentice: "Apprentice",
      level_master: "Master",
      level_hero: "Hero",
      level_legend: "Legend",
    },
    shop_items: {
      shop_icecream: "Ice cream",
      shop_gaming: "30 min gaming",
      shop_cinema: "Cinema trip",
      shop_money: "Cash out",
    },
    stats: {
    average: "Aerage day",
    weekly: "Weekly",
    recentTitle: "Recent action",
    noData: "No Data",
  },
  // В объект EN:
howItWorks: {
  title: "How it works? 🚀",
  step1: { 
    t: "Complete Tasks", 
    d: "Pick an available task from the list and tap \"Start\"." 
  },
  step2: { 
    t: "Wait for Approval", 
    d: "Your parent will get a notification to review and approve your work." 
  },
  step3: { 
    t: "Earn Points", 
    d: "For every task, you get XP and points added to your balance." 
  },
  step4: { 
    t: "Spend in Shop", 
    d: "Exchange your points for gaming time, treats, or real rewards." 
  },
},
  }
};