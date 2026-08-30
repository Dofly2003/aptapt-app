// src/constants/serviceCategories.js
// Single source of truth for service category metadata.
// Used by:
//   - ServicesManagement.jsx (admin: dropdown + grouping)
//   - ServicesSection.jsx (landing: grouped rendering)
//   - seedGroupedServices.js (seeder)

export const SERVICE_CATEGORIES = [
  {
    key: 'electrical',
    title: 'Electrical Engineering',
    subtitle: 'Instalasi, perawatan, dan rekayasa kelistrikan',
    accent: 'emerald',
  },
  {
    key: 'legal',
    title: 'Legal & Administrasi',
    subtitle: 'Sertifikasi, perizinan, dan dokumen teknis resmi',
    accent: 'sky',
  },
  {
    key: 'material',
    title: 'Material Supplier',
    subtitle: 'Pengadaan komponen kelistrikan industri & komersial',
    accent: 'amber',
  },
  {
    key: 'iot',
    title: 'IoT & Automation',
    subtitle: 'Smart monitoring, otomasi, dan sistem energi terintegrasi',
    accent: 'violet',
  },
  {
    key: 'software',
    title: 'Software & Aplikasi',
    subtitle: 'CMMS, WMS, EHMS, website, dan solusi digital terintegrasi',
    accent: 'indigo',
  },
];

// Quick lookups
export const CATEGORY_KEYS  = SERVICE_CATEGORIES.map((c) => c.key);
export const CATEGORY_INDEX = Object.fromEntries(
  SERVICE_CATEGORIES.map((c, i) => [c.key, { ...c, index: i }])
);

/** Resolve a category key to its full metadata, with a safe fallback. */
export function getCategoryMeta(key) {
  return (
    CATEGORY_INDEX[key] || {
      key: key || 'other',
      title: 'Lainnya',
      subtitle: '',
      accent: 'slate',
      index: 99,
    }
  );
}