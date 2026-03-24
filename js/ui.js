// js/ui.js - OOP UI Manager Class
import { Storage } from './storage.js';
import { QuizSystem } from './quiz.js';

class UIManager {
    init() {
        this.setupTabs();
        this.renderAll();
    }

    setupTabs() {
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // 1. Cập nhật nút Nav
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // 2. Lấy Tab đích
                const targetId = item.getAttribute('data-target');
                const targetTab = document.getElementById(targetId);

                // 3. Logic chuyển đổi mượt mà (Fade Out -> Fade In)
                tabContents.forEach(tab => {
                    if (tab.classList.contains('active') && tab !== targetTab) {
                        tab.style.opacity = '0';
                        tab.style.transform = 'translateY(15px)';
                        // Đợi 200ms cho hiệu ứng mờ kết thúc rồi mới ẩn hoàn toàn
                        setTimeout(() => {
                            tab.classList.remove('active');
                            tab.style.display = 'none';
                        }, 200);
                    }
                });

                // 4. Hiển thị Tab mới
                setTimeout(() => {
                    targetTab.style.display = 'block';
                    // Trigger reflow để animation chạy
                    void targetTab.offsetWidth;
                    targetTab.classList.add('active');
                    targetTab.style.opacity = '1';
                    targetTab.style.transform = 'translateY(0)';
                }, 200);

                // Nếu rời khỏi tab Practice thì ngắt Quiz
                if(targetId !== 'tab-practice') {
                    QuizSystem.end();
                }
            });
        });
    }

    renderAll() {
        const vocab = Storage.getVocab(); 
        const totalWords = vocab.length;
        const topics = [...new Set(vocab.map(v => v.topic))];
        
        // Logic thống kê mới
        const masteredWords = vocab.filter(v => (v.score || 0) >= 3).length; // Từ có điểm >= 3 được tính là "Đã ghi nhớ"
        const learnedWords = vocab.filter(v => (v.score || 0) > 0).length;   // Từ đã từng test đúng ít nhất 1 lần
        const goal = parseInt(localStorage.getItem('vocabSettingGoal') || '10');

        // 1. Cập nhật Dashboard Trang chủ
        const statTotal = document.getElementById('stat-total-words');
        const statMastered = document.getElementById('stat-mastered-words');
        if(statTotal) statTotal.innerText = totalWords;
        if(statMastered) statMastered.innerText = masteredWords;

        const goalCount = document.getElementById('goal-learned-count');
        const goalTotal = document.getElementById('goal-total-count');
        const goalPercentText = document.getElementById('goal-percentage');
        const goalCircle = document.getElementById('goal-progress-circle');
        
        if (goalCount && goalTotal && goalPercentText && goalCircle) {
            const percent = Math.min(Math.round((learnedWords / goal) * 100), 100) || 0;
            goalCount.innerText = learnedWords;
            goalTotal.innerText = goal;
            goalPercentText.innerText = `${percent}%`;
            // Cập nhật vòng tròn SVG (Mượt mà)
            setTimeout(() => { goalCircle.style.strokeDasharray = `${percent}, 100`; }, 300);
        }

        // Lời chào thông minh theo thời gian thực
        const hour = new Date().getHours();
        const greetingText = document.getElementById('greeting-text');
        if(greetingText) {
            if (hour >= 5 && hour < 12) greetingText.innerText = 'Chào buổi sáng 🌤️,';
            else if (hour >= 12 && hour < 18) greetingText.innerText = 'Chào buổi chiều ⛅,';
            else greetingText.innerText = 'Chào buổi tối 🌙,';
        }

        // 2. Cập nhật Tab Thư viện (Giao diện Grid & Thanh tiến độ)
        const topicGrid = document.getElementById('topic-grid-container');
        if(topicGrid) {
            if(topics.length > 0) {
                topicGrid.innerHTML = topics.map(topic => {
                    const topicWords = vocab.filter(v => v.topic === topic);
                    const count = topicWords.length;
                    
                    // Tính toán số từ đã "master"
                    const mastered = topicWords.filter(v => (v.score || 0) >= 3).length;
                    const progressPercent = Math.round((mastered / count) * 100) || 0;
                    
                    // Tính số từ ĐẾN HẠN ÔN TẬP (Thuật toán SRS)
                    const now = Date.now();
                    const dueWordsCount = topicWords.filter(v => !v.nextReviewDate || v.nextReviewDate <= now).length;
                    
                    const displayIcon = (topicWords[0] && topicWords[0].icon && topicWords[0].icon.length < 5) 
                        ? topicWords[0].icon : '📚';

                    return `
                        <div class="topic-card-modern">
                            <div class="topic-card-header">
                                <div class="topic-icon-large">${displayIcon}</div>
                                <button class="btn-delete-minimal" onclick="deleteTopic('${topic.replace(/'/g, "\\'")}')" title="Xóa chủ đề"><i class="fas fa-trash-alt"></i></button>
                            </div>
                            <h3 class="topic-title-modern">${topic}</h3>
                            
                            <div class="topic-progress-container">
                                <div class="progress-info">
                                    <span>${count} từ vựng</span>
                                    <span style="color: var(--primary-color); font-weight: 800;">${progressPercent}% thuộc</span>
                                </div>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                                </div>
                            </div>
                            
                            ${dueWordsCount > 0 
                                ? `<div style="background: #fef2f2; color: #ef4444; font-size: 0.8rem; font-weight: 700; padding: 6px 12px; border-radius: 8px; margin-bottom: 12px; display: inline-block; border: 1px solid rgba(239, 68, 68, 0.2);"><i class="fas fa-clock"></i> Đến hạn ôn: ${dueWordsCount} từ</div>` 
                                : `<div style="background: #ecfdf5; color: #10b981; font-size: 0.8rem; font-weight: 700; padding: 6px 12px; border-radius: 8px; margin-bottom: 12px; display: inline-block; border: 1px solid rgba(16, 185, 129, 0.2);"><i class="fas fa-check-circle"></i> Đã ôn xong hôm nay</div>`}

                            <div class="topic-actions">
                                <button class="btn-action-view" onclick="viewTopic('${topic.replace(/'/g, "\\'")}')"><i class="fas fa-list"></i> Xem</button>
                                <button class="btn-action-study" onclick="studyTopic('${topic.replace(/'/g, "\\'")}')"><i class="fas fa-play"></i> Học ngay</button>
                            </div>
                        </div>`;
                }).join('');
            } else {
                topicGrid.innerHTML = `
                    <div style="text-align: center; padding: 50px 20px; grid-column: 1 / -1;">
                        <div style="font-size: 4rem; margin-bottom: 15px; opacity: 0.5;">🗂️</div>
                        <h3 style="font-size: 1.2rem; color: var(--text-main); margin-bottom: 5px;">Thư viện trống</h3>
                        <p class="text-muted" style="font-size: 0.95rem;">Hãy sang tab "Khám phá" để nhờ AI tạo bộ từ vựng đầu tiên nhé!</p>
                    </div>`;
            }
        }

        // 3. Cập nhật Dropdown chọn chủ đề ở Đấu trường
        const select = document.getElementById('practice-topic');
        if(select) {
            let html = '<option value="all">🔥 Kiểm tra toàn bộ</option>';
            topics.forEach(t => { html += `<option value="${t}">${t}</option>`; });
            select.innerHTML = html;
        }
    }
}

// Xuất ra 1 Instance duy nhất (Singleton)
export const AppUI = new UIManager();