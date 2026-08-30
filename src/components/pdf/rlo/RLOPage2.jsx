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

export default function RLOPage2({ pekerjaan, lit }) {
  const p = pekerjaan ?? {};
  const kabelList = p.kabelList ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <KopSurat lit={lit} />

      {/* Section B: Pelaksana Uji */}
      <Text style={styles.sectionHeader}>B. PELAKSANA UJI LAIK OPERASI</Text>

      {/* PJT */}
      <Text style={[styles.para, { fontFamily: 'Helvetica-Bold', marginBottom: 3, fontSize: 9 }]}>
        Penanggung Jawab Teknik (PJT)
      </Text>
      <LabelRow label="Nama" value={lit?.pjt?.nama} />
      <LabelRow label="Nomor Registrasi" value={lit?.pjt?.nomorRegistrasi} />
      <LabelRow label="Jabatan" value="Penanggung Jawab Teknik" />

      <View style={{ marginTop: 6 }} />

      {/* Tenaga Teknik */}
      <Text style={[styles.para, { fontFamily: 'Helvetica-Bold', marginBottom: 3, fontSize: 9 }]}>
        Tim Pelaksana Uji Laik Operasi
      </Text>
      <LabelRow label="Nama" value={lit?.tenagaTeknik?.nama} />
      <LabelRow label="Nomor Registrasi" value={lit?.tenagaTeknik?.nomorRegistrasi} />
      <LabelRow label="Jabatan" value="Tim Pelaksana Uji Laik Operasi" />

      <View style={{ marginTop: 6 }} />

      {/* Perusahaan LIT */}
      <Text style={[styles.para, { fontFamily: 'Helvetica-Bold', marginBottom: 3, fontSize: 9 }]}>
        Lembaga Inspeksi Teknik
      </Text>
      <LabelRow label="Nama LIT" value={lit?.nama} />
      <LabelRow label="Alamat" value={lit?.alamat} />
      <LabelRow label="Telepon" value={lit?.telepon} />
      <LabelRow label="Email" value={lit?.email} />
      <LabelRow
        label="Nomor Perizinan"
        value={
          lit?.nomorPerizinan
            ? `${lit.nomorPerizinan}${lit?.tanggalPerizinan ? ` (${lit.tanggalPerizinan})` : ''}`
            : ''
        }
      />
      <LabelRow
        label="Nomor Registrasi LIT"
        value={
          lit?.nomorRegistrasi
            ? `${lit.nomorRegistrasi}${lit?.tanggalRegistrasi ? ` (${lit.tanggalRegistrasi})` : ''}`
            : ''
        }
      />

      {/* Section C: Hasil Pemeriksaan */}
      <Text style={styles.sectionHeader}>C. HASIL PEMERIKSAAN DAN PENGUJIAN</Text>

      <Text style={styles.para}>
        Telah melaksanakan Pemeriksaan dan Pengujian Instalasi Pemanfaatan Tenaga Listrik
        Tegangan Menengah sesuai dengan ketentuan yang berlaku, dengan data sebagai berikut:
      </Text>

      <LabelRow label="Tanggal Pemeriksaan" value={p.tanggalPemeriksaan} />
      <LabelRow label="Nama Pemilik" value={p.namaPemilikC} />
      <LabelRow label="Alamat Pemilik" value={p.alamatPemilikC} />
      <LabelRow label="Nama Instalasi" value={p.namaInstalasi} />
      <LabelRow label="Alamat Instalasi" value={p.alamatInstalasi} />
      <LabelRow label="Riksa Uji" value={p.riksaUji} />
      <LabelRow label="Koordinat Lokasi" value={p.koordinatLokasi} />
      <LabelRow label="Penyedia Tenaga Listrik" value={p.penyediaTL} />
      <LabelRow label="Nomor Agenda" value={p.nomorAgenda} />

      {/* Data Kabel 20 kV */}
      <View style={{ marginTop: 10 }}>
        <Text style={[styles.para, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>
          1. Kabel 20 kV terdiri dari :
        </Text>
        {kabelList.length === 0 ? (
          <Text style={[styles.para, { paddingLeft: 15, fontFamily: 'Helvetica-Oblique' }]}>
            -
          </Text>
        ) : (
          kabelList.map((kabel, idx) => (
            <View key={idx} style={{ marginBottom: 5, paddingLeft: 15 }}>
              <Text style={{ fontSize: 9 }}>
                {'• '}{kabel.jalur ?? ''}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: 'Helvetica-Oblique',
                  paddingLeft: 12,
                  marginTop: 1,
                }}
              >
                {kabel.merk ?? ''} {kabel.tipe ?? ''} sepanjang {kabel.panjang ?? ''}
              </Text>
            </View>
          ))
        )}
      </View>
    </Page>
  );
}
