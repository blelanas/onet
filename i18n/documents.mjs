import { T } from "./_lib.mjs";

export default {
  title: T("Documents", "الوثائق", "Documents"),
  description: T("Autorisations, fiches sanitaires, rapports et pièces jointes.", "التراخيص والبطاقات الصحية والتقارير والمرفقات.", "Authorizations, health forms, reports and attachments."),
  fields: { name: T("Nom du document", "اسم الوثيقة", "Document name"), linkedTo: T("Rattaché à", "مرتبط بـ", "Linked to"), size: T("Taille", "الحجم", "Size"), uploadedBy: T("Ajouté par", "أضافه", "Uploaded by") },
  empty: { title: T("Aucun document", "لا توجد وثائق", "No documents"), entity: T("Les documents ajoutés apparaîtront ici.", "ستظهر الوثائق المضافة هنا.", "Uploaded documents will appear here.") },
};
