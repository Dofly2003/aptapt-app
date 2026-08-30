import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';

export default function KopSurat({ lit }) {
  return (
    <View style={styles.kopWrap} fixed>
      <View style={styles.kopRow}>
        {lit?.logoUrl ? (
          <Image style={styles.kopLogo} src={lit.logoUrl} />
        ) : (
          <View style={[styles.kopLogo, { backgroundColor: '#eee' }]} />
        )}
        <View style={styles.kopText}>
          <Text style={styles.kopLabelLIT}>LEMBAGA INSPEKSI TEKNIK</Text>
          <Text style={styles.kopNama}>{lit?.nama ?? ''}</Text>
          <Text style={styles.kopDetail}>{lit?.alamat ?? ''}</Text>
          <Text style={styles.kopDetail}>
            Telp. {lit?.telepon ?? ''}{'  '}|{'  '}Email: {lit?.email ?? ''}
          </Text>
        </View>
      </View>
      <View style={styles.kopLineBlue} />
      <View style={styles.kopLineRed} />
    </View>
  );
}
