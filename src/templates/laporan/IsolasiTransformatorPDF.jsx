/**
 * IsolasiTransformatorPDF.jsx
 * PDF Laporan C.1 — Pengukuran Tahanan Isolasi Transformator
 * @react-pdf/renderer v4
 *
 * Usage:
 *   import { downloadIsolasiPDF } from './IsolasiTransformatorPDF';
 *   await downloadIsolasiPDF({ form, photos, instansi, ttd });
 *
 * Data paths (existing structure):
 *   nilai  → form.part1.trafo.isolasi_primer.rGnd
 *   photos → photos.part1["trafo.isolasi_primer.rGnd"][0] = pengukuran, [1] = nilai
 */

import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, pdf,
} from '@react-pdf/renderer';

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    size: 'A4',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111',
    lineHeight: 1.4,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLogo: { width: 52, height: 38, objectFit: 'contain' },
  headerLogoBox: { width: 52, height: 38, backgroundColor: '#f0f0f0', borderRadius: 2 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerPt: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center' },
  headerSub: { fontSize: 8, textAlign: 'center', marginTop: 2, color: '#333' },
  headerAlamat: { fontSize: 7, textAlign: 'center', color: '#666', marginTop: 1 },
  headerCode: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right', width: 60 },

  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#aaa',
    borderTopStyle: 'solid',
    borderBottomWidth: 0.5,
    borderBottomColor: '#aaa',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
    marginBottom: 10,
  },

  // Tabel 3 kolom
  tablesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tableCol: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
  },
  colHeader: { backgroundColor: '#e2e8f0', paddingVertical: 4, paddingHorizontal: 6, alignItems: 'center' },
  colHeaderText: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  subHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    backgroundColor: '#f8fafc',
  },
  subHeaderLabel: { flex: 1, paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555' },
  subHeaderVal: { width: 44, textAlign: 'right', paddingHorizontal: 4, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555', borderLeftWidth: 0.5, borderLeftColor: '#ccc', borderLeftStyle: 'solid' },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
    paddingVertical: 3,
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableRowHighlight: { backgroundColor: '#dbeafe' },
  tableRowDivider: { borderTopWidth: 0.5, borderTopColor: '#bbb', borderTopStyle: 'solid' },
  cellLabel: { flex: 1, paddingHorizontal: 4, fontSize: 8 },
  cellValue: {
    width: 44,
    textAlign: 'right',
    paddingHorizontal: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    borderLeftWidth: 0.5,
    borderLeftColor: '#ccc',
    borderLeftStyle: 'solid',
  },
  cellValueMuted: { color: '#aaa' },

  // Hasil Evaluasi
  evalBox: {
    borderWidth: 0.5, borderColor: '#bbb', borderStyle: 'solid',
    borderRadius: 4, padding: 8, marginBottom: 12,
  },
  evalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 3 },
  evalText: { fontSize: 10, color: '#333' },

  // Foto
  photoSectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'center', marginBottom: 8 },
  photoGroupLabel: { fontFamily: 'Helvetica-Oblique', fontSize: 9, marginBottom: 4, color: '#444' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  photoItem: { width: 85 },
  photoImg: { width: 85, height: 70, objectFit: 'cover', borderWidth: 0.5, borderColor: '#ddd', borderStyle: 'solid', borderRadius: 3 },
  photoEmpty: {
    width: 85, height: 70, backgroundColor: '#f1f5f9',
    borderWidth: 0.5, borderColor: '#ddd', borderStyle: 'solid', borderRadius: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  photoEmptyText: { fontSize: 7, color: '#aaa', textAlign: 'center' },
  photoLabel: { fontSize: 7, textAlign: 'center', marginTop: 2, color: '#555' },

  // TTD
  ttdRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  ttdBox: { width: 200, alignItems: 'center' },
  ttdCity: { fontSize: 9, marginBottom: 2 },
  ttdCompany: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 4 },
  ttdImgWrapper: { height: 80, width: 160, alignItems: 'center', justifyContent: 'center' },
  ttdImg: { width: 140, height: 72, objectFit: 'contain' },
  ttdLine: { borderTopWidth: 0.5, borderTopColor: '#000', borderTopStyle: 'solid', width: '100%', paddingTop: 3, alignItems: 'center', marginTop: 2 },
  ttdName: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  ttdJabatan: { fontSize: 8, color: '#555' },
});

// ─── Field definitions (keys match IsolasiTransformatorSection) ───────────────

const PRIMER_FIELDS = [
  { key: 'rg', label: 'R–G' },
  { key: 'sg', label: 'S–G' },
  { key: 'tg', label: 'T–G' },
  { key: 'rs', label: 'R–S', interphase: true },
  { key: 'st', label: 'S–T', interphase: true },
  { key: 'tr', label: 'T–R', interphase: true },
];

const SEKUNDER_FIELDS = [
  { key: 'rg', label: 'R–G' },
  { key: 'sg', label: 'S–G' },
  { key: 'tg', label: 'T–G' },
  { key: 'ng', label: 'N–G', highlight: true },
  { key: 'rs', label: 'R–S', interphase: true },
  { key: 'st', label: 'S–T', interphase: true },
  { key: 'tr', label: 'T–R', interphase: true },
];

const PS_FIELDS = [
  { key: 'rr', label: 'R–R' },
  { key: 'ss', label: 'S–S' },
  { key: 'tt', label: 'T–T' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Baca nilai dari isolasiTransformator.{sub}.{key}.nilai
function gv(isolasiT, sub, key) {
  const v = isolasiT?.[sub]?.[key]?.nilai;
  return (v === '' || v == null) ? '-' : String(v);
}

// Baca foto dari photos["trafo.isolasiTransformator.{sub}.{key}"][0]
function gp(photos1, sub, key) {
  const photoKey = `trafo.isolasiTransformator.${sub}.${key}`;
  const arr = photos1?.[photoKey] ?? [];
  return arr[0] ?? null;
}

const isZero = (v) => v !== '-' && (Number(v) === 0);

// ─── Sub-components ───────────────────────────────────────────────────────────

function PdfHeader({ instansi = {} }) {
  return (
    <View style={S.headerRow} fixed>
      {instansi.logo
        ? <Image src={instansi.logo} style={S.headerLogo} />
        : <View style={S.headerLogoBox} />
      }
      <View style={S.headerCenter}>
        <Text style={S.headerPt}>{instansi.nama || 'PT. Adytia Putra Tehnik'}</Text>
        <Text style={S.headerSub}>{instansi.subtitle || 'Konsultan & Kontraktor Listrik'}</Text>
        {instansi.alamat ? <Text style={S.headerAlamat}>{instansi.alamat}</Text> : null}
      </View>
      <Text style={S.headerCode}>C.1</Text>
    </View>
  );
}

function IsolasiTable({ title, sub, fields, isolasiT }) {
  return (
    <View style={S.tableCol}>
      <View style={S.colHeader}>
        <Text style={S.colHeaderText}>{title}</Text>
      </View>
      <View style={S.subHeader}>
        <Text style={S.subHeaderLabel}>Titik Ukur</Text>
        <Text style={S.subHeaderVal}>MΩ</Text>
      </View>
      {fields.map((f, idx) => {
        const nilai = gv(isolasiT, sub, f.key);
        const prevInterphase = idx > 0 && fields[idx - 1].interphase;
        const muted = f.interphase && isZero(nilai);
        return (
          <View key={f.key} style={[
            S.tableRow,
            idx === fields.length - 1 && S.tableRowLast,
            f.highlight && S.tableRowHighlight,
            f.interphase && !prevInterphase && S.tableRowDivider,
          ]}>
            <Text style={S.cellLabel}>{f.label}</Text>
            <Text style={[S.cellValue, muted && S.cellValueMuted]}>{nilai}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PhotoGroup({ label, items }) {
  if (items.every(i => !i.url)) return null;
  return (
    <View>
      <Text style={S.photoGroupLabel}>{label}</Text>
      <View style={S.photoGrid}>
        {items.map((item, idx) => (
          <View key={idx} style={S.photoItem}>
            {item.url
              ? <Image src={item.url} style={S.photoImg} />
              : <View style={S.photoEmpty}><Text style={S.photoEmptyText}>Tidak ada foto</Text></View>
            }
            <Text style={S.photoLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PdfTtd({ ttd = {}, instansi = {} }) {
  const lokasi = (instansi.alamat || '').split(',').pop()?.trim() || '';
  const tanggal = (() => {
    try {
      const d = ttd.tanggal ? new Date(ttd.tanggal) : new Date();
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();
  return (
    <View style={S.ttdRow}>
      <View style={S.ttdBox}>
        <Text style={S.ttdCity}>{lokasi ? `${lokasi}, ` : ''}{tanggal}</Text>
        <Text style={S.ttdCompany}>{instansi.nama || ''}</Text>
        <View style={S.ttdImgWrapper}>
          {ttd.signature?.url && <Image src={ttd.signature.url} style={S.ttdImg} />}
        </View>
        <View style={S.ttdLine}>
          <Text style={S.ttdName}>{ttd.nama || '(........................)'}</Text>
          {ttd.jabatan ? <Text style={S.ttdJabatan}>{ttd.jabatan}</Text> : null}
        </View>
      </View>
    </View>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────
/**
 * @param {{
 *   form:     object  — full form state { part1, part2 }
 *   photos:   object  — full photos state { part1, part2 }
 *   instansi: object
 *   ttd:      object
 * }}
 */
export default function IsolasiTransformatorPDF({ form = {}, photos = {}, instansi = {}, ttd = {} }) {
  const isolasiT  = form.part1?.trafo?.isolasiTransformator ?? {};
  const photos1   = photos.part1 ?? {};
  const hasilEval = isolasiT.hasilEvaluasi ?? '';

  // Foto per titik ukur dari IsolasiTransformatorSection (1 foto per titik)
  const buildPhotoItems = (sub, fields) =>
    fields.map(f => ({
      label: f.label,
      url: gp(photos1, sub, f.key),
    }));

  const primerPhotos   = buildPhotoItems('primer',         PRIMER_FIELDS);
  const sekunderPhotos = buildPhotoItems('sekunder',       SEKUNDER_FIELDS);
  const psPhotos       = buildPhotoItems('primerSekunder', PS_FIELDS);
  const hasAnyPhoto    = [...primerPhotos, ...sekunderPhotos, ...psPhotos].some(i => i.url);

  return (
    <Document
      title="C.1 Pengukuran Tahanan Isolasi Transformator"
      author={instansi.nama ?? 'PT. Adytia Putra Tehnik'}
      creator="Dashboard PT Adytia"
    >
      <Page size="A4" style={S.page} wrap>
        <PdfHeader instansi={instansi} />

        <Text style={S.sectionTitle}>PENGUKURAN TAHANAN ISOLASI TRANSFORMATOR</Text>

        {/* 3 kolom tabel berdampingan */}
        <View style={S.tablesRow}>
          <IsolasiTable title="Isolasi Primer"    sub="primer"         fields={PRIMER_FIELDS}   isolasiT={isolasiT} />
          <IsolasiTable title="Isolasi Sekunder"  sub="sekunder"       fields={SEKUNDER_FIELDS} isolasiT={isolasiT} />
          <IsolasiTable title="Primer – Sekunder" sub="primerSekunder" fields={PS_FIELDS}       isolasiT={isolasiT} />
        </View>

        {/* Hasil Evaluasi */}
        {hasilEval ? (
          <View style={S.evalBox}>
            <Text style={S.evalLabel}>Hasil Evaluasi:</Text>
            <Text style={S.evalText}>{hasilEval}</Text>
          </View>
        ) : null}

        {/* Foto Dokumentasi */}
        {hasAnyPhoto && (
          <>
            <Text style={S.photoSectionTitle}>FOTO DOKUMENTASI MEGGER</Text>
            <PhotoGroup label="Isolasi Primer"     items={primerPhotos}   />
            <PhotoGroup label="Isolasi Sekunder"   items={sekunderPhotos} />
            <PhotoGroup label="Primer – Sekunder"  items={psPhotos}       />
          </>
        )}

        <PdfTtd ttd={ttd} instansi={instansi} />
      </Page>
    </Document>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────
export async function downloadIsolasiPDF({ form, photos, instansi, ttd, filename }) {
  const blob = await pdf(
    <IsolasiTransformatorPDF form={form} photos={photos} instansi={instansi} ttd={ttd} />
  ).toBlob();

  const pelanggan = form.part1?.namaPelanggan ?? form.nama ?? 'laporan';
  const slug = (s = '') =>
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'doc';
  const name = filename ?? `c1-isolasi-trafo-${slug(pelanggan)}.pdf`;

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
