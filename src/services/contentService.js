// src/services/contentService.js
// Centralized service for all landing page content stored in Firestore.
// Collections: slides, services, projects, testimonials, settings (single doc: "global")

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
} from 'firebase/firestore';
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase/config';

/* -------------------------------------------------------------------------- */
/*  Generic helpers                                                           */
/* -------------------------------------------------------------------------- */

const stripUndefined = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Upload a file to Firebase Storage under a given folder, return the URL.
 * @param {File} file
 * @param {string} folder e.g. "slides", "services", "projects", "testimonials"
 */
export async function uploadImage(file, folder = 'misc') {
    if (!file) return null;
    if (!file.type.startsWith('image/')) {
        throw new Error('File yang diunggah harus berupa gambar.');
    }
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
        throw new Error('Ukuran gambar melebihi batas maksimal 5 MB.');
    }
    const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: false,
    });
    const safeName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const path = `landing/${folder}/${safeName}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, compressed);
    const url = await getDownloadURL(ref);
    return { url, path };
}

/**
 * Delete an image from Storage by its storage path.
 * Silent-fails if the file is missing or path is null.
 */
export async function deleteImage(path) {
    if (!path) return;
    try {
        await deleteObject(storageRef(storage, path));
    } catch (err) {
        // Ignore "not found" errors â€“ the doc may have been pointing to a missing file.
        if (err?.code !== 'storage/object-not-found') console.warn('deleteImage', err);
    }
}

/* -------------------------------------------------------------------------- */
/*  SLIDES                                                                    */
/* -------------------------------------------------------------------------- */

const slidesCol = collection(db, 'slides');

export async function getActiveSlides() {
    const q = query(slidesCol, where('isActive', '==', true), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllSlides() {
    const q = query(slidesCol, orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createSlide(payload) {
    const data = stripUndefined({
        type: payload.type || 'image',
        mockupType: payload.mockupType || '',
        focalPointMobile: payload.focalPointMobile || '30% center',
        focalPointDesktop: payload.focalPointDesktop || 'center',
        title: payload.title || '',
        eyebrow: payload.eyebrow || '',
        subtitle: payload.subtitle || '',
        chips: Array.isArray(payload.chips) ? payload.chips : [],
        buttons: Array.isArray(payload.buttons) ? payload.buttons : [],
        image: payload.image || '',
        imagePath: payload.imagePath || '',
        ctaText: payload.ctaText || 'Hubungi Kami',
        ctaLink: payload.ctaLink || '#contact',
        order: payload.order ?? 0,
        isActive: payload.isActive ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    const ref = await addDoc(slidesCol, data);
    return ref.id;
}

export async function updateSlide(id, payload) {
    const data = stripUndefined({ ...payload, updatedAt: serverTimestamp() });
    await updateDoc(doc(db, 'slides', id), data);
}

export async function deleteSlide(id, imagePath) {
    await deleteDoc(doc(db, 'slides', id));
    if (imagePath) await deleteImage(imagePath);
}

/** Reorder slides in a single batch write. orderedIds = array of slide IDs in new order. */
export async function reorderSlides(orderedIds) {
    const batch = writeBatch(db);
    orderedIds.forEach((id, idx) => {
        batch.update(doc(db, 'slides', id), { order: idx, updatedAt: serverTimestamp() });
    });
    await batch.commit();
}

/* -------------------------------------------------------------------------- */
/*  SERVICES                                                                  */
/* -------------------------------------------------------------------------- */

const servicesCol = collection(db, 'services');

export async function getActiveServices() {
    const q = query(servicesCol, where('isActive', '==', true), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllServices() {
    const q = query(servicesCol, orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createService(payload) {
    const data = stripUndefined({
        title: payload.title || '',
        description: payload.description || '',
        icon: payload.icon || 'bolt',
        image: payload.image || '',
        imagePath: payload.imagePath || '',
        // â”€â”€ NEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        category: payload.category || 'electrical',
        categoryTitle: payload.categoryTitle || '',
        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        order: payload.order ?? 0,
        isActive: payload.isActive ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    const ref = await addDoc(servicesCol, data);
    return ref.id;
}

export async function updateService(id, payload) {
    await updateDoc(doc(db, 'services', id), stripUndefined({ ...payload, updatedAt: serverTimestamp() }));
}

export async function deleteService(id, imagePath) {
    await deleteDoc(doc(db, 'services', id));
    if (imagePath) await deleteImage(imagePath);
}

/* -------------------------------------------------------------------------- */
/*  PROJECTS                                                                  */
/* -------------------------------------------------------------------------- */

const projectsCol = collection(db, 'projects');

export async function getActiveProjects() {
    const q = query(projectsCol, where('isActive', '==', true), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllProjects() {
    const q = query(projectsCol, orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createProject(payload) {
    // images: [{url, path}], beforeImage / afterImage optional
    const data = stripUndefined({
        title: payload.title || '',
        description: payload.description || '',
        location: payload.location || '',
        category: payload.category || 'Instalasi',
        images: payload.images || [],
        beforeImage: payload.beforeImage || null,
        afterImage: payload.afterImage || null,
        completedAt: payload.completedAt || null,
        order: payload.order ?? 0,
        isActive: payload.isActive ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    const ref = await addDoc(projectsCol, data);
    return ref.id;
}

export async function updateProject(id, payload) {
    await updateDoc(doc(db, 'projects', id), stripUndefined({ ...payload, updatedAt: serverTimestamp() }));
}

export async function deleteProject(id, images = []) {
    await deleteDoc(doc(db, 'projects', id));
    await Promise.all(images.map((img) => deleteImage(img?.path)));
}

/* -------------------------------------------------------------------------- */
/*  TESTIMONIALS                                                              */
/* -------------------------------------------------------------------------- */

const testimonialsCol = collection(db, 'testimonials');

export async function getActiveTestimonials() {
    const q = query(testimonialsCol, where('isActive', '==', true), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllTestimonials() {
    const q = query(testimonialsCol, orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createTestimonial(payload) {
    const data = stripUndefined({
        name: payload.name || '',
        role: payload.role || '',
        company: payload.company || '',
        review: payload.review || '',
        rating: payload.rating ?? 5,
        photo: payload.photo || '',
        photoPath: payload.photoPath || '',
        order: payload.order ?? 0,
        isActive: payload.isActive ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    const ref = await addDoc(testimonialsCol, data);
    return ref.id;
}

export async function updateTestimonial(id, payload) {
    await updateDoc(doc(db, 'testimonials', id), stripUndefined({ ...payload, updatedAt: serverTimestamp() }));
}

export async function deleteTestimonial(id, photoPath) {
    await deleteDoc(doc(db, 'testimonials', id));
    if (photoPath) await deleteImage(photoPath);
}

/* -------------------------------------------------------------------------- */
/*  SETTINGS  (single document at settings/global)                            */
/* -------------------------------------------------------------------------- */

const SETTINGS_DOC = doc(db, 'settings', 'global');

export const DEFAULT_SETTINGS = {
    companyName: 'PT. Adytia Putra Teknik',
    tagline: 'Solusi kelistrikan profesional & bersertifikat',
    description:
        'Kami melayani pemasangan, perawatan, dan sertifikasi instalasi listrik untuk industri, komersial, dan rumah tangga di seluruh Indonesia.',
    whatsappNumber: '6285100924911',
    whatsappMessage: 'Halo, saya tertarik dengan layanan kelistrikan Anda.',
    email: 'info@adytiateknik.co.id',
    phone: '+62-8510-0924-9111',
    address: 'Jl. Gading Watu, Menganti, Gresik Jawa Timur',
    ctaPrimaryText: 'Konsultasi Gratis',
    ctaSecondaryText: 'Lihat Layanan',
    heroBadge: 'Bersertifikat SLO & NIDI',
    // SEO
    metaTitle: 'PT. Adytia Putra Teknik â€” Jasa Instalasi Listrik & SLO',
    metaDescription:
        'Jasa pemasangan instalasi listrik, pembuatan SLO & NIDI, dan pemasangan PJU. Tim profesional bersertifikat. Surabaya & sekitarnya.',
    metaKeywords: 'instalasi listrik, SLO, NIDI, PJU, jasa listrik surabaya',
    ogImage: '',
    // Socials
    socials: {
        instagram: '',
        facebook: '',
        youtube: '',
        tiktok: '',
    },
    // Operating hours
    workingHours: 'Senin â€“ Sabtu, 08:00 â€“ 17:00 WIB',
    // Company identity
    website: 'https://pt-adytia.com/',
    direktur: '',
};

export async function getSettings() {
    const snap = await getDoc(SETTINGS_DOC);
    if (!snap.exists()) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...snap.data() };
}

export async function updateSettings(payload) {
    await setDoc(
        SETTINGS_DOC,
        stripUndefined({ ...payload, updatedAt: serverTimestamp() }),
        { merge: true }
    );
}

/**
 * Save (merge) arbitrary fields into settings/global.
 * Alias-friendly wrapper that matches the saveXxx naming convention used elsewhere.
 */
export async function saveSettings(data) {
    await setDoc(
        SETTINGS_DOC,
        stripUndefined({ ...data, updatedAt: serverTimestamp() }),
        { merge: true }
    );
}

/**
 * Upload a company logo to Firebase Storage at a fixed path
 * `settings/company-logo` and return its public download URL.
 * @param {File} file
 * @returns {Promise<string>} download URL
 */
export async function uploadCompanyLogo(file) {
    if (!file) throw new Error('File tidak boleh kosong.');
    if (!file.type.startsWith('image/')) {
        throw new Error('File yang diunggah harus berupa gambar.');
    }
    const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: false,
    });
    const ext = file.name.split('.').pop() || 'png';
    const path = `settings/company-logo.${ext}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, compressed);
    const url = await getDownloadURL(ref);
    return url;
}
