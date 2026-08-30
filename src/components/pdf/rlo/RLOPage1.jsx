import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import KopSurat from './KopSurat';

function LabelRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowColon}>:</Text>
      <Text style={styles.rowValue}>{value ?? ''}</Text>
    </View>
  );
}

function IndentRow({ prefix, label, value }) {
  return (
    <View style={styles.rowIndent}>
      <Text style={[styles.rowLabel, { width: 20, fontSize: 9 }]}>{prefix}</Text>
      <Text style={[styles.rowLabel, { width: 120, fontSize: 9 }]}>{label}</Text>
      <Text style={styles.rowColon}>:</Text>
      <Text style={styles.rowValue}>{value ?? ''}</Text>
    </View>
  );
}

export default function RLOPage1({ pekerjaan, lit }) {
  const p = pekerjaan ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <KopSurat lit={lit} />

      {/* Judul Dokumen */}
      <Text style={styles.docTitle}>
        Rekomendasi Laik Operasi (RLO)
      </Text>
      <Text style={styles.docNomor}>Nomor: {p.nomorRLO ?? ''}</Text>

      {/* Section A */}
      <Text style={styles.sectionHeader}>A. DATA UMUM DAN IDENTITAS</Text>

      {/* Sub-section 1: Permohonan Sertifikasi */}
      <Text style={[styles.sectionHeader, { fontSize: 8.5, marginTop: 6 }]}>
        1. Permohonan Sertifikasi
      </Text>
      <LabelRow label="Nama Pemohon" value={p.namaPemohon} />
      <LabelRow label="Nomor NIDI" value={p.nomorNIDI} />
      <LabelRow label="Tanggal NIDI" value={p.tanggalNIDI} />

      {/* Sub-section 2: Pemilik Instalasi */}
      <Text style={[styles.sectionHeader, { fontSize: 8.5, marginTop: 8 }]}>
        2. Pemilik Instalasi
      </Text>
      <LabelRow label="Nama Pemilik" value={p.namaPemilik} />
      <LabelRow label="Alamat Pemilik" value={p.alamatPemilik} />
      <LabelRow label="LIT Pelaksana" value={lit?.nama ?? ''} />
      <LabelRow label="Jenis Instalasi" value={p.jenisInstalasi} />
      <LabelRow label="Lokasi Instalasi" value={p.lokasiInstalasi} />
      <LabelRow label="Koordinat Instalasi" value={p.koordinatInstalasi} />

      {/* Sub-section 3: SPJBTL/SIP */}
      <Text style={[styles.sectionHeader, { fontSize: 8.5, marginTop: 8 }]}>
        3. SPJBTL / SIP
      </Text>
      <LabelRow label="Nomor SPJBTL" value={p.nomorSPJBTL} />
      <LabelRow label="Tanggal SPJBTL" value={p.tanggalSPJBTL} />

      <View style={{ marginTop: 4 }} />

      <IndentRow prefix="a." label="Jenis Instalasi SPJBTL" value={p.jenisInstalasiSPJBTL} />
      <IndentRow prefix="b." label="Instalasi Pemanfaatan" value={p.instalasiPemanfaatan} />
      <IndentRow prefix="c." label="Kapasitas Trafo" value={p.kapasitasTrafo} />
      <IndentRow prefix="d." label="Panjang Saluran" value={p.panjangSaluran} />
      <IndentRow prefix="e." label="Daya Tersambung" value={p.dayaTersambung} />
      <IndentRow prefix="f." label="Penyedia Tenaga Listrik" value={p.penyediaTL} />
      <IndentRow prefix="g." label="Jenis Instalasi" value={p.jenisInstalasi} />
      <IndentRow prefix="h." label="Lokasi Instalasi" value={p.lokasiInstalasi} />
    </Page>
  );
}
