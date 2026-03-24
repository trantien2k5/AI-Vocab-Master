// js/audio.js - OOP Audio Manager Class
export class AudioSystem {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.initVoices();
        
        // Trình duyệt đôi khi cần 1-2 giây tải giọng nói, nên ta phải chờ sự kiện này
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.initVoices.bind(this);
        }
    }

    initVoices() {
        const voices = this.synth.getVoices();
        if (voices.length === 0) return;

        // Thuật toán săn giọng đọc Premium (Ưu tiên giọng Mỹ xịn nhất)
        this.voice = voices.find(v => v.name.includes('Google US English')) ||
                     voices.find(v => v.name.includes('Microsoft Zira') || v.name.includes('Microsoft David')) ||
                     voices.find(v => v.name.includes('Samantha') || v.name.includes('Alex')) ||
                     voices.find(v => v.lang === 'en-US') ||
                     voices.find(v => v.lang.startsWith('en'));
    }

    speak(text) {
        if (!this.synth) return;
        this.synth.cancel(); // Ngắt giọng cũ nếu đang đọc dở

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;
        
        utterance.lang = 'en-US';
        utterance.rate = 0.85; // Tốc độ hơi chậm lại chút để nghe rõ cách luyến âm
        utterance.pitch = 1;

        this.synth.speak(utterance);
    }
}

// Xuất ra 1 Instance duy nhất (Singleton)
export const AudioManager = new AudioSystem();