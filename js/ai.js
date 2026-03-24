// js/ai.js - OOP AI Manager Class
import { Toast } from './toast.js';
import { Storage } from './storage.js';
import { AppUI } from './ui.js';

class AIManager {
    formatTopicName(str) {
        if (!str) return '';
        return str.trim().replace(/\s+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    generate() {
        let topicInput = document.getElementById('topic-input');
        let rawTopic = topicInput ? topicInput.value : '';
        let transcriptInput = document.getElementById('transcript-input');
        let transcriptText = transcriptInput ? transcriptInput.value.trim() : '';
        let userIntent = rawTopic.trim(); 
        
        if (!userIntent && !transcriptText) {
            return Toast.show('Vui lòng nhập Chủ đề hoặc dán đoạn Transcript!', 'warning');
        }

        const aiFocus = document.getElementById('setting-ai-focus').value;
        const aiLevel = document.getElementById('setting-ai-level').value; 
        const aiNum = document.getElementById('setting-ai-num').value;
        const iconStyle = localStorage.getItem('vocabSettingAIIconStyle') || 'Illustrated emoji';

        const focusMap = {
            'general': 'focus on high-frequency, fundamental words.',
            'communication': 'focus on common phrases, collocations, and idioms used in natural spoken English.',
            'business': 'focus on professional vocabulary for corporate, finance, or office environments.',
            'academic': 'focus on high-level academic vocabulary found in IELTS or academic texts.'
        };

        const exampleInstructions = aiFocus === 'communication' 
            ? 'Generate a natural, highly communicative English example sentence (like in a real dialogue).'
            : 'Generate a standard, clear English example sentence.';

        let prompt = "";
        let finalTopicName = userIntent || "YouTube Transcript & Reading";

        // NẾU NGƯỜI DÙNG DÁN TRANSCRIPT YOUTUBE
        if (transcriptText) {
            let safeTranscript = transcriptText.substring(0, 15000); 
            prompt = `Act as an expert English linguistics professor. I will provide a transcript/text below.
1. Read the text and extract EXACTLY ${aiNum} of the most valuable vocabulary words, phrasal verbs, or idioms tailored for a student at ${aiLevel} CEFR Level.
2. Output ONLY a valid JSON array. DO NOT wrap it in markdown block quotes (no \`\`\`json). DO NOT output any introductory or concluding text.

Here is the source text to analyze:
"""
${safeTranscript}
"""

Each extracted item MUST be a JSON object following this exact strict structure:
[
  {
    "topic": "${finalTopicName}",
    "word": "english_word_or_phrase",
    "icon": "STRICTLY 1 single unicode emoji visually representing the word (style: ${iconStyle})",
    "type": "n/v/adj/phrase/idiom",
    "phonetic": "/IPA_pronunciation/",
    "meaning": "nghĩa_tiếng_Việt_ngắn_gọn_ngữ_cảnh_trong_bài",
    "example": "${exampleInstructions}",
    "example_trans": "dịch_sang_tiếng_Việt_câu_ví_dụ",
    "synonyms": "synonym1, synonym2",
    "difficulty": "${aiLevel}"
  }
]`;
        } 
        // NẾU NGƯỜI DÙNG CHỈ NHẬP CHỦ ĐỀ NGẮN
        else {
            prompt = `Act as an expert English linguistics professor. The user wants to learn vocabulary about: "${userIntent}".
1. Analyze this topic and create a concise, professional English topic name (e.g., if they say "đi mua sắm", name it "Shopping & Supermarket").
2. Generate EXACTLY ${aiNum} vocabulary items tailored for ${aiLevel} CEFR Level. ${focusMap[aiFocus]}
3. Output ONLY a valid JSON array. DO NOT wrap it in markdown block quotes (no \`\`\`json). DO NOT output any introductory or concluding text.

Each item MUST be a JSON object following this exact strict structure:
[
  {
    "topic": "Professional English Topic Name",
    "word": "english_word_or_phrase",
    "icon": "STRICTLY 1 single unicode emoji visually representing the word (style: ${iconStyle})",
    "type": "n/v/adj/phrase/idiom",
    "phonetic": "/IPA_pronunciation/",
    "meaning": "nghĩa_tiếng_Việt_ngắn_gọn",
    "example": "${exampleInstructions}",
    "example_trans": "dịch_sang_tiếng_Việt_câu_ví_dụ",
    "synonyms": "synonym1, synonym2",
    "difficulty": "${aiLevel}"
  }
]`;
        }
        
        const outputArea = document.getElementById('ai-output-area');
        const output = document.getElementById('prompt-output');
        const btnGen = document.getElementById('btn-ai-gen');

        outputArea.style.display = 'block';
        output.value = prompt;
        
        output.select();
        document.execCommand('copy');
        
        btnGen.innerHTML = '<i class="fas fa-check-circle"></i> Đã Copy! Đang mở ChatGPT...';
        btnGen.style.backgroundColor = '#10b981'; 
        
        setTimeout(() => {
            btnGen.innerHTML = '<i class="fas fa-magic" style="margin-right: 8px;"></i> Tạo Lệnh & Mở ChatGPT';
            btnGen.style.backgroundColor = 'var(--primary-color)';
            window.open('https://chatgpt.com/', '_blank');
        }, 1500);

        Toast.show('Đã copy Lệnh AI! Hãy dán vào ChatGPT nhé.', 'success');
    }

    importData() {
        let jsonStr = document.getElementById('json-input').value.trim();
        let topicInput = document.getElementById('topic-input');
        let rawTopic = topicInput ? topicInput.value : '';
        let fallbackTopic = this.formatTopicName(rawTopic) || 'Chủ đề chung';
        
        if (!jsonStr) return Toast.show('Vui lòng dán kết quả từ ChatGPT vào đây!', 'warning');
        
        // NÂNG CẤP BẮT LỖI JSON: Dọn sạch mọi markdown code block, text rác dư thừa
        jsonStr = jsonStr.replace(/^[\s\S]*?(?=\[)/, ''); 
        jsonStr = jsonStr.replace(/(?<=\])[\s\S]*$/, ''); 
        
        try {
            const parsedData = JSON.parse(jsonStr);
            if(!Array.isArray(parsedData)) throw new Error("Format is not an Array");

            let finalTopic = parsedData[0]?.topic ? this.formatTopicName(parsedData[0].topic) : fallbackTopic;

            parsedData.forEach(item => {
                item.topic = finalTopic; 
                item.score = 0; 
            });
            
            Storage.data.vocab = [...Storage.getVocab(), ...parsedData];
            Storage.save();
            AppUI.renderAll(); 
            
            if (topicInput) topicInput.value = finalTopic;

            Toast.show(`Đồng bộ thành công ${parsedData.length} từ vựng vào "${finalTopic}"!`, 'success');
            document.getElementById('json-input').value = '';
            document.getElementById('prompt-output').value = '';
            document.getElementById('ai-output-area').style.display = 'none';
        } catch (error) {
            console.error("Lỗi Parsing JSON:", error);
            Toast.show('Dữ liệu không hợp lệ! Hãy chắc chắn ChatGPT trả về đúng định dạng.', 'error');
        }
    }
}

// Dòng Export vô cùng quan trọng để app.js có thể Import được
export const AIPrompt = new AIManager();