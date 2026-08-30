import React from 'react';
import { Page, View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import KopSurat from './KopSurat';

export default function PengujianPage({ pekerjaan, lit }) {
  const p = pekerjaan ?? {};
  const ti = p.tahananIsolasi ?? {};
  const foto = p.fotoMegger ?? {};

  const fotoItems = [
    { key: 'rG', label: 'R-G', src: foto.rG },
    { key: 'sG', label: 'S-G', src: foto.sG },
    { key: 'tG', label: 'T-G', src: foto.tG },
    { key: 'rS', label: 'R-S', src: foto.rS },
    { key: 'sT', label: 'S-T', src: foto.sT },
    { key: 'tR', label: 'T-R', src: foto.tR },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <KopSurat lit={lit} />

      {/* Judul */}
      <Text style={[styles.docTitle, { fontSize: 11, marginBottom: 12 }]}>
        Pengujian Tahanan Isolasi Kabel TM
      </Text>

      {/* Tabel Tahanan Isolasi */}
      <View style={[styles.table, { marginBottom: 16 }]}>
        {/* Header row */}
        <View style={styles.tableRow}>
          <Text style={[styles.tableHeader, { flex: 1 }]}>Phase - Gnd</Text>
          <Text style={[styles.tableHeader, { flex: 1 }]}>Nilai</Text>
          <Text style={[styles.tableHeader, { flex: 1 }]}>Phase - Phase</Text>
          <Text style={[styles.tableHeaderLast, { flex: 1 }]}>Nilai</Text>
        </View>

        {/* Row 1: R-Gnd / R-S */}
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>R - Gnd</Text>
          <Text style={[styles.tableCellItalic]}>{ti.rGnd ?? ''}</Text>
          <Text style={styles.tableCell}>R - S</Text>
          <Text style={[styles.tableCellLast, { fontFamily: 'Helvetica-Oblique' }]}>
            {ti.rS ?? ''}
          </Text>
        </View>

        {/* Row 2: S-Gnd / S-T */}
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>S - Gnd</Text>
          <Text style={styles.tableCellItalic}>{ti.sGnd ?? ''}</Text>
          <Text style={styles.tableCell}>S - T</Text>
          <Text style={[styles.tableCellLast, { fontFamily: 'Helvetica-Oblique' }]}>
            {ti.sT ?? ''}
          </Text>
        </View>

        {/* Row 3: T-Gnd / T-R */}
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>T - Gnd</Text>
          <Text style={styles.tableCellItalic}>{ti.tGnd ?? ''}</Text>
          <Text style={styles.tableCell}>T - R</Text>
          <Text style={[styles.tableCellLast, { fontFamily: 'Helvetica-Oblique' }]}>
            {ti.tR ?? ''}
          </Text>
        </View>
      </View>

      {/* Judul Foto */}
      <Text
        style={{
          fontSize: 10,
          fontFamily: 'Helvetica-Bold',
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        Foto Pengujian Megger
      </Text>

      {/* Grid 6 foto */}
      <View style={styles.fotoGrid}>
        {fotoItems.map((item) => (
          <View key={item.key} style={styles.fotoItem}>
            {item.src ? (
              <Image src={item.src} style={styles.fotoImg} />
            ) : (
              <View style={[styles.fotoImg, { backgroundColor: '#e0e0e0' }]} />
            )}
            <Text style={styles.fotoLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}
