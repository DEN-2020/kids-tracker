// 1. Описываем структуру (интерфейс) перевода. 
// Она должна в точности совпадать с тем, что лежит в JSON.
export interface TranslationContent {
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
  logout: string;
  approve: string;
  givePoints: string;
  executing: string;
  noRequests: string;
  taskSettings: string;
  taskName: string;
  averagePerDay: string;
  perWeek: string;
  noData: string;
  achievementsTab: string;
  shopTab: string;
  loading: string;
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
    buyPrefix: string;
  };
  tasks: { [key: string]: string };
  admin: {
    checkTasks: string;
    editTasks: string;
    settings: string;
    shopSettingsTitle: string;
    typeReward: string;
    typeMoney: string;
    placeholderName: string;
    placeholderBonus: string;
    placeholderDesc: string;
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
  titles: { [key: string]: string };
  shop_items: { [key: string]: string };
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
  };
}

// 2. Функция для загрузки нужного языка. 
// Vite автоматически подхватит файлы из public/locales/
export const fetchTranslations = async (lang: string): Promise<TranslationContent> => {
  const response = await fetch(`/locales/${lang}.json`);
  if (!response.ok) {
    throw new Error(`Could not load translations for language: ${lang}`);
  }
  return await response.json();
};