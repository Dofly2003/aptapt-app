import React from 'react';
import { Document } from '@react-pdf/renderer';
import RLOPage1 from './RLOPage1';
import RLOPage2 from './RLOPage2';
import RLOPage3 from './RLOPage3';
import PengujianPage from './PengujianPage';
import SKLOPage from './SKLOPage';

export default function RLODocument({ pekerjaan, lit }) {
  return (
    <Document>
      <RLOPage1 pekerjaan={pekerjaan} lit={lit} />
      <RLOPage2 pekerjaan={pekerjaan} lit={lit} />
      <RLOPage3 pekerjaan={pekerjaan} lit={lit} />
      <PengujianPage pekerjaan={pekerjaan} lit={lit} />
      <SKLOPage pekerjaan={pekerjaan} lit={lit} />
    </Document>
  );
}
