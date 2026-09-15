
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { ColumnOption } from '../components/pdf/DraggableColumnList';

// Đăng ký Font Noto Sans JP (từ thư mục public) để hỗ trợ hoàn hảo Tiếng Nhật và Tiếng Việt
Font.register({
  family: 'NotoSansJP',
  src: '/fonts/NotoSansCJKjp-Regular.otf'
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSansJP',
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  headerRow: {
    backgroundColor: '#4f46e5',
  },
  headerCell: {
    padding: 8,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  cell: {
    padding: 8,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    minHeight: 35, // Độ cao để luyện viết
  },
  lastCell: {
    borderRightWidth: 0,
  }
});

const PDFDocument = ({ words, columns }: { words: any[], columns: ColumnOption[] }) => {
  // Tính tỷ lệ % chiều rộng cho mỗi cột (STT chiếm ít, còn lại chia đều)
  const sttWidth = 8;
  const colWidth = (100 - sttWidth) / columns.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Danh sách từ vựng luyện viết</Text>

        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.headerCell, { width: `${sttWidth}%` }]}>STT</Text>
            {columns.map((col, i) => (
              <Text 
                key={col.id} 
                style={[styles.headerCell, { width: `${colWidth}%` }, i === columns.length - 1 ? styles.lastCell : {}]}
              >
                {col.label}
              </Text>
            ))}
          </View>

          {/* Body */}
          {words.map((word, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.cell, { width: `${sttWidth}%` }]}>{index + 1}</Text>
              
              {columns.map((col, i) => {
                let text = '';
                if (col.showContent) {
                  switch (col.id) {
                    case 'kanji': text = word.kanji || ''; break;
                    case 'hanviet': text = word.hanViet || ''; break;
                    case 'hiragana': text = word.hiragana || ''; break;
                    case 'meaning': text = word.meaning || ''; break;
                  }
                }
                
                return (
                  <Text 
                    key={col.id} 
                    style={[styles.cell, { width: `${colWidth}%` }, i === columns.length - 1 ? styles.lastCell : {}]}
                  >
                    {text}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export const exportToPDF = async (words: any[], columns: ColumnOption[]) => {
  try {
    const blob = await pdf(<PDFDocument words={words} columns={columns} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    // Tự động tải file
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tu-vung-luyen-viet.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Lỗi khi tạo PDF với react-pdf:', error);
    throw error;
  }
};
