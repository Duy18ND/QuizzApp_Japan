
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { ColumnOption } from '../components/pdf/DraggableColumnList';

// Lấy base URL từ Vite (xử lý sub-path khi deploy lên GitHub Pages)
const baseUrl = import.meta.env.BASE_URL || '/';
const fontUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}fonts/NotoSansCJKjp-Regular.otf`;

// Đăng ký Font Noto Sans JP
Font.register({
  family: 'NotoSansJP',
  src: fontUrl
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

const PDFDocument = ({ words, columns, disableCustomFont = false }: { words: any[], columns: ColumnOption[], disableCustomFont?: boolean }) => {
  // Tính tỷ lệ % chiều rộng cho mỗi cột (STT chiếm ít, còn lại chia đều)
  const sttWidth = 8;
  const colWidth = (100 - sttWidth) / columns.length;

  return (
    <Document>
      <Page size="A4" style={[styles.page, disableCustomFont ? { fontFamily: 'Helvetica' } : {}]}>
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

// Hàm tiện ích để download file
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async (words: any[], columns: ColumnOption[]) => {
  try {
    // Thử tạo PDF với custom font (Tiếng Nhật)
    const blob = await pdf(<PDFDocument words={words} columns={columns} />).toBlob();
    downloadBlob(blob, 'tu-vung-luyen-viet.pdf');
  } catch (error) {
    console.error('Lỗi khi tạo PDF với custom font:', error);
    
    try {
      // Fallback: Nếu không tải được font, báo lỗi và dùng font mặc định
      console.warn('Đang thử tạo lại PDF bằng font mặc định...');
      alert('Không thể tải font chữ tiếng Nhật (có thể do lỗi mạng hoặc cấu hình). Đang xuất PDF bằng font mặc định, một số ký tự có thể không hiển thị đúng.');
      
      const fallbackBlob = await pdf(<PDFDocument words={words} columns={columns} disableCustomFont={true} />).toBlob();
      downloadBlob(fallbackBlob, 'tu-vung-luyen-viet-fallback.pdf');
    } catch (fallbackError) {
      console.error('Lỗi khi tạo PDF bằng font mặc định:', fallbackError);
      alert('Đã xảy ra lỗi nghiêm trọng khi xuất PDF. Vui lòng thử lại sau.');
      throw fallbackError;
    }
  }
};
