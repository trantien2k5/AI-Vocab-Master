// js/quiz.js - OOP Practice Manager Class (Gamified)
import { Storage } from './storage.js';
import { AudioManager } from './audio.js'; // Tận dụng AudioManager đã có sẵn của bạn để phát âm giọng bản xứ

class PracticeManager {
    constructor() {
        this.currentWord = null;
        this.score = 0;
        this.currentMode = 'quiz'; 
        this.pool = [];
        this.fcPlaylist = []; // Danh sách lướt TikTok
        this.fcIndex = 0;
        
        // Gamification Properties
        this.sessionLength = 10; 
        this.currentQIndex = 0;
        this.correctCount = 0;
    }

    start(topicParam = null, modeParam = null) {
        const selectedTopic = topicParam || document.getElementById('practice-topic').value;
        let selectedMode = modeParam;
        if (!selectedMode) {
            const modeRadios = document.getElementsByName('practice-mode');
            for (let radio of modeRadios) { if (radio.checked) selectedMode = radio.value; }
        }
        this.currentMode = selectedMode;

        const vocab = Storage.getVocab();
        this.pool = selectedTopic === 'all' ? vocab : vocab.filter(v => v.topic === selectedTopic);

        // ĐÃ FIX 1: Lọc từ vựng KHÁC NHAU để tránh thiếu đáp án
        const uniqueWords = new Set(this.pool.map(w => w.word));
        if (uniqueWords.size < 4) {
            alert('Cần ít nhất 4 từ vựng KHÁC NHAU trong chủ đề này để bắt đầu!');
            return;
        }
        
        // Reset Gamification Stats
        this.score = 0;
        this.correctCount = 0;
        this.currentQIndex = 0;
        
        // SRS: Ưu tiên số câu hỏi dựa trên số từ ĐẾN HẠN ÔN (tối đa 10 câu mỗi phiên để không ngợp)
        const now = Date.now();
        const dueCount = this.pool.filter(w => !w.nextReviewDate || w.nextReviewDate <= now).length;
        this.sessionLength = dueCount > 0 ? Math.min(10, dueCount) : Math.min(10, this.pool.length);
        
        document.getElementById('practice-setup').style.display = 'none';
        document.getElementById('practice-result').style.display = 'none';
        const workspace = document.getElementById('practice-workspace');
        workspace.style.display = 'flex';
        
        document.getElementById('mode-quiz').style.display = 'none';
        document.getElementById('mode-flashcard').style.display = 'none';
        document.getElementById('mode-typing').style.display = 'none';
        document.getElementById('mode-dictation').style.display = 'none';
        
        // ĐÃ FIX 2: Sửa display thành flex cho mode-quiz để không vỡ giao diện
        const activeMode = document.getElementById(`mode-${this.currentMode}`);
        if(activeMode) activeMode.style.display = this.currentMode === 'quiz' ? 'flex' : 'block';

        this.next();
    }

    restartSession() {
        this.start(document.getElementById('practice-topic').value, this.currentMode);
    }

    playSFX(isCorrect) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (isCorrect) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        }
    }

    getSmartWord() {
        const now = Date.now();
        // Lọc các từ "Đến hạn ôn tập" (Due) hoặc "Từ mới" (Chưa học bao giờ)
        let dueWords = this.pool.filter(w => !w.nextReviewDate || w.nextReviewDate <= now);
        
        // Nếu đã ôn hết các từ đến hạn, chọn bừa các từ khó (chuỗi đúng thấp) để ôn nhồi
        if (dueWords.length === 0) {
            dueWords = this.pool.sort((a, b) => (a.repetition || 0) - (b.repetition || 0)).slice(0, 5);
        }

        // Trộn mảng và lấy 1 từ ngẫu nhiên trong danh sách ưu tiên
        return dueWords[Math.floor(Math.random() * dueWords.length)];
    }

    next() {
        document.getElementById('btn-next-practice').style.display = 'none';
        document.getElementById('quiz-explanation').style.display = 'none'; 

        // NẾU LÀ FLASHCARD -> Tạo Playlist lướt vô tận, không tính điểm
        if (this.currentMode === 'flashcard') {
            const shuffle = (arr) => { for (let i = arr.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
            this.fcPlaylist = shuffle([...this.pool]);
            this.fcIndex = 0;
            this.sessionLength = this.fcPlaylist.length;
            this.currentQIndex = 1;
            this.currentWord = this.fcPlaylist[this.fcIndex];
            
            this.updateProgressUI();
            let safeIcon = this.currentWord.icon || '📝';
            if (safeIcon.length > 8 || safeIcon.includes('<')) safeIcon = '📝';
            this.setupFlashcardMode(safeIcon);
            
            const isAutoAudio = localStorage.getItem('vocabSettingAutoAudio') !== 'false';
            if (isAutoAudio) setTimeout(() => AudioManager.speak(this.currentWord.word), 300);
            return;
        }

        // CÁC MODE KHÁC -> Vẫn chạy theo SRS và có Game Over
        if (this.currentQIndex >= this.sessionLength) {
            return this.showResult();
        }
        this.currentQIndex++;
        this.updateProgressUI(); 
        
        // Đảm bảo không random trùng lại từ vừa làm nếu kho từ > 1
        let nextWord;
        do {
            nextWord = this.getSmartWord();
        } while (this.currentWord && nextWord.word === this.currentWord.word && this.pool.length > 1);
        
        this.currentWord = nextWord;
        
        let safeIcon = this.currentWord.icon || '📝';
        if (safeIcon.length > 8 || safeIcon.includes('<')) safeIcon = '📝';

        // ĐÃ FIX 3: Tự động phát âm chuẩn bản xứ (Dùng AudioManager có sẵn)
        const isAutoAudio = localStorage.getItem('vocabSettingAutoAudio') !== 'false';
        if (isAutoAudio && this.currentMode !== 'flashcard') {
            AudioManager.speak(this.currentWord.word);
        }

        if (this.currentMode === 'quiz') this.setupQuizMode();
        else if (this.currentMode === 'flashcard') this.setupFlashcardMode(safeIcon);
        else if (this.currentMode === 'typing') this.setupTypingMode(safeIcon);
        else if (this.currentMode === 'dictation') this.setupDictationMode();
    }

    updateProgressUI() {
        const percent = (this.currentQIndex / this.sessionLength) * 100;
        const progressBar = document.getElementById('session-progress-bar');
        if (progressBar) progressBar.style.width = `${percent}%`;
        
        const scoreLabel = document.getElementById('practice-score-label');
        if (scoreLabel) {
            // ĐÃ FIX 4: Gộp HTML để không bị mất the span practice-q-count
            scoreLabel.innerHTML = `
                <i class="fas fa-fire" style="color: #ea580c;"></i> 
                <span style="font-weight: 800;">${this.score}</span>
                <span id="practice-q-count" style="margin-left: 6px; padding-left: 6px; border-left: 1px solid rgba(0,0,0,0.2); font-size: 0.9rem; opacity: 0.8;">
                    ${this.currentQIndex}/${this.sessionLength}
                </span>
            `;
        }
    }

    showResult() {
        document.getElementById('practice-workspace').style.display = 'none';
        document.getElementById('practice-result').style.display = 'block';
        
        const accuracy = Math.round((this.correctCount / this.sessionLength) * 100) || 0;
        document.getElementById('rs-accuracy').innerText = `${accuracy}%`;
        document.getElementById('rs-score').innerHTML = `<i class="fas fa-fire"></i> ${this.score}`;
        
        setTimeout(() => this.playSFX(true), 100);
        setTimeout(() => this.playSFX(true), 300);
    }

    /* --- MODE 1: TRẮC NGHIỆM TỐI GIẢN --- */
    setupQuizMode() {
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        let uniquePool = [];
        let seen = new Set([this.currentWord.word]);
        for (let w of this.pool) {
            if (!seen.has(w.word)) {
                uniquePool.push(w);
                seen.add(w.word);
            }
        }

        let distractors = shuffle(uniquePool).slice(0, 3);
        let options = shuffle([this.currentWord, ...distractors]);
        
        document.getElementById('quiz-question').innerText = this.currentWord.word;
        document.getElementById('quiz-phonetic').innerText = this.currentWord.phonetic || '';
        
        const optionsDiv = document.getElementById('quiz-options');
        optionsDiv.style.display = 'grid'; 
        optionsDiv.innerHTML = '';
        
        const labels = ['A', 'B', 'C', 'D'];
        options.forEach((opt, index) => {
            const btn = document.createElement('div'); 
            btn.className = 'quiz-option-modern';
            btn.innerHTML = `<div class="opt-label">${labels[index]}</div> <div class="opt-text" style="flex: 1;">${opt.meaning}</div>`;
            btn.onclick = () => this.handleResult(btn, opt.word === this.currentWord.word);
            optionsDiv.appendChild(btn);
        });
    }

    /* --- MODE 2: LẬT THẺ (FLASHCARD TIKTOK) --- */
    navigateFlashcard(direction) {
        const fcInner = document.querySelector('.flashcard-inner');
        // Hiệu ứng mờ và đẩy thẻ hiện tại ra khỏi màn hình
        fcInner.style.transform = direction > 0 ? 'translateY(-100px) scale(0.9)' : 'translateY(100px) scale(0.9)';
        fcInner.style.opacity = '0';

        setTimeout(() => {
            this.fcIndex += direction;
            if (this.fcIndex >= this.fcPlaylist.length) this.fcIndex = 0; // Vuốt vô tận
            if (this.fcIndex < 0) this.fcIndex = this.fcPlaylist.length - 1;

            this.currentWord = this.fcPlaylist[this.fcIndex];
            this.currentQIndex = this.fcIndex + 1;
            this.updateProgressUI();
            
            let safeIcon = this.currentWord.icon || '📝';
            if (safeIcon.length > 8 || safeIcon.includes('<')) safeIcon = '📝';
            this.setupFlashcardMode(safeIcon);

            // Nạp thẻ mới từ phía đối diện bay vào
            fcInner.style.transition = 'none';
            fcInner.style.transform = direction > 0 ? 'translateY(100px) scale(0.9)' : 'translateY(-100px) scale(0.9)';
            
            setTimeout(() => {
                fcInner.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
                fcInner.style.transform = 'translateY(0) scale(1)';
                fcInner.style.opacity = '1';
                
                const isAutoAudio = localStorage.getItem('vocabSettingAutoAudio') !== 'false';
                if (isAutoAudio) AudioManager.speak(this.currentWord.word);
            }, 50);
        }, 200);
    }

    setupFlashcardMode(safeIcon) {
        document.querySelector('.flashcard-scene').classList.remove('is-flipped');
        document.getElementById('fc-controls').style.display = 'flex'; // Luôn hiện nút điều hướng
        document.getElementById('fc-icon').innerText = safeIcon;
        document.getElementById('fc-word').innerText = this.currentWord.word;
        document.getElementById('fc-phonetic').innerText = this.currentWord.phonetic || '';
        document.getElementById('fc-meaning').innerText = this.currentWord.meaning;
        document.getElementById('fc-type').innerText = this.currentWord.type || 'Từ vựng';
        document.getElementById('fc-example').innerText = this.currentWord.example || 'Không có ví dụ';
    }

    flipCard() {
        document.querySelector('.flashcard-scene').classList.toggle('is-flipped');
        const isAutoAudio = localStorage.getItem('vocabSettingAutoAudio') !== 'false';
        if (isAutoAudio) AudioManager.speak(this.currentWord.word);
    }

    /* --- MODE 3 & 4: TYPING & DICTATION --- */
    setupTypingMode(safeIcon) {
        document.getElementById('type-icon').innerText = safeIcon;
        document.getElementById('type-meaning').innerText = this.currentWord.meaning;
        const w = this.currentWord.word;
        let hint = w.length > 3 ? `${w[0]} ${'_ '.repeat(w.length-2)}${w[w.length-1]}` : `${w[0]} ${'_ '.repeat(w.length-1)}`;
        document.getElementById('type-hint').innerText = `Gợi ý: ${hint}`;
        this.resetInput('type-input');
    }

    setupDictationMode() {
        this.resetInput('dict-input');
        setTimeout(() => AudioManager.speak(this.currentWord.word), 300);
    }

    resetInput(inputId) {
        const input = document.getElementById(inputId);
        input.value = '';
        input.className = 'form-control'; 
        input.disabled = false;
        input.focus();
        input.onkeypress = (e) => { if (e.key === 'Enter') this.checkTyping(inputId); };
    }

    checkTyping(inputId) {
        const input = document.getElementById(inputId);
        const userText = input.value.trim().toLowerCase();
        const correctText = this.currentWord.word.trim().toLowerCase();
        if (!userText) return;
        input.disabled = true;

        const isCorrect = userText === correctText;
        if (isCorrect) input.classList.add('correct-shake');
        else {
            input.classList.add('wrong-shake');
            input.value = `${userText} (Sai) ➡️ ${correctText}`;
        }
        this.handleResult(null, isCorrect);
    }

    /* --- LOGIC CHẤM ĐIỂM & GIẢI THÍCH --- */
    handleResult(btn, isCorrect) {
        const nextBtn = document.getElementById('btn-next-practice');
        const expDiv = document.getElementById('quiz-explanation');

        this.playSFX(isCorrect); 

        if (isCorrect) {
            this.score++;
            this.correctCount++;
        }

        // THUẬT TOÁN SRS (SUPERMEMO-2)
        let w = this.currentWord;
        w.repetition = w.repetition || 0; // Số lần trả lời đúng liên tiếp
        w.interval = w.interval || 0;     // Khoảng cách ngày ôn
        w.easeFactor = w.easeFactor || 2.5; // Hệ số dễ

        if (isCorrect) {
            if (w.repetition === 0) w.interval = 1; // Đúng lần đầu: mai ôn lại
            else if (w.repetition === 1) w.interval = 6; // Đúng 2 lần liên tiếp: 6 ngày sau
            else w.interval = Math.round(w.interval * w.easeFactor); // Các lần sau: giãn cách ngày càng dài
            
            w.repetition += 1;
            w.easeFactor = Math.max(1.3, w.easeFactor + 0.1);
            w.score = w.repetition; // Đồng bộ điểm cũ để vạch màu UI chạy đúng
        } else {
            w.repetition = 0; // Sai -> Reset chuỗi
            w.interval = 0;   // Ôn lại ngay hôm nay
            w.easeFactor = Math.max(1.3, w.easeFactor - 0.2); // Giảm hệ số dễ vì từ này khó
            w.score = 0;
        }

        // Tính ngày ôn tập tiếp theo (1 ngày = 86400000 ms)
        w.nextReviewDate = Date.now() + (w.interval * 86400000);

        this.updateProgressUI();
        Storage.save();

        let userChoiceHtml = '';
        if (this.currentMode === 'quiz') {
            // ĐÃ FIX 5: Ẩn 4 câu trắc nghiệm cho gọn màn hình khi hiện đáp án
            document.getElementById('quiz-options').style.display = 'none';
            
            if (!isCorrect && btn) {
                const chosenText = btn.querySelector('.opt-text').innerText;
                userChoiceHtml = `<div style="color: #dc2626; font-size: 0.95rem; font-weight: 700; margin-bottom: 12px;"><i class="fas fa-times-circle"></i> Bạn chọn nhầm: ${chosenText}</div>`;
            }
        }

        let safeIcon = this.currentWord.icon || '📝';
        if (safeIcon.length > 8 || safeIcon.includes('<')) safeIcon = '📝';

        expDiv.style.display = 'block';
        expDiv.className = `glass-explanation mt-15 ${isCorrect ? 'correct-exp' : 'wrong-exp'}`;
        expDiv.innerHTML = `
            ${userChoiceHtml}
            <p style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 10px;">ĐÁP ÁN CHÍNH XÁC</p>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2.5rem; background: var(--bg-color); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 18px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); flex-shrink: 0;">${safeIcon}</div>
                <div style="flex: 1; text-align: left;">
                    <div style="font-size: 1.2rem; color: var(--primary-color); font-weight: 800;">${this.currentWord.meaning}</div>
                    ${this.currentWord.type ? `<div style="display: inline-block; margin-top: 5px; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-color); padding: 4px 10px; border-radius: 8px; font-weight: 700; border: 1px solid var(--border-color);">${this.currentWord.type}</div>` : ''}
                </div>
            </div>
            ${this.currentWord.example ? `
            <div style="font-style: italic; background: rgba(255,255,255,0.6); padding: 15px; border-radius: 14px; margin-top: 15px; font-size: 0.95rem; border-left: 4px solid var(--primary-color); color: var(--text-main);">
                "${this.currentWord.example}"
                ${this.currentWord.example_trans ? `<div style="font-style: normal; font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">💡 ${this.currentWord.example_trans}</div>` : ''}
            </div>` : ''}
        `;

        nextBtn.style.display = 'flex';

        if (!isCorrect) {
            nextBtn.disabled = true;
            let timeLeft = 3;
            nextBtn.innerHTML = `ĐỌC KỸ (${timeLeft}s)`;
            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) nextBtn.innerHTML = `ĐỌC KỸ (${timeLeft}s)`;
                else {
                    clearInterval(timer);
                    nextBtn.disabled = false;
                    nextBtn.innerHTML = `TIẾP TỤC <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>`;
                }
            }, 1000);
        } else {
            nextBtn.disabled = false;
            nextBtn.innerHTML = `TIẾP TỤC <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>`;
        }
    }

    // ĐÃ KHÔI PHỤC HÀM NÀY ĐỂ FIX LỖI "QuizSystem.end is not a function"
    end() {
        document.getElementById('practice-setup').style.display = 'block';
        document.getElementById('practice-workspace').style.display = 'none';
        document.getElementById('practice-result').style.display = 'none';
        document.getElementById('quiz-explanation').style.display = 'none'; 
    }
}

export const QuizSystem = new PracticeManager();