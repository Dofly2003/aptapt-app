import { StyleSheet } from '@react-pdf/renderer';

export const COLORS = {
  primaryBlue: '#003087',
  primaryRed: '#CC0000',
  black: '#000000',
  tableHeader: '#000000',
  white: '#FFFFFF',
  lightGray: '#f5f5f5',
};

export const styles = StyleSheet.create({
  page: {
    size: 'A4',
    paddingTop: 110,
    paddingBottom: 50,
    paddingLeft: 50,
    paddingRight: 50,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000',
  },

  // KopSurat
  kopWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 50,
    paddingTop: 20,
  },
  kopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  kopLogo: { width: 60, height: 60, objectFit: 'contain', marginRight: 12 },
  kopText: { flex: 1 },
  kopLabelLIT: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#003087' },
  kopNama: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#CC0000' },
  kopDetail: { fontSize: 7.5 },
  kopLineBlue: {
    borderBottomWidth: 2,
    borderBottomColor: '#003087',
    marginBottom: 1,
  },
  kopLineRed: {
    borderBottomWidth: 1,
    borderBottomColor: '#CC0000',
    marginBottom: 0,
  },

  // Section header
  sectionHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textDecoration: 'underline',
    marginTop: 12,
    marginBottom: 6,
  },

  // Label-value rows (2 col)
  row: { flexDirection: 'row', marginBottom: 2 },
  rowLabel: { width: 140, fontSize: 9 },
  rowColon: { width: 10, fontSize: 9 },
  rowValue: { flex: 1, fontSize: 9 },

  // Indented row (sub-item a-h)
  rowIndent: { flexDirection: 'row', marginBottom: 2, paddingLeft: 15 },

  // Tabel border
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#000',
    marginBottom: 8,
  },
  tableRow: { flexDirection: 'row' },
  tableHeader: {
    backgroundColor: '#000',
    padding: '4 6',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: '#fff',
  },
  tableHeaderLast: {
    backgroundColor: '#000',
    padding: '4 6',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  tableCell: {
    padding: '3 6',
    fontSize: 8.5,
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderTopWidth: 0.5,
    borderTopColor: '#000',
    flex: 1,
  },
  tableCellLast: {
    padding: '3 6',
    fontSize: 8.5,
    borderTopWidth: 0.5,
    borderTopColor: '#000',
    flex: 1,
  },
  tableCellItalic: {
    padding: '3 6',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Oblique',
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderTopWidth: 0.5,
    borderTopColor: '#000',
    flex: 1,
  },

  // TTD table
  ttdTable: {
    flexDirection: 'row',
    marginTop: 16,
    borderWidth: 0.5,
    borderColor: '#000',
  },
  ttdCell: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#000',
  },
  ttdCellLast: { flex: 1, alignItems: 'center', padding: 8 },
  ttdLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  ttdImg: {
    height: 55,
    width: 100,
    objectFit: 'contain',
    marginBottom: 4,
  },
  ttdNama: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    textAlign: 'center',
  },

  // Foto megger grid
  fotoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  fotoItem: {
    width: '33.33%',
    padding: 3,
    borderWidth: 0.5,
    borderColor: '#000',
  },
  fotoImg: { height: 120, width: '100%', objectFit: 'cover' },
  fotoLabel: {
    fontSize: 8,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },

  // Judul dokumen
  docTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  docNomor: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Paragraph
  para: {
    fontSize: 9,
    textAlign: 'justify',
    marginBottom: 6,
    lineHeight: 1.5,
  },
});
