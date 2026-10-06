import { T } from "./_lib.mjs";

export default {
  title: T("Recherche", "البحث", "Search"),
  description: T("Trouvez un enfant, une famille, un groupe, une activité, une sortie ou une chanson.", "ابحث عن طفل أو عائلة أو مجموعة أو نشاط أو رحلة أو نشيد.", "Find a child, a family, a group, an activity, a trip or a song."),
  placeholder: T("Rechercher dans toute la plateforme…", "ابحث في كامل المنصة…", "Search the whole platform…"),
  submit: T("Rechercher", "بحث", "Search"),
  results: T("{count, plural, =0 {Aucun résultat} one {# résultat} other {# résultats}} pour « {q} »", "{count} نتيجة لـ«{q}»", "{count, plural, =0 {No results} one {# result} other {# results}} for “{q}”"),
  hintTitle: T("Que cherchez-vous ?", "عمّ تبحث؟", "What are you looking for?"),
  hint: T("Tapez au moins 2 caractères : un prénom, un numéro d'adhérent, un lieu, un titre…", "اكتب حرفين على الأقل: اسم، رقم انخراط، مكان، عنوان…", "Type at least 2 characters: a first name, a member number, a place, a title…"),
  suggestions: T("Essayez :", "جرّب:", "Try:"),
  emptyTitle: T("Aucun résultat pour « {q} »", "لا توجد نتائج لـ«{q}»", "No results for “{q}”"),
  emptyHint: T("Vérifiez l'orthographe ou essayez un mot plus court.", "تحقق من الكتابة أو جرّب كلمة أقصر.", "Check the spelling or try a shorter word."),
  all: T("Tout", "الكل", "All"),
  seeAll: T("Voir les {count} résultats", "عرض {count} نتيجة", "See all {count} results"),
  showingFirst: T("{shown} sur {count}", "{shown} من {count}", "{shown} of {count}"),
  sections: {
    members: T("Personnes", "الأشخاص", "People"), groups: T("Groupes", "المجموعات", "Groups"), activities: T("Activités", "الأنشطة", "Activities"),
    events: T("Événements", "التظاهرات", "Events"), trips: T("Sorties", "الرحلات", "Trips"), songs: T("Chansons", "الأناشيد", "Songs"), games: T("Jeux", "الألعاب", "Games"),
    conferences: T("Conférences", "المحاضرات", "Conferences"), resources: T("Ressources", "الموارد", "Resources"), invoices: T("Factures", "الفواتير", "Invoices"),
  },
};
