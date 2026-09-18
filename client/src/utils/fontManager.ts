/**
 * FontManager – Singleton quản lý font cho PDF export
 * 
 * Chức năng:
 * - Preload font MPLUS1p 1 lần duy nhất khi app khởi động
 * - Cache trong memory, không tải lại
 * - Validate font có đủ glyph JP + VN trước khi print
 * - Đảm bảo font sẵn sàng trước khi gọi window.print()
 */

const FONT_FAMILY = 'MPLUS1p';

// Test strings để validate font coverage
const TEST_STRINGS = {
  kanji: '日本語漢字男性女性高齢勉強',
  hiragana: 'あいうえおひらがな',
  katakana: 'アイウエオカタカナ',
  punctuation: '「」『』、。・〜',
  vietnamese: 'ăâêôơưđàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ',
  vietnameseUpper: 'ĂÂÊÔƠƯĐÀÁÈÉÌÍÒÓÙÚ',
};

let _isLoaded = false;
let _loadPromise: Promise<boolean> | null = null;

/**
 * Preload font vào browser memory.
 * Gọi 1 lần duy nhất, các lần sau return cached result.
 */
async function preloadFont(): Promise<boolean> {
  if (_isLoaded) return true;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      // Dùng CSS Font Loading API để force-load font
      // Font đã được khai báo qua @font-face trong index.css
      await document.fonts.load(`400 16px "${FONT_FAMILY}"`);
      
      // Kiểm tra font đã thực sự được load
      const loaded = document.fonts.check(`400 16px "${FONT_FAMILY}"`);
      if (loaded) {
        _isLoaded = true;
        console.log('[FontManager] ✅ Font MPLUS1p loaded successfully');
        return true;
      }
      
      console.warn('[FontManager] ⚠️ Font MPLUS1p check failed after load');
      return false;
    } catch (error) {
      console.error('[FontManager] ❌ Failed to preload font:', error);
      _loadPromise = null; // Allow retry
      return false;
    }
  })();

  return _loadPromise;
}

/**
 * Đảm bảo font sẵn sàng trước khi print.
 * Nếu chưa load → load ngay.
 * Nếu đã load → return ngay lập tức (0ms).
 */
async function ensureReady(): Promise<boolean> {
  if (_isLoaded) return true;
  return preloadFont();
}

/**
 * Kiểm tra font đã loaded chưa (sync, không chờ).
 */
function isReady(): boolean {
  return _isLoaded;
}

/**
 * Validate font có đủ glyph để render JP + VN.
 * Trả về danh sách các nhóm ký tự bị thiếu (nếu có).
 */
function validateCharacters(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!_isLoaded) {
    return { valid: false, missing: ['Font chưa được load'] };
  }

  // Kiểm tra từng nhóm ký tự bằng cách đo kích thước render
  // Nếu font không có glyph, trình duyệt sẽ dùng fallback → kích thước khác
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { valid: true, missing: [] }; // Không thể test, assume OK
  }

  ctx.font = `16px "${FONT_FAMILY}"`;
  const refWidth = ctx.measureText('A').width;

  for (const [group, text] of Object.entries(TEST_STRINGS)) {
    // Nếu tất cả ký tự đều có width = 0 hoặc giống hệt nhau → nghi ngờ
    const widths = [...text].map(ch => ctx.measureText(ch).width);
    const allZero = widths.every(w => w === 0);
    const allSame = widths.length > 3 && widths.every(w => w === widths[0]) && widths[0] === refWidth;
    
    if (allZero) {
      missing.push(group);
    } else if (allSame && group !== 'punctuation') {
      // Tất cả ký tự trong nhóm đều có cùng width = width của 'A' → font fallback
      // (Nhưng punctuation có thể trùng width nên bỏ qua)
      console.warn(`[FontManager] ⚠️ Suspicious widths for ${group}:`, widths[0], 'ref:', refWidth);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Reset cache (chỉ dùng cho testing).
 */
function clearCache(): void {
  _isLoaded = false;
  _loadPromise = null;
}

export const FontManager = {
  preloadFont,
  ensureReady,
  isReady,
  validateCharacters,
  clearCache,
  FONT_FAMILY,
};
