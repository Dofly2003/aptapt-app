/**
 * LaporanTeknikPreview.jsx
 * Halaman demo — 3 cara render PDF:
 *   1. PDFViewer  (preview langsung di halaman)
 *   2. Download   (blob → file .pdf)
 *   3. Iframe     (blob URL di-set sebagai src iframe)
 *
 * Route: /dashboard/laporan-teknik-preview  (tambahkan di AnimatedRoutes.jsx jika perlu)
 */

import { useState, useEffect, useRef } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { Download, RefreshCw, Monitor } from 'lucide-react';
import LaporanTeknikPDF, { downloadLaporan, getLaporanBlobUrl } from '../../templates/laporan/LaporanTeknikPDF';

// ─── Data contoh ─────────────────────────────────────────────────────────────
const DEMO_DATA = {
  nama:    'PT. Dharma Anugerah Indah',
  alamat:  'Jl. DS Ploso Kabuh, Jombang',
  tanggal: '2026-05-25',
  noLhpp:  '001/LHPP/ADY/IV/2026',
  daya:    '1.385 kVA',
  tarif:   'INDUSTRI',

  tableData: [
    { uraian: 'Merk',        keterangan: 'Schneider' },
    { uraian: 'Tipe',        keterangan: 'IMDM1A' },
    { uraian: 'Tahun',       keterangan: '2022' },
    { uraian: 'Rating V',    keterangan: '20.000 V' },
    { uraian: 'Rating I',    keterangan: '630 A' },
  ],

  photos: [
    { label: 'Foto Full PHB TM',    url: null },
    { label: 'Foto Nameplate PHB',  url: null },
    { label: 'Foto Relay Proteksi', url: null },
    { label: 'Foto Grounding',      url: null },
  ],
};

const DEMO_INSTANSI = {
  nama:     'PT. Adytia Putra Tehnik',
  subtitle: 'Konsultan & Kontraktor Listrik',
  alamat:   'Jl. Raya Krian No. 10, Sidoarjo 61262',
  logo:     null,   // ganti dengan URL logo jika ada
};

// ─── Komponen ─────────────────────────────────────────────────────────────────
export default function LaporanTeknikPreview() {
  const [mode, setMode]         = useState('viewer');   // 'viewer' | 'iframe'
  const [iframeSrc, setIframeSrc] = useState(null);
  const [loading, setLoading]   = useState(false);
  const blobUrlRef              = useRef(null);

  // Bersihkan blob URL saat unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // ── Iframe: render blob URL ─────────────────────────────────────────────────
  const handleIframePreview = async () => {
    setLoading(true);
    try {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = await getLaporanBlobUrl(DEMO_DATA, DEMO_INSTANSI, 'FORM-A.3');
      blobUrlRef.current = url;
      setIframeSrc(url);
      setMode('iframe');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadLaporan(DEMO_DATA, DEMO_INSTANSI, 'FORM-A.3');
    } catch (err) {
      console.error(err);
      alert('Gagal download: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-slate-700 flex-1">
          Preview Laporan Teknik — @react-pdf/renderer
        </h1>

        {/* Toggle mode */}
        <button
          onClick={() => setMode('viewer')}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border transition ${
            mode === 'viewer'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Monitor className="w-4 h-4" /> PDFViewer
        </button>

        <button
          onClick={handleIframePreview}
          disabled={loading}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border transition ${
            mode === 'iframe'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          } disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Iframe (Blob URL)
        </button>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Preview area */}
      <div className="p-4">
        {/* ── 1. PDFViewer: render langsung di halaman ─────────────────────── */}
        {mode === 'viewer' && (
          <PDFViewer
            width="100%"
            height="800px"
            style={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
          >
            <LaporanTeknikPDF
              data={DEMO_DATA}
              instansi={DEMO_INSTANSI}
              formCode="FORM-A.3"
            />
          </PDFViewer>
        )}

        {/* ── 2. Iframe: preview via blob URL ──────────────────────────────── */}
        {mode === 'iframe' && (
          iframeSrc
            ? (
              <iframe
                src={iframeSrc}
                title="Preview Laporan PDF"
                width="100%"
                height="800px"
                style={{
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  display: 'block',
                }}
              />
            )
            : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                {loading ? 'Membuat PDF...' : 'Klik tombol "Iframe" untuk memuat preview'}
              </div>
            )
        )}
      </div>
    </div>
  );
}
