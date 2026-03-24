// js/app.js - OOP Main Application Class
import { Toast } from './toast.js';
import { Storage } from './storage.js';
import { AppUI } from './ui.js';
import { AIPrompt } from './ai.js';
import { QuizSystem } from './quiz.js';
import { AudioManager } from './audio.js';

class VocabApp {
    constructor() {
        // Khởi tạo các module lõi khi App chạy
        this.initCore();
        this.bindGlobalEvents();
        this.setupSettings();
    }

    initCore() {
        try {
            Storage.init();
            AppUI.init();
            Toast.show("App đã sẵn sàng (OOP Mode)!", "success");
        } catch (error) {
            console.error("Lỗi khởi động App:", error);
            Toast.show("Có lỗi xảy ra khi tải ứng dụng!", "error");
        }
    }

    // Gom các hàm gọi từ HTML (onClick) vào một nơi để quản lý
    bindGlobalEvents() {
        window.generatePrompt = () => AIPrompt.generate();
        window.importVocab = () => AIPrompt.importData();

        // --- ĐIỀU KHIỂN LUYỆN TẬP MỚI (CHUẨN 1-CLICK) ---
        window.startSpecificPractice = (mode) => {
            const topic = document.getElementById('practice-topic').value;
            QuizSystem.start(topic, mode);
        };

        // ĐĂNG KÝ HÀM TOÀN CỤC CHO TAB AI
        window.switchAIInput = (mode, btnElement) => {
            // 1. Xử lý trạng thái Active của nút
            const buttons = document.querySelectorAll('.ai-tab-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            btnElement.classList.add('active');

            // 2. Lấy các phần tử giao diện
            const topicMode = document.getElementById('ai-mode-topic');
            const transcriptMode = document.getElementById('ai-mode-transcript');
            const topicInput = document.getElementById('topic-input');
            const transcriptInput = document.getElementById('transcript-input');

            // 3. Chuyển đổi hiển thị
            if (mode === 'topic') {
                if (topicMode) topicMode.style.display = 'block';
                if (transcriptMode) transcriptMode.style.display = 'none';
                if (transcriptInput) transcriptInput.value = ''; // Xóa bài báo nếu học theo chủ đề
            } else {
                if (topicMode) topicMode.style.display = 'none';
                if (transcriptMode) transcriptMode.style.display = 'block';
                if (topicInput) topicInput.value = ''; // Xóa chủ đề nếu học theo bài báo
            }
        };

        window.nextPractice = () => QuizSystem.next();
        window.endPractice = () => QuizSystem.end();
        window.restartPractice = () => QuizSystem.restartSession();

        window.speakQuizWord = () => AudioManager.speak(QuizSystem.currentWord.word);
        window.speakWord = (word) => AudioManager.speak(word);

        // Điều khiển Flashcard (Lật, Lướt, Gõ từ)
        window.flipCard = () => QuizSystem.flipCard();
        window.nextFlashcard = () => QuizSystem.navigateFlashcard(1);
        window.prevFlashcard = () => QuizSystem.navigateFlashcard(-1);
        window.checkTyping = (inputId) => QuizSystem.checkTyping(inputId);

        // GẮN CẢM BIẾN LƯỚT TIKTOK (SWIPE) VÀ BÀN PHÍM (PC)
        let touchstartY = 0;
        const workspace = document.getElementById('practice-workspace');

        workspace.addEventListener('touchstart', e => {
            if (document.getElementById('mode-flashcard').style.display !== 'none') touchstartY = e.changedTouches[0].screenY;
        }, { passive: true });

        workspace.addEventListener('touchend', e => {
            if (document.getElementById('mode-flashcard').style.display !== 'none') {
                const touchendY = e.changedTouches[0].screenY;
                if (touchendY < touchstartY - 40) window.nextFlashcard(); // Vuốt Lên -> Trượt tiếp
                if (touchendY > touchstartY + 40) window.prevFlashcard(); // Vuốt Xuống -> Lùi lại
            }
        }, { passive: true });

        document.addEventListener('keydown', (e) => {
            if (document.getElementById('mode-flashcard').style.display !== 'none') {
                if (e.code === 'Space') { e.preventDefault(); window.flipCard(); }
                if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { e.preventDefault(); window.nextFlashcard(); }
                if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { e.preventDefault(); window.prevFlashcard(); }
            }
        });

        // --- QUẢN LÝ DỮ LIỆU ---
        window.exportData = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Storage.getVocab()));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `Vocab_Backup_${new Date().toISOString().slice(0, 10)}.json`);
            dlAnchorElem.click();
            Toast.show('Đã tải xuống file sao lưu!', 'success');
        };

        window.importDataFromFile = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!Array.isArray(importedData)) throw new Error("Invalid format");
                    Storage.data.vocab = importedData;
                    Storage.save();
                    AppUI.renderAll();
                    Toast.show(`Đã phục hồi ${importedData.length} từ vựng!`, 'success');
                } catch (err) {
                    Toast.show('File Backup không hợp lệ!', 'error');
                }
                event.target.value = '';
            };
            reader.readAsText(file);
        };

        window.resetProgress = () => {
            if (confirm('Bạn có muốn reset toàn bộ điểm số luyện tập (Đưa về 0) không?')) {
                Storage.data.vocab.forEach(v => v.score = 0);
                Storage.save();
                Toast.show('Đã reset điểm số luyện tập!', 'success');
            }
        };

        window.studyTopic = (topicName) => {
            // Chuyển UI sang tab Đấu trường
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.toggle('active', nav.getAttribute('data-target') === 'tab-practice');
            });

            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
                tab.style.display = ''; // TRẢ LẠI QUYỀN CHO CSS
                tab.style.opacity = '0';
            });

            const practiceTab = document.getElementById('tab-practice');
            practiceTab.style.display = ''; // TRẢ LẠI QUYỀN CHO CSS

            setTimeout(() => { practiceTab.classList.add('active'); practiceTab.style.opacity = '1'; }, 10);

            // Tự động kích hoạt Flashcard
            document.getElementById('practice-topic').value = topicName;
            QuizSystem.start(topicName, 'flashcard');
        };


        // --- MỞ SỔ TAY TỔNG HỢP ---
        window.openNotebook = () => {
            const words = Storage.getVocab();
            if (words.length === 0) return Toast.show('Thư viện đang trống!', 'warning');

            document.getElementById('modal-topic-title').innerText = 'Tất cả từ vựng';
            document.getElementById('search-notebook').value = '';

            const listHtml = words.map(w => `
                <li>
                    <div class="modal-word-info">
                        <div class="modal-word-icon">${w.icon && w.icon.length < 5 ? w.icon : '📝'}</div>
                        <div>
                            <div class="modal-word-text" style="display: flex; align-items: center; gap: 8px;">
                                ${w.word}
                                <button onclick="speakWord('${w.word.replace(/'/g, "\\'")}')" style="background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: 1.1rem; padding: 4px; transition: 0.2s;" onmousedown="this.style.transform='scale(0.8)'" onmouseup="this.style.transform='scale(1)'"><i class="fas fa-volume-up"></i></button>
                            </div>
                            <div class="modal-word-meaning">${w.meaning}</div>
                        </div>
                    </div>
                    <div class="modal-word-type">${w.difficulty || w.topic || 'N/A'}</div>
                </li>
            `).join('');

            document.getElementById('modal-word-list').innerHTML = listHtml;
            document.getElementById('topic-modal').style.display = 'flex';
        };

        // --- XEM TỪ VỰNG CỦA RIÊNG MỘT CHỦ ĐỀ ---
        window.viewTopic = (topicName) => {
            const words = Storage.getVocab().filter(v => v.topic === topicName);
            document.getElementById('modal-topic-title').innerText = topicName;
            document.getElementById('search-notebook').value = '';

            const listHtml = words.map(w => `
                <li>
                    <div class="modal-word-info">
                        <div class="modal-word-icon">${w.icon && w.icon.length < 5 ? w.icon : '📝'}</div>
                        <div>
                            <div class="modal-word-text" style="display: flex; align-items: center; gap: 8px;">
                                ${w.word}
                                <button onclick="speakWord('${w.word.replace(/'/g, "\\'")}')" style="background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: 1.1rem; padding: 4px; transition: 0.2s;" onmousedown="this.style.transform='scale(0.8)'" onmouseup="this.style.transform='scale(1)'"><i class="fas fa-volume-up"></i></button>
                            </div>
                            <div class="modal-word-meaning">${w.meaning}</div>
                        </div>
                    </div>
                    <div class="modal-word-type">${w.difficulty || w.type || 'N/A'}</div>
                </li>
            `).join('');

            document.getElementById('modal-word-list').innerHTML = listHtml;
            document.getElementById('topic-modal').style.display = 'flex';
        };

        window.searchNotebook = () => {
            const query = document.getElementById('search-notebook').value.toLowerCase();
            const items = document.querySelectorAll('#modal-word-list li');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(query) ? 'flex' : 'none';
            });
        };

        window.closeTopicModal = () => document.getElementById('topic-modal').style.display = 'none';

        window.deleteTopic = (topicName) => {
            const wordsCount = Storage.getVocab().filter(v => v.topic === topicName).length;
            if (confirm(`⚠️ CẢNH BÁO: Bạn có chắc muốn xóa chủ đề "${topicName}" và ${wordsCount} từ vựng?`)) {
                Storage.data.vocab = Storage.getVocab().filter(v => v.topic !== topicName);
                Storage.save();
                AppUI.renderAll();
                const currentTopicSelect = document.getElementById('practice-topic');
                if (currentTopicSelect && currentTopicSelect.value === topicName) QuizSystem.end();
                Toast.show(`Đã xóa chủ đề ${topicName}!`, 'success');
            }
        };

        window.clearAllData = () => {
            if (confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn toàn bộ từ vựng đã học! Bạn có chắc muốn tiếp tục?')) {
                Storage.data.vocab = [];
                Storage.save();
                AppUI.renderAll();
                Toast.show('Đã xóa toàn bộ dữ liệu thành công!', 'success');
            }
        };
    }

    setupSettings() {
        // Logic thanh trượt AI
        const aiNumSlider = document.getElementById('setting-ai-num');
        const aiNumVal = document.getElementById('val-ai-num');
        if (aiNumSlider && aiNumVal) {
            aiNumSlider.addEventListener('input', () => aiNumVal.innerText = aiNumSlider.value);
        }

        // Khôi phục & lưu trạng thái Cài đặt
        this.bindSettingInput('setting-darkmode', 'vocabDarkTheme', 'checkbox',
            (val) => { document.body.classList.toggle('dark-theme', val); Toast.show(val ? 'Bật Dark Mode' : 'Tắt Dark Mode', 'success'); });

        this.bindSettingInput('setting-lang', 'vocabSettingLang', 'value', () => Toast.show('Đã đổi ngôn ngữ!', 'success'), 'vi');

        this.bindSettingInput('setting-goal', 'vocabSettingGoal', 'value', (val, el) => {
            let num = parseInt(val);
            if (num < 1) el.value = 1;
            Toast.show(`Mục tiêu mới: ${el.value} từ/ngày!`, 'success');
        }, '10');

        // Lưu trạng thái Phát âm
        this.bindSettingInput('setting-auto-audio', 'vocabSettingAutoAudio', 'checkbox', (val) => {
            Toast.show(val ? 'Đã bật tự động phát âm!' : 'Đã tắt phát âm!', 'success');
        }, true);
    }

    // Hàm phụ trợ DRY (Don't Repeat Yourself) để gán sự kiện cho Settings
    bindSettingInput(elementId, storageKey, propType, callback, defaultValue = false) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const savedVal = localStorage.getItem(storageKey);
        if (savedVal !== null) {
            if (propType === 'checkbox') el.checked = savedVal === 'true';
            else el.value = savedVal;
            if (propType === 'checkbox' && savedVal === 'true') document.body.classList.add('dark-theme'); // Dành riêng cho darkmode
        } else if (defaultValue !== false) {
            el[propType] = defaultValue;
        }

        el.addEventListener('change', () => {
            const currentVal = el[propType];
            localStorage.setItem(storageKey, currentVal);
            if (callback) callback(currentVal, el);
        });
    }
}

// Khởi chạy App khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new VocabApp(); // Lưu instance ra window để debug nếu cần
});