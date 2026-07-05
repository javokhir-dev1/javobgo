export type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz: {
    welcome: (name: string) => `*Xush kelibsiz, ${name}!* 👋\n\nJavobGo tizimiga kirish uchun telefon raqamingizni ulashing:`,
    share_contact: "📱 Telefon raqamimni ulashish",
    please_share_own_contact: "Iltimos, o'z telefon raqamingizni ulashing.",
    registered_success: "✅ *Ro'yxatdan o'tdingiz!*\n\nPlatformaga kirish uchun quyidagi tugmalardan birini tanlang:",
    login_greeting: (name: string) => `Salom, *${name}*!\n\nPlatformaga kirish uchun quyidagi tugmalardan birini tanlang:`,
    open_browser: "🌐 Brauzerda ochish",
    open_webapp: "📱 Web App orqali",
    error_occurred: "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
    help_text: `*JavobGo — yordam*\n\n🔹 /start — Ro'yxatdan o'tish yoki platformaga kirish\n🔹 /murojaat — Admin bilan bog'lanish yoki ma'lumot o'chirish so'rovi\n🔹 /help  — Ushbu yordam xabari`,
    support_btn: "✍️ Murojaat",
    change_lang_btn: "🌍 Tilni o'zgartirish",
    ask_support: "✍️ *Murojaatingizni yozing.*\n\nSavolingiz, taklifingiz yoki ma'lumotlaringizni o'chirish so'rovini shu yerga yozib yuboring — admin ko'rib chiqadi.\n\nBekor qilish: /help",
    choose_language: "🇺🇿 Tilni tanlang\n🇷🇺 Выберите язык\n🇬🇧 Choose a language",
    language_updated: "✅ Til o'zgartirildi!",
    main_menu: "👇 Pastdagi menyu orqali admin bilan bog'lanishingiz yoki bot tilini o'zgartirishingiz mumkin:",
  },
  ru: {
    welcome: (name: string) => `*Добро пожаловать, ${name}!* 👋\n\nЧтобы войти в систему JavobGo, поделитесь своим номером телефона:`,
    share_contact: "📱 Поделиться контактом",
    please_share_own_contact: "Пожалуйста, поделитесь своим номером телефона.",
    registered_success: "✅ *Вы успешно зарегистрированы!*\n\nДля входа на платформу выберите одну из кнопок ниже:",
    login_greeting: (name: string) => `Здравствуйте, *${name}*!\n\nДля входа на платформу выберите одну из кнопок ниже:`,
    open_browser: "🌐 Открыть в браузере",
    open_webapp: "📱 Через Web App",
    error_occurred: "Произошла ошибка. Пожалуйста, попробуйте еще раз.",
    help_text: `*JavobGo — помощь*\n\n🔹 /start — Регистрация или вход\n🔹 /murojaat — Связаться с админом или удалить данные\n🔹 /help  — Данное сообщение`,
    support_btn: "✍️ Обращение",
    change_lang_btn: "🌍 Изменить язык",
    ask_support: "✍️ *Напишите ваше обращение.*\n\nОтправьте ваш вопрос, предложение или запрос на удаление данных сюда — админ рассмотрит его.\n\nОтмена: /help",
    choose_language: "🇺🇿 Tilni tanlang\n🇷🇺 Выберите язык\n🇬🇧 Choose a language",
    language_updated: "✅ Язык изменен!",
    main_menu: "👇 Через нижнее меню вы можете связаться с админом или изменить язык:",
  },
  en: {
    welcome: (name: string) => `*Welcome, ${name}!* 👋\n\nTo access the JavobGo system, please share your phone number:`,
    share_contact: "📱 Share phone number",
    please_share_own_contact: "Please share your own phone number.",
    registered_success: "✅ *Registered successfully!*\n\nSelect one of the buttons below to log into the platform:",
    login_greeting: (name: string) => `Hello, *${name}*!\n\nSelect one of the buttons below to log into the platform:`,
    open_browser: "🌐 Open in Browser",
    open_webapp: "📱 Via Web App",
    error_occurred: "An error occurred. Please try again.",
    help_text: `*JavobGo — Help*\n\n🔹 /start — Register or login\n🔹 /murojaat — Contact admin or request data deletion\n🔹 /help  — This help message`,
    support_btn: "✍️ Support",
    change_lang_btn: "🌍 Change Language",
    ask_support: "✍️ *Write your message.*\n\nSend your question, suggestion, or data deletion request here — an admin will review it.\n\nCancel: /help",
    choose_language: "🇺🇿 Tilni tanlang\n🇷🇺 Выберите язык\n🇬🇧 Choose a language",
    language_updated: "✅ Language updated!",
    main_menu: "👇 Use the bottom menu to contact the admin or change the language:",
  }
};

export function t(lang: Language, key: keyof typeof translations['uz'], ...args: any[]): string {
  const dictionary = translations[lang] || translations['uz'];
  const value = dictionary[key] as any;
  if (typeof value === 'function') {
    return value(...args);
  }
  return value;
}
