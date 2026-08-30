import React from 'react';
import { Page, View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import KopSurat from './KopSurat';

function InfoRow({ label, value }) {
  return (
    <View style={[styles.row, { borderBottomWidth: 0.5, borderBottomColor: '#ccc', paddingBottom: 3, marginBottom: 3 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowColon}>:</Text>
      <Text style={styles.rowValue}>{value ?? ''}</Text>
    </View>
  );
}

export default function SKLOPage({ pekerjaan, lit }) {
  const p = pekerjaan ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <KopSurat lit={lit} />

      {/* Judul */}
      <Text
        style={[
          styles.docTitle,
          { textDecoration: 'underline', fontSize: 12, marginBottom: 4 },
        ]}
      >
        SURAT KETERANGAN LAIK OPERASI
      </Text>
      <Text style={[styles.docNomor, { marginBottom: 16 }]}>
        Nomor: {p.nomorSKLO ?? ''}
      </Text>

      {/* Paragraf pembuka */}
      <Text style={styles.para}>
        Yang bertanda tangan di bawah ini, Direktur{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          {lit?.nama ?? ''}
        </Text>
        , Lembaga Inspeksi Teknik (LIT) yang telah mendapatkan izin usaha berdasarkan
        Keputusan Menteri Energi dan Sumber Daya Mineral Nomor:{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          {lit?.nomorKepmenESDM ?? ''}
        </Text>
        , dengan ini menerangkan bahwa:
      </Text>

      {/* Tabel info instalasi */}
      <View style={{ marginBottom: 12, marginTop: 4 }}>
        <InfoRow label="Nama Instalasi" value={p.namaInstalasi} />
        <InfoRow label="Nama Pemilik" value={p.namaPemilikC ?? p.namaPemilik} />
        <InfoRow label="Lokasi Instalasi" value={p.alamatInstalasi ?? p.lokasiInstalasi} />
        <InfoRow label="Jenis Instalasi" value={p.jenisInstalasi} />
        <InfoRow label="Daya Tersambung" value={p.dayaTersambung} />
        <InfoRow label="PHBTM" value={p.phbtm} />
        <InfoRow label="PHM TR" value={p.phmTr} />
        <InfoRow label="Kapasitas Trafo" value={p.kapasitasTrafo} />
        <InfoRow label="No. NIDI" value={p.nomorNIDI} />
        <InfoRow label="Agenda SUG" value={p.agendaSUG} />
      </View>

      {/* Paragraf keputusan */}
      <Text style={styles.para}>
        Telah dilakukan pemeriksaan dan pengujian oleh{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{lit?.nama ?? ''}</Text> pada
        tanggal{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.tanggalPemeriksaan ?? ''}</Text>
        {' '}dan hasil pemeriksaan dan pengujian instalasi tersebut dinyatakan{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>BAIK, MEMENUHI STANDAR</Text> dan
        dinyatakan{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>LAIK OPERASI</Text> sesuai dengan
        ketentuan keselamatan ketenagalistrikan yang berlaku.
      </Text>

      {/* Paragraf penutup */}
      <Text style={styles.para}>
        Surat Keterangan Laik Operasi ini berlaku selama instalasi tidak mengalami perubahan
        dan dipergunakan sebagaimana mestinya. Apabila terdapat perubahan instalasi, maka
        wajib dilakukan pemeriksaan dan pengujian ulang.
      </Text>

      {/* Tanggal + TTD Direktur */}
      <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
        <Text style={{ fontSize: 9, marginBottom: 10 }}>{p.tanggalDokumenSKLO ?? ''}</Text>

        {/* TTD + Stempel overlay */}
        <View style={{ width: 120, height: 65, marginBottom: 4, position: 'relative' }}>
          {lit?.stampUrl ? (
            <Image
              src={lit.stampUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 120,
                height: 65,
                objectFit: 'contain',
                opacity: 0.7,
              }}
            />
          ) : null}
          {lit?.direktur?.ttdUrl ? (
            <Image
              src={lit.direktur.ttdUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 120,
                height: 65,
                objectFit: 'contain',
              }}
            />
          ) : (
            <View style={{ width: 120, height: 65 }} />
          )}
        </View>

        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
          {lit?.direktur?.nama ?? ''}
        </Text>
        <Text style={{ fontSize: 8.5, textAlign: 'right', marginTop: 2 }}>Direktur</Text>
      </View>
    </Page>
  );
}
