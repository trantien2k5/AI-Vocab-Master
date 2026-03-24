// js/storage.js - OOP Singleton Class
import { Toast } from './toast.js';

class StorageManager {
    constructor() {
        this.data = { vocab: [] };
        this.storageKey = 'vocabAppData';
    }
    
    init() {
        try {
            const localData = localStorage.getItem(this.storageKey);
            this.data = localData ? JSON.parse(localData) : { vocab: [] };
        } catch (error) {
            console.error("Dữ liệu bị hỏng:", error);
            Toast.show("Dữ liệu bị lỗi, đã khôi phục trạng thái an toàn!", "error");
            this.data = { vocab: [] }; 
        }
    }
    
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error("Không thể lưu dữ liệu:", error);
            Toast.show("Bộ nhớ đầy hoặc không thể lưu!", "error");
        }
    }

    // Thêm phương thức hỗ trợ chuẩn OOP (Getter)
    getVocab() {
        return this.data.vocab;
    }
}

// Xuất ra 1 Instance duy nhất (Singleton Pattern)
export const Storage = new StorageManager();