// Полифилы — до инициализации локализации и ДО "expo-router/entry"
// (раздел "Фаза 7" задания, пункт 6): в Hermes на этой версии нет
// Intl.PluralRules. Без них i18next не падает, а молча разрешает
// только английские формы множественного числа — тихая ошибка,
// неправильная русская грамматика без единого сообщения об ошибке.
import "@formatjs/intl-locale/polyfill-force.js";
import "@formatjs/intl-pluralrules/polyfill-force.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/ru.js";
import "expo-router/entry";
