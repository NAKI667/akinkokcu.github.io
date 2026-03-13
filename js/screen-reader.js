/* =========================================
   EKRAN OKUYUCU SİSTEMİ
   Web Speech API (SpeechSynthesis)
   Görme engelli bireyler için sesli okuma
   ========================================= */

(function () {
    'use strict';

    // SpeechSynthesis desteği kontrolü
    if (!('speechSynthesis' in window)) {
        console.warn('Bu tarayıcı Speech Synthesis API desteklemiyor.');
        var panel = document.getElementById('screen-reader-panel');
        if (panel) {
            panel.innerHTML = '<p style="color:#f44;font-size:0.85em;">Tarayıcınız sesli okuma desteklemiyor.</p>';
        }
        return;
    }

    var synth = window.speechSynthesis;
    var currentUtterance = null;
    var isReading = false;
    var isPaused = false;
    var readRate = 1;
    var hoverReadEnabled = false;
    var hoverTimeout = null;

    // --- DOM Elemanları ---
    var btnRead = document.getElementById('sr-read');
    var btnStop = document.getElementById('sr-stop');
    var btnPause = document.getElementById('sr-pause');
    var btnResume = document.getElementById('sr-resume');
    var btnSpeedSlow = document.getElementById('sr-speed-slow');
    var btnSpeedNormal = document.getElementById('sr-speed-normal');
    var btnSpeedFast = document.getElementById('sr-speed-fast');
    var btnHoverToggle = document.getElementById('sr-hover-toggle');
    var statusEl = document.getElementById('sr-status');

    // --- Yardımcı Fonksiyonlar ---

    function getMainText() {
        var main = document.querySelector('main');
        if (!main) return '';
        // Sadece görünür metin içeriğini al, script/style içeriklerini hariç tut
        var clone = main.cloneNode(true);
        var scripts = clone.querySelectorAll('script, style, .a11y-state, #a11y-panel, .a11y-svg');
        for (var i = 0; i < scripts.length; i++) {
            scripts[i].remove();
        }
        return clone.textContent.replace(/\s+/g, ' ').trim();
    }

    function updateStatus(text) {
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    function updateSpeedButtons() {
        var buttons = [btnSpeedSlow, btnSpeedNormal, btnSpeedFast];
        var rates = [0.7, 1, 1.5];
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i]) {
                if (rates[i] === readRate) {
                    buttons[i].classList.add('sr-speed-active');
                } else {
                    buttons[i].classList.remove('sr-speed-active');
                }
            }
        }
    }

    function speak(text, onEnd) {
        synth.cancel();
        if (!text) return;

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'tr-TR';
        currentUtterance.rate = readRate;
        currentUtterance.pitch = 1;
        currentUtterance.volume = 1;

        // Türkçe ses varsa tercih et
        var voices = synth.getVoices();
        for (var i = 0; i < voices.length; i++) {
            if (voices[i].lang && voices[i].lang.indexOf('tr') === 0) {
                currentUtterance.voice = voices[i];
                break;
            }
        }

        currentUtterance.onend = function () {
            isReading = false;
            isPaused = false;
            updateStatus('');
            if (onEnd) onEnd();
        };

        currentUtterance.onerror = function () {
            isReading = false;
            isPaused = false;
            updateStatus('');
        };

        isReading = true;
        isPaused = false;
        synth.speak(currentUtterance);
    }

    // --- Ana Kontroller ---

    function readPage() {
        var text = getMainText();
        if (!text) {
            updateStatus('Okunacak icerik bulunamadi.');
            return;
        }
        updateStatus('Okunuyor...');
        speak(text);
    }

    function stopReading() {
        synth.cancel();
        isReading = false;
        isPaused = false;
        updateStatus('Durduruldu.');
        setTimeout(function () { updateStatus(''); }, 2000);
    }

    function pauseReading() {
        if (isReading && !isPaused) {
            synth.pause();
            isPaused = true;
            updateStatus('Duraklatildi.');
        }
    }

    function resumeReading() {
        if (isPaused) {
            synth.resume();
            isPaused = false;
            updateStatus('Devam ediyor...');
        }
    }

    function setSpeed(rate) {
        readRate = rate;
        updateSpeedButtons();
        // Eğer şu anda okunuyorsa, yeni hızla tekrar başlat
        if (isReading && !isPaused) {
            var text = getMainText();
            speak(text);
            updateStatus('Hiz degistirildi, tekrar okunuyor...');
        }
    }

    // --- Fareyle Okuma (Hover Read) ---

    function handleHover(e) {
        if (!hoverReadEnabled) return;

        var target = e.target;
        // Sadece anlamlı metin içeren elemanları oku
        if (!target || !target.textContent) return;
        // a11y panel elemanlarını atla
        if (target.closest('#a11y-panel') || target.closest('#screen-reader-panel')) return;
        // Sadece küçük metin bloklarını oku (paragraf, başlık, link, span, li, label, button)
        var tags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A', 'SPAN', 'LI', 'LABEL', 'BUTTON', 'TD', 'TH'];
        if (tags.indexOf(target.tagName) === -1) return;

        var text = target.textContent.trim();
        if (!text || text.length < 2) return;

        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(function () {
            synth.cancel();
            speak(text);
        }, 300);
    }

    function enableHoverRead() {
        hoverReadEnabled = true;
        document.addEventListener('mouseover', handleHover);
        if (btnHoverToggle) {
            btnHoverToggle.classList.add('sr-hover-active');
            btnHoverToggle.textContent = 'Fareyle Okuma: ACIK';
        }
    }

    function disableHoverRead() {
        hoverReadEnabled = false;
        document.removeEventListener('mouseover', handleHover);
        clearTimeout(hoverTimeout);
        if (btnHoverToggle) {
            btnHoverToggle.classList.remove('sr-hover-active');
            btnHoverToggle.textContent = 'Fareyle Okuma: KAPALI';
        }
    }

    function toggleHoverRead() {
        if (hoverReadEnabled) {
            disableHoverRead();
        } else {
            enableHoverRead();
        }
    }

    // --- Event Listener'lar ---

    if (btnRead) btnRead.addEventListener('click', readPage);
    if (btnStop) btnStop.addEventListener('click', stopReading);
    if (btnPause) btnPause.addEventListener('click', pauseReading);
    if (btnResume) btnResume.addEventListener('click', resumeReading);

    if (btnSpeedSlow) btnSpeedSlow.addEventListener('click', function () { setSpeed(0.7); });
    if (btnSpeedNormal) btnSpeedNormal.addEventListener('click', function () { setSpeed(1); });
    if (btnSpeedFast) btnSpeedFast.addEventListener('click', function () { setSpeed(1.5); });

    if (btnHoverToggle) btnHoverToggle.addEventListener('click', toggleHoverRead);

    // Klavye Kısayolu: Alt+S ile sayfayı oku/durdur
    document.addEventListener('keydown', function (e) {
        if (e.altKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            if (isReading) {
                stopReading();
            } else {
                readPage();
            }
        }
    });

    // Sayfa kapanırken okumayı durdur
    window.addEventListener('beforeunload', function () {
        synth.cancel();
    });

    // Başlangıç durumu
    updateSpeedButtons();

    // Sesler yüklenince Türkçe ses bul (bazı tarayıcılarda gecikmeli yüklenir)
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = function () {
            // Sesler yüklendi
        };
    }

})();
