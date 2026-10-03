import { T } from "./_lib.mjs";

export default {
  titles: {
    members: T("Membres", "الأعضاء", "Members"), children: T("Enfants", "الأطفال", "Children"), parents: T("Parents", "الأولياء", "Parents"), monitors: T("Moniteurs", "المنشطون", "Monitors"),
    newMember: T("Nouveau membre", "عضو جديد", "New member"), editMember: T("Modifier le membre", "تعديل العضو", "Edit member"), myChildren: T("Mes enfants", "أطفالي", "My children"),
  },
  descriptions: {
    members: T("Tous les membres de l'ONET Teboulba : enfants, familles, moniteurs et équipe.", "جميع أعضاء المنظمة بطبلبة: الأطفال والعائلات والمنشطون والفريق.", "Everyone at ONET Teboulba: kids, families, monitors and staff."),
    children: T("Les enfants inscrits, leurs groupes et leurs familles.", "الأطفال المسجلون ومجموعاتهم وعائلاتهم.", "Registered kids, their groups and families."),
    parents: T("Les familles et leurs coordonnées.", "العائلات ومعلومات الاتصال بها.", "Families and their contact details."),
    monitors: T("L'équipe d'animation et ses groupes.", "فريق التنشيط ومجموعاته.", "The animation team and their groups."),
    myChildren: T("Suivez les activités, présences et sorties de vos enfants.", "تابع أنشطة أطفالك وحضورهم ورحلاتهم.", "Follow your children's activities, attendance and trips."),
  },
  new: { CHILD: T("Ajouter un enfant", "إضافة طفل", "Add a child"), PARENT: T("Ajouter un parent", "إضافة وليّ", "Add a parent"), MONITOR: T("Ajouter un moniteur", "إضافة منشّط", "Add a monitor"), MEMBER: T("Ajouter un membre", "إضافة عضو", "Add a member"), STAFF: T("Ajouter un membre", "إضافة عضو", "Add a member") },
  filters: { allTypes: T("Tous les profils", "كل الأصناف", "All profiles"), allStatuses: T("Tous les statuts", "كل الحالات", "All statuses"), allGroups: T("Tous les groupes", "كل المجموعات", "All groups"), sort: T("Trier", "ترتيب", "Sort"), sortName: T("Nom (A→Z)", "الاسم", "Name (A→Z)"), sortRecent: T("Adhésion récente", "الانخراط الأحدث", "Newest members"), sortAge: T("Plus jeunes", "الأصغر سنًا", "Youngest") },
  columns: { member: T("Membre", "العضو", "Member"), number: T("N° adhérent", "رقم الانخراط", "Member no."), type: T("Profil", "الصنف", "Profile"), group: T("Groupe", "المجموعة", "Group"), age: T("Âge", "العمر", "Age"), parents: T("Parents", "الأولياء", "Parents"), children: T("Enfants", "الأطفال", "Children"), contact: T("Contact", "الاتصال", "Contact"), groups: T("Groupes", "المجموعات", "Groups"), status: T("Statut", "الحالة", "Status"), since: T("Membre depuis", "عضو منذ", "Member since") },
  form: {
    identity: T("Identité", "الهوية", "Identity"), contact: T("Coordonnées", "معلومات الاتصال", "Contact details"), membership: T("Adhésion", "الانخراط", "Membership"), family: T("Famille & groupe", "العائلة والمجموعة", "Family & group"), health: T("Santé & urgence", "الصحة والطوارئ", "Health & emergency"),
    type: T("Profil", "الصنف", "Profile"), firstName: T("Prénom", "الاسم", "First name"), lastName: T("Nom", "اللقب", "Last name"), firstNameAr: T("Prénom (arabe)", "الاسم بالعربية", "First name (Arabic)"), lastNameAr: T("Nom (arabe)", "اللقب بالعربية", "Last name (Arabic)"),
    dateOfBirth: T("Date de naissance", "تاريخ الولادة", "Date of birth"), gender: T("Genre", "الجنس", "Gender"), photo: T("Photo", "الصورة", "Photo"), city: T("Ville", "المدينة", "City"),
    emergencyName: T("Contact d'urgence", "شخص للاتصال عند الطوارئ", "Emergency contact"), emergencyPhone: T("Téléphone d'urgence", "هاتف الطوارئ", "Emergency phone"), medicalNotes: T("Informations médicales", "معلومات طبية", "Medical information"),
    medicalHint: T("Allergies, traitements… visible uniquement par l'équipe et la famille.", "حساسية، أدوية… مرئية فقط للفريق والعائلة.", "Allergies, treatments… visible only to staff and family."),
    status: T("Statut d'adhésion", "حالة الانخراط", "Membership status"), membershipDate: T("Date d'adhésion", "تاريخ الانخراط", "Membership date"), notes: T("Notes internes", "ملاحظات داخلية", "Internal notes"),
    parents: T("Parents / tuteurs", "الأولياء", "Parents / guardians"), parentsHint: T("Maintenez Ctrl (ou Cmd) pour en sélectionner plusieurs.", "اضغط Ctrl لاختيار أكثر من وليّ.", "Hold Ctrl (or Cmd) to select several."), group: T("Groupe", "المجموعة", "Group"), noGroup: T("Aucun groupe", "بدون مجموعة", "No group"),
    monitorGroups: T("Groupes encadrés", "المجموعات المؤطَّرة", "Groups supervised"),
  },
  profile: {
    tabs: { overview: T("Aperçu", "نظرة عامة", "Overview"), attendance: T("Présences", "الحضور", "Attendance"), participation: T("Participation", "المشاركة", "Participation"), payments: T("Paiements", "المدفوعات", "Payments"), documents: T("Documents", "الوثائق", "Documents") },
    personal: T("Informations personnelles", "المعلومات الشخصية", "Personal information"), family: T("Famille", "العائلة", "Family"), children: T("Enfants", "الأطفال", "Children"), parents: T("Parents", "الأولياء", "Parents"),
    groupCard: T("Groupe", "المجموعة", "Group"), monitorsOfGroup: T("Moniteurs", "المنشطون", "Monitors"), activities: T("Activités suivies", "الأنشطة", "Activities"), badges: T("Badges", "الشارات", "Badges"),
    events: T("Événements", "التظاهرات", "Events"), trips: T("Sorties", "الرحلات", "Trips"), noActivities: T("Aucune activité pour le moment.", "لا توجد أنشطة حاليًا.", "No activities yet."),
    noFamily: T("Aucun lien familial enregistré.", "لا توجد روابط عائلية.", "No family links recorded."), attendanceRate: T("Taux de présence", "نسبة الحضور", "Attendance rate"),
    linkParent: T("Lier un parent", "ربط وليّ", "Link a parent"), unlink: T("Retirer le lien", "إزالة الربط", "Remove link"), account: T("Compte de connexion", "حساب الدخول", "Login account"),
    hasAccount: T("Ce membre peut se connecter ({email}).", "يمكن لهذا العضو تسجيل الدخول ({email}).", "This member can sign in ({email})."), noAccount: T("Aucun compte de connexion.", "لا يوجد حساب دخول.", "No login account."),
    createAccount: T("Créer un compte", "إنشاء حساب", "Create account"), role: T("Rôle", "الدور", "Role"), password: T("Mot de passe initial", "كلمة المرور الأولية", "Initial password"),
    lastLogin: T("Dernière connexion", "آخر دخول", "Last login"), emergency: T("Urgence", "طوارئ", "Emergency"), medical: T("Médical", "طبي", "Medical"),
    noInvoices: T("Aucune facture.", "لا توجد فواتير.", "No invoices."), totalDue: T("Reste à payer", "المتبقي للدفع", "Balance due"), deleteTitle: T("Supprimer ce membre ?", "حذف هذا العضو؟", "Delete this member?"),
    deleteText: T("Toutes ses inscriptions et présences seront supprimées.", "سيتم حذف جميع تسجيلاته وحضوره.", "All their registrations and attendance will be removed."),
  },
  import: {
    title: T("Importer des membres", "استيراد أعضاء", "Import members"), help: T("Fichier CSV avec les colonnes : type, firstName, lastName, dateOfBirth (AAAA-MM-JJ), gender (M/F), phone, email, address, membershipStatus.", "ملف CSV بالأعمدة: type وfirstName وlastName وdateOfBirth وgender وphone وemail وaddress وmembershipStatus.", "CSV file with columns: type, firstName, lastName, dateOfBirth (YYYY-MM-DD), gender (M/F), phone, email, address, membershipStatus."),
    result: T("{created} membre(s) importé(s). Lignes ignorées : {errors}", "تم استيراد {created} عضو. أسطر متجاهلة: {errors}", "{created} member(s) imported. Skipped lines: {errors}"), template: T("Télécharger un modèle", "تحميل نموذج", "Download a template"),
  },
  empty: { title: T("Aucun membre trouvé", "لم يتم العثور على أعضاء", "No members found"), description: T("Ajoutez un premier membre ou modifiez vos filtres.", "أضف أول عضو أو غيّر عوامل التصفية.", "Add a first member or change your filters.") },
  myChildren: {
    switchChild: T("Choisir un enfant", "اختر طفلًا", "Choose a child"), upcoming: T("À venir", "القادم", "Coming up"), lastAttendance: T("Dernières présences", "آخر الحضور", "Recent attendance"),
    noChildren: T("Aucun enfant n'est lié à votre compte.", "لا يوجد أطفال مرتبطون بحسابك.", "No child is linked to your account."), noChildrenHint: T("Contactez l'administration pour lier vos enfants à votre compte.", "اتصل بالإدارة لربط أطفالك بحسابك.", "Contact the office to link your children to your account."),
    weeklySchedule: T("Planning de la semaine", "برنامج الأسبوع", "Weekly schedule"), registrations: T("Inscriptions", "التسجيلات", "Registrations"), openProfile: T("Voir la fiche complète", "عرض الملف الكامل", "Open full profile"),
  },
};
