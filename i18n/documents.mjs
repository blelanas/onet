import { T } from "./_lib.mjs";

export default {
  title: T("Documents", "الوثائق", "Documents"),
  description: T("Autorisations, fiches sanitaires, rapports et pièces jointes.", "التراخيص والبطاقات الصحية والتقارير والمرفقات.", "Authorizations, health forms, reports and attachments."),
  fields: { name: T("Nom du document", "اسم الوثيقة", "Document name"), linkedTo: T("Rattaché à", "مرتبط بـ", "Linked to"), size: T("Taille", "الحجم", "Size"), uploadedBy: T("Ajouté par", "أضافه", "Uploaded by") },
  empty: { title: T("Aucun document", "لا توجد وثائق", "No documents"), entity: T("Les documents ajoutés apparaîtront ici.", "ستظهر الوثائق المضافة هنا.", "Uploaded documents will appear here.") },
  library: {
    subtitle: T("Tous les documents auxquels vous avez accès, au même endroit.", "كل الوثائق المتاحة لك في مكان واحد.", "Every document you can access, in one place."),
    upload: T("Ajouter un document", "إضافة وثيقة", "Add a document"),
    uploadTitle: T("Nouveau document général", "وثيقة عامة جديدة", "New general document"),
    uploadHint: T("Règlement intérieur, formulaires vierges, comptes rendus… visibles par tous les comptes ayant accès aux documents.", "النظام الداخلي، الاستمارات، المحاضر… مرئية لكل الحسابات التي يمكنها الاطلاع على الوثائق.", "Rules, blank forms, minutes… visible to every account with document access."),
    allEntities: T("Tout", "الكل", "All"),
    allCategories: T("Toutes catégories", "كل الأصناف", "All categories"),
    count: T("{count, plural, =0 {Aucun document} one {# document} other {# documents}}", "{count, plural, =0 {لا توجد وثائق} one {وثيقة واحدة} two {وثيقتان} few {# وثائق} many {# وثيقة} other {# وثيقة}}", "{count, plural, =0 {No documents} one {# document} other {# documents}}"),
    emptyFiltered: T("Aucun document ne correspond à ces filtres.", "لا توجد وثائق مطابقة لهذه المعايير.", "No document matches these filters."),
    emptyHint: T("Les documents rattachés aux membres, sorties, événements et factures apparaîtront ici.", "ستظهر هنا الوثائق المرتبطة بالأعضاء والرحلات والتظاهرات والفواتير.", "Documents attached to members, trips, events and invoices will appear here."),
    general: T("Document général", "وثيقة عامة", "General document"),
    open: T("Ouvrir la fiche", "فتح الملف", "Open record"),
    deleteConfirm: T("Supprimer ce document ? Le fichier ne sera plus accessible.", "حذف هذه الوثيقة؟ لن يعود الملف متاحًا.", "Delete this document? The file will no longer be accessible."),
  },
};
