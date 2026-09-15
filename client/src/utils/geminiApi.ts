import { GoogleGenerativeAI } from "@google/generative-ai";

export const extractVocabularyWithGemini = async (text: string, apiKey: string, modelName: string = "gemini-2.0-flash"): Promise<any[]> => {
  if (!apiKey) throw new Error("API Key is required");

  const prompt = `Bạn là AI chuyên gia về ngôn ngữ Nhật - Việt. Hãy đọc đoạn văn bản sau và trích xuất tất cả các từ vựng tiếng Nhật có trong đó. Trả về KẾT QUẢ DUY NHẤT LÀ MỘT MẢNG JSON HỢP LỆ (không dùng markdown tick, không giải thích). Cấu trúc object: [{"kanji": "...", "hanViet": "...", "hiragana": "...", "meaning": "..."}]. Nếu từ không có Kanji, để rỗng trường kanji và hanViet. Tự động dịch nghĩa tiếng Việt cho từ đó.

Văn bản cần bóc tách:
${text}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Sử dụng model được chọn từ giao diện (mặc định là gemini-2.0-flash)
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent(prompt);
    const resultText = result.response.text();
    
    // Logic làm sạch chuỗi response bằng Regex (loại bỏ markdown code block)
    let cleanJsonStr = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const startIdx = cleanJsonStr.indexOf('[');
    const endIdx = cleanJsonStr.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx !== -1) {
      cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1);
    }
    
    return JSON.parse(cleanJsonStr);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error("Không thể parse kết quả JSON từ AI. Nội dung nhận được không hợp lệ.");
    }
    
    const errorMessage = error?.message?.toLowerCase() || "";
    
    if (errorMessage.includes("api key not valid")) {
      throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại Key của bạn.");
    }
    
    throw error;
  }
};
