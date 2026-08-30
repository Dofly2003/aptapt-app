/**
 * LaporanTeknikPDF.jsx
 * PDF Laporan Teknik Inspeksi Listrik menggunakan @react-pdf/renderer v4
 *
 * Usage:
 *   import LaporanTeknikPDF, { downloadLaporan } from './LaporanTeknikPDF';
 *
 *   // Download
 *   await downloadLaporan(data, instansi, 'FORM-A.3');
 *
 *   // Preview (PDFViewer)
 *   <PDFViewer width="100%" height="800px">
 *     <LaporanTeknikPDF data={data} instansi={instansi} formCode="FORM-A.3" />
 *   </PDFViewer>
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';

// ─── Font ─────────────────────────────────────────────────────────────────────
// Helvetica & Times sudah built-in di @react-pdf/renderer — tidak perlu register.
// Untuk font kustom (misal Times New Roman dari file lokal), uncomment:
//
// Font.register({
//   family: 'TimesNew',
//   fonts: [
//     { src: '/fonts/times.ttf' },
//     { src: '/fonts/timesbd.ttf', fontWeight: 'bold' },
//     { src: '/fonts/timesi.ttf',  fontStyle: 'italic' },
//   ],
// });

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────────────────────────
  page: {
    size: 'A4',
    paddingTop: 20,
    paddingBottom: 36,      // ruang untuk footer
    paddingHorizontal: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000',
    lineHeight: 1.4,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 6,
    marginBottom: 8,
  },
  headerLogo: {
    width: 56,
    height: 40,
    objectFit: 'contain',
  },
  headerLogoPlaceholder: {
    width: 56,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerPtName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
  },
  headerAlamat: {
    fontSize: 7,
    textAlign: 'center',
    color: '#555',
    marginTop: 1,
  },
  headerFormCode: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    textAlign: 'right',
    width: 68,
  },

  // ── Section title ──────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 5,
    marginTop: 8,
  },

  // ── Info table ─────────────────────────────────────────────────────────────
  infoTable: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  infoRowLast: {
    flexDirection: 'row',
  },
  infoLabel: {
    width: '35%',
    padding: 4,
    fontFamily: 'Helvetica-Bold',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  infoValue: {
    width: '65%',
    padding: 4,
    justifyContent: 'center',
  },

  // ── Data table ─────────────────────────────────────────────────────────────
  dataTable: {
    marginBottom: 8,
  },
  dataHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5E6C8',
  },
  dataRow: {
    flexDirection: 'row',
  },
  // cell border — sisi top+left+bottom selalu ada; right hanya di kolom terakhir
  cellBase: {
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    justifyContent: 'center',
  },
  cellLast: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  cellTextBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  cellText: {
    fontSize: 8,
  },
  cellEmpty: {
    fontSize: 8,
    color: '#999',
    fontFamily: 'Helvetica-Oblique',
  },

  // ── Photo table ────────────────────────────────────────────────────────────
  fotoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fotoCell: {
    width: '50%',
    minHeight: 80,
    padding: 4,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoCellLeft: {
    marginRight: 3,
  },
  fotoLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  fotoImg: {
    maxWidth: '100%',
    maxHeight: 120,
    objectFit: 'contain',
  },
  fotoEmpty: {
    fontSize: 7,
    color: '#999',
    fontFamily: 'Helvetica-Oblique',
  },

  // ── Footer (fixed — muncul di setiap halaman) ──────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#bbb',
    borderTopStyle: 'solid',
    paddingTop: 4,
    fontSize: 7,
    color: '#666',
  },
  footerText: {
    fontSize: 7,
    color: '#666',
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function chunkArray(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ─── Header ───────────────────────────────────────────────────────────────────
function PdfHeader({ instansi = {}, formCode = '' }) {
  return (
    <View style={S.headerRow} fixed>
      {/* Logo kiri */}
      {instansi.logo
        ? <Image src={instansi.logo} style={S.headerLogo} />
        : <View style={S.headerLogoPlaceholder} />
      }

      {/* Nama PT + subtitle + alamat — tengah */}
      <View style={S.headerCenter}>
        <Text style={S.headerPtName}>{instansi.nama || 'PT. Adytia Putra Tehnik'}</Text>
        <Text style={S.headerSubtitle}>{instansi.subtitle || 'Konsultan & Kontraktor Listrik'}</Text>
        <Text style={S.headerAlamat}>{instansi.alamat || ''}</Text>
      </View>

      {/* Kode form — kanan */}
      <Text style={S.headerFormCode}>{formCode}</Text>
    </View>
  );
}

// ─── Info Table ───────────────────────────────────────────────────────────────
/**
 * rows: Array<[label: string, value: string]>
 */
function InfoTable({ rows = [] }) {
  return (
    <View style={S.infoTable}>
      {rows.map(([label, value], i) => (
        <View key={i} style={i < rows.length - 1 ? S.infoRow : S.infoRowLast}>
          <View style={S.infoLabel}>
            <Text>{label}</Text>
          </View>
          <View style={S.infoValue}>
            <Text>: {value ?? '-'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────
/**
 * columns: Array<{ label, key, width, align: 'center'|'left' }>
 * rows:    Array<Record<string, string|number>>
 */
function DataTable({ columns = [], rows = [] }) {
  return (
    <View style={S.dataTable}>
      {/* Header */}
      <View style={S.dataHeaderRow}>
        {columns.map((col, ci) => {
          const isLast = ci === columns.length - 1;
          return (
            <View
              key={ci}
              style={[
                S.cellBase,
                isLast && S.cellLast,
                {
                  width: col.width,
                  alignItems: col.align === 'center' ? 'center' : 'flex-start',
                },
              ]}
            >
              <Text style={S.cellTextBold}>{col.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Rows */}
      {rows.length === 0 ? (
        <View style={S.dataRow}>
          <View style={[S.cellBase, S.cellLast, { flex: 1, alignItems: 'center' }]}>
            <Text style={S.cellEmpty}>Belum ada data</Text>
          </View>
        </View>
      ) : rows.map((row, ri) => (
        <View key={ri} style={S.dataRow} wrap={false}>
          {columns.map((col, ci) => {
            const isLast = ci === columns.length - 1;
            return (
              <View
                key={ci}
                style={[
                  S.cellBase,
                  isLast && S.cellLast,
                  {
                    width: col.width,
                    alignItems: col.align === 'center' ? 'center' : 'flex-start',
                  },
                ]}
              >
                <Text style={S.cellText}>{String(row[col.key] ?? '-')}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Foto Table ───────────────────────────────────────────────────────────────
/**
 * items: Array<{ label: string, url: string|null }>
 * Render 2 foto per baris.
 */
function FotoTable({ items = [] }) {
  const pairs = chunkArray(items, 2);
  return (
    <View>
      {pairs.map((pair, ri) => (
        <View key={ri} style={S.fotoRow} wrap={false}>
          {pair.map((item, ci) => (
            <View key={ci} style={[S.fotoCell, ci === 0 && S.fotoCellLeft]}>
              <Text style={S.fotoLabel}>{item.label}</Text>
              {item.url
                ? <Image src={item.url} style={S.fotoImg} />
                : <Text style={S.fotoEmpty}>(tidak ada foto)</Text>
              }
            </View>
          ))}
          {/* Kolom kosong jika jumlah foto ganjil */}
          {pair.length === 1 && (
            <View style={[S.fotoCell, { marginLeft: 3 }]} />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Footer (fixed) ───────────────────────────────────────────────────────────
function PdfFooter({ instansi = {}, tanggal = '' }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>{instansi.alamat || ''}</Text>
      <Text
        style={S.footerText}
        render={({ pageNumber, totalPages }) =>
          `Halaman ${pageNumber} / ${totalPages}`
        }
      />
      <Text style={S.footerText}>{tanggal}</Text>
    </View>
  );
}

// ─── Main Document ─────────────────────────────────────────────────────────────
/**
 * @param {{ data: LaporanData, instansi: InstansiData, formCode: string }} props
 *
 * LaporanData {
 *   nama        : string    — Nama pelanggan / perusahaan
 *   alamat      : string    — Lokasi instalasi
 *   tanggal     : string    — Tanggal pemeriksaan (YYYY-MM-DD)
 *   noLhpp      : string    — No. dokumen LHPP
 *   daya        : string    — Daya terpasang
 *   tarif       : string    — Golongan tarif
 *   tableData   : Array<{ uraian, keterangan, [key]: any }>
 *   photos      : Array<{ label, url }>
 * }
 *
 * InstansiData {
 *   nama        : string
 *   subtitle    : string
 *   alamat      : string
 *   logo        : string    — URL gambar logo
 * }
 */
export default function LaporanTeknikPDF({
  data     = {},
  instansi = {},
  formCode = 'FORM-A.3',
}) {
  const infoRows = [
    ['Nama Perusahaan',      data.nama],
    ['Lokasi',               data.alamat],
    ['Tanggal Pemeriksaan',  data.tanggal],
    ['No. LHPP',             data.noLhpp],
    ['Daya Terpasang',       data.daya],
    ['Tarif',                data.tarif],
  ].filter(([, v]) => v);                     // sembunyikan baris kosong

  const tableColumns = [
    { label: 'No',         key: 'no',          width: '8%',  align: 'center' },
    { label: 'Uraian',     key: 'uraian',       width: '40%', align: 'left'   },
    { label: 'Keterangan', key: 'keterangan',   width: '52%', align: 'left'   },
  ];

  const tableRows = (data.tableData ?? []).map((row, i) => ({
    no: i + 1,
    uraian: row.uraian ?? '',
    keterangan: row.keterangan ?? '',
    ...row,
  }));

  return (
    <Document
      title={`Laporan ${formCode} — ${data.nama ?? ''}`}
      author={instansi.nama ?? 'PT. Adytia Putra Tehnik'}
      creator="Dashboard PT Adytia"
    >
      <Page size="A4" style={S.page}>
        {/* Header — fixed agar muncul di setiap halaman */}
        <PdfHeader instansi={instansi} formCode={formCode} />

        {/* Info laporan */}
        {infoRows.length > 0 && (
          <>
            <Text style={S.sectionTitle}>DATA LAPORAN</Text>
            <InfoTable rows={infoRows} />
          </>
        )}

        {/* Tabel data spesifikasi */}
        {tableRows.length > 0 && (
          <>
            <Text style={S.sectionTitle}>DATA SPESIFIKASI</Text>
            <DataTable columns={tableColumns} rows={tableRows} />
          </>
        )}

        {/* Tabel foto */}
        {(data.photos ?? []).length > 0 && (
          <>
            <Text style={S.sectionTitle}>DOKUMENTASI FOTO</Text>
            <FotoTable items={data.photos} />
          </>
        )}

        {/* Footer fixed — muncul di setiap halaman */}
        <PdfFooter instansi={instansi} tanggal={data.tanggal ?? ''} />
      </Page>
    </Document>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────
/**
 * Render PDF sebagai Blob lalu trigger download langsung.
 *
 * @param {object} data      — props.data
 * @param {object} instansi  — props.instansi
 * @param {string} formCode  — misal 'FORM-A.3'
 * @param {string} [filename]
 */
export async function downloadLaporan(
  data,
  instansi,
  formCode = 'FORM-A.3',
  filename,
) {
  const blob = await pdf(
    <LaporanTeknikPDF data={data} instansi={instansi} formCode={formCode} />,
  ).toBlob();

  const slug = (s = '') =>
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'doc';

  const name =
    filename ??
    `laporan-${formCode.toLowerCase()}-${slug(data.nama)}-${
      (data.tanggal ?? '').replace(/-/g, '')
    }.pdf`;

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Render PDF sebagai Blob URL — untuk dipakai sebagai src iframe.
 * Panggil URL.revokeObjectURL(url) saat komponen di-unmount.
 *
 * @returns {Promise<string>} objectURL
 */
export async function getLaporanBlobUrl(data, instansi, formCode = 'FORM-A.3') {
  const blob = await pdf(
    <LaporanTeknikPDF data={data} instansi={instansi} formCode={formCode} />,
  ).toBlob();
  return URL.createObjectURL(blob);
}
