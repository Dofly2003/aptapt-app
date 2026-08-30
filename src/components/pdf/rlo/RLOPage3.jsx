import React from 'react';
import { Page, View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import KopSurat from './KopSurat';

export default function RLOPage3({ pekerjaan, lit }) {
  const p = pekerjaan ?? {};
  const cubicleList = p.cubicleList ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <KopSurat lit={lit} />

      {/* Lanjutan: Cubicle MV */}
      <Text style={[styles.para, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>
        2. Cubicle MV 24 kV terdiri dari :
      </Text>
      {cubicleList.length === 0 ? (
        <Text style={[styles.para, { paddingLeft: 15, fontFamily: 'Helvetica-Oblique' }]}>
          -
        </Text>
      ) : (
        cubicleList.map((cubicle, idx) => (
          <View key={idx} style={{ marginBottom: 5, paddingLeft: 15 }}>
            <Text style={{ fontSize: 9 }}>
              {'• '}{cubicle.jenis ?? ''}
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'Helvetica-Oblique',
                paddingLeft: 12,
                marginTop: 1,
              }}
            >
              {cubicle.merk ?? ''} Tipe {cubicle.tipe ?? ''} Tahun Pembuatan:{' '}
              {cubicle.tahunPembuatan ?? ''}, S/N: {cubicle.serialNumber ?? ''}
            </Text>
          </View>
        ))
      )}

      {/* Section D: Kesimpulan */}
      <Text style={styles.sectionHeader}>D. KESIMPULAN</Text>

      <Text style={styles.para}>
        Berdasarkan hasil pemeriksaan dan pengujian yang telah dilaksanakan, instalasi
        pemanfaatan tenaga listrik tegangan menengah milik{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.namaPemilikC ?? ''}</Text> yang
        berlokasi di{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.alamatInstalasi ?? ''}</Text>{' '}
        dinyatakan telah memenuhi persyaratan keselamatan ketenagalistrikan sesuai ketentuan
        yang berlaku.
      </Text>

      <Text style={styles.para}>
        Instalasi tersebut telah diperiksa dan diuji pada tanggal{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.tanggalPemeriksaan ?? ''}</Text>{' '}
        dan dinyatakan dalam kondisi{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          BAIK, MEMENUHI STANDAR
        </Text>{' '}
        serta{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>LAIK OPERASI</Text>.
      </Text>

      {/* Section E: Rekomendasi */}
      <Text style={styles.sectionHeader}>E. REKOMENDASI</Text>

      <Text style={styles.para}>
        Disarankan agar pemilik instalasi melaksanakan{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          preventive maintenance
        </Text>{' '}
        secara berkala sesuai dengan standar dan prosedur yang berlaku, guna menjaga
        keandalan dan keselamatan operasional instalasi tenaga listrik tersebut.
      </Text>

      <Text style={styles.para}>
        Demikian Rekomendasi Laik Operasi ini dibuat dengan sebenarnya untuk dapat
        dipergunakan sebagaimana mestinya.
      </Text>

      {/* Tanggal dokumen */}
      <View style={{ alignItems: 'flex-end', marginTop: 10 }}>
        <Text style={{ fontSize: 9 }}>{p.tanggalDokumenRLO ?? ''}</Text>
      </View>

      {/* Tabel TTD 3 kolom */}
      <View style={styles.ttdTable}>
        {/* Kolom 1: Direktur */}
        <View style={styles.ttdCell}>
          <Text style={styles.ttdLabel}>Direktur</Text>
          {/* TTD + Stempel ditumpuk */}
          <View style={{ width: 100, height: 55, position: 'relative', marginBottom: 4 }}>
            {lit?.stampUrl ? (
              <Image
                src={lit.stampUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 100,
                  height: 55,
                  objectFit: 'contain',
                  opacity: 0.8,
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
                  width: 100,
                  height: 55,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <View style={{ width: 100, height: 55 }} />
            )}
          </View>
          <Text style={styles.ttdNama}>{lit?.direktur?.nama ?? ''}</Text>
        </View>

        {/* Kolom 2: PJT */}
        <View style={styles.ttdCell}>
          <Text style={styles.ttdLabel}>Penanggung Jawab Teknik</Text>
          {lit?.pjt?.ttdUrl ? (
            <Image src={lit.pjt.ttdUrl} style={styles.ttdImg} />
          ) : (
            <View style={styles.ttdImg} />
          )}
          <Text style={styles.ttdNama}>{lit?.pjt?.nama ?? ''}</Text>
        </View>

        {/* Kolom 3: Tenaga Teknik */}
        <View style={styles.ttdCellLast}>
          <Text style={styles.ttdLabel}>Tim Pelaksana Uji Laik Operasi</Text>
          {lit?.tenagaTeknik?.ttdUrl ? (
            <Image src={lit.tenagaTeknik.ttdUrl} style={styles.ttdImg} />
          ) : (
            <View style={styles.ttdImg} />
          )}
          <Text style={styles.ttdNama}>{lit?.tenagaTeknik?.nama ?? ''}</Text>
        </View>
      </View>
    </Page>
  );
}
