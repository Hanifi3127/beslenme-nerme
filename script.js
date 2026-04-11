/* ============================================================
   PatiBesin — script.js
   Yapay Zeka Destekli Sokak Hayvanları Besleme Sistemi
   ============================================================ */

// ─── CONFIG ──────────────────────────────────────────────────
// Groq API — Tamamen ücretsiz, kart gerekmez: console.groq.com
const GROQ_API_KEY = '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';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

const state = {
  selectedAnimal: null,
  selectedAnimalEmoji: '',
  selectedAge: null,
  selectedAgeRange: '',
  extras: []
};

const animalEmojis = {
  'kedi': '🐱',
  'köpek': '🐶',
  'güvercin': '🕊️',
  'ördek': '🦆',
  'serçe': '🐦',
  'karga': '🐦‍⬛',
  'baykuş': '🦉',
  'martı': '🦅',
  'tavşan': '🐇',
  'sincap': '🐿️',
  'kirpi': '🦔',
  'hamster': '🐹',
  'fare': '🐭',
  'tilki': '🦊',
  'kurt': '🐺',
  'geyik': '🦌',
  'at': '🐴',
  'eşek': '🫏',
  'keçi': '🐐',
  'koyun': '🐑',
  'inek': '🐄',
  'tavuk': '🐔',
  'kaz': '🪿',
  'kaplumbağa': '🐢',
  'kertenkele': '🦎',
  'balık': '🐟',
  'papağan': '🦜',
  'flamingo': '🦩'
};

// ─── DOM ELEMENTS ─────────────────────────────────────────────
const step1           = document.getElementById('step1');
const step2           = document.getElementById('step2');
const step3           = document.getElementById('step3');
const animalCards     = document.querySelectorAll('.animal-card');
const customAnimal    = document.getElementById('customAnimal');
const useCustomBtn    = document.getElementById('useCustomAnimal');
const toStep2Btn      = document.getElementById('toStep2');
const ageCards        = document.querySelectorAll('.age-card');
const backToStep1Btn  = document.getElementById('backToStep1');
const toStep3Btn      = document.getElementById('toStep3');
const selAnimalEmoji  = document.getElementById('selectedAnimalEmoji');
const selAnimalName   = document.getElementById('selectedAnimalName');
const loadingState    = document.getElementById('loadingState');
const resultState     = document.getElementById('resultState');
const errorState      = document.getElementById('errorState');
const loadingAnimalEl = document.getElementById('loadingAnimal');
const loadingDescEl   = document.getElementById('loadingDesc');
const resultEmoji     = document.getElementById('resultEmoji');
const resultTag       = document.getElementById('resultTag');
const resultContent   = document.getElementById('resultContent');
const errorMessage    = document.getElementById('errorMessage');
const restartBtn      = document.getElementById('restartBtn');
const printBtn        = document.getElementById('printBtn');
const retryBtn        = document.getElementById('retryBtn');
const stepIndicators  = [
  document.getElementById('step-indicator-1'),
  document.getElementById('step-indicator-2'),
  document.getElementById('step-indicator-3')
];

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  bindEvents();
}

// ─── STEPPER ──────────────────────────────────────────────────
function setStep(n) {
  stepIndicators.forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < n)      el.classList.add('done');
    else if (i + 1 === n) el.classList.add('active');
  });
  [step1, step2, step3].forEach((s, i) => {
    s.classList.remove('active');
    if (i + 1 === n) s.classList.add('active');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── STEP 1: HAYVAN SEÇİMİ ────────────────────────────────────
function bindEvents() {
  animalCards.forEach(card => {
    card.addEventListener('click', () => {
      animalCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedAnimal = card.dataset.animal;
      state.selectedAnimalEmoji = animalEmojis[card.dataset.animal] || '🐾';
      customAnimal.value = '';
      toStep2Btn.disabled = false;
    });
  });

  useCustomBtn.addEventListener('click', selectCustomAnimal);
  customAnimal.addEventListener('keydown', e => { if (e.key === 'Enter') selectCustomAnimal(); });

  toStep2Btn.addEventListener('click', () => {
    if (!state.selectedAnimal) return;
    selAnimalEmoji.textContent = state.selectedAnimalEmoji;
    selAnimalName.textContent  = capitalize(state.selectedAnimal);
    setStep(2);
  });

  ageCards.forEach(card => {
    card.addEventListener('click', () => {
      ageCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedAge      = card.dataset.age;
      state.selectedAgeRange = card.dataset.range;
      toStep3Btn.disabled = false;
    });
  });

  backToStep1Btn.addEventListener('click', () => setStep(1));

  toStep3Btn.addEventListener('click', () => {
    if (!state.selectedAge) return;
    collectExtras();
    setStep(3);
    fetchAIRecommendation();
  });

  restartBtn.addEventListener('click', restart);
  retryBtn.addEventListener('click', () => {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    fetchAIRecommendation();
  });
  printBtn.addEventListener('click', () => window.print());
}

function selectCustomAnimal() {
  const val = customAnimal.value.trim();
  if (!val) return;
  animalCards.forEach(c => c.classList.remove('selected'));
  state.selectedAnimal = val;
  state.selectedAnimalEmoji = '🐾';
  toStep2Btn.disabled = false;
  useCustomBtn.textContent = '✓';
  useCustomBtn.style.cssText = 'background:rgba(52,211,153,0.15);border-color:rgba(52,211,153,0.4);color:#34d399';
  setTimeout(() => { useCustomBtn.textContent = 'Seç'; useCustomBtn.style = ''; }, 1500);
}

function collectExtras() {
  state.extras = [];
  document.querySelectorAll('.extra-option input[type="checkbox"]:checked')
    .forEach(cb => state.extras.push(cb.value));
}

// ─── YAPAY ZEKA ÖNERİSİ — GROQ ───────────────────────────────
async function fetchAIRecommendation() {
  loadingState.classList.remove('hidden');
  resultState.classList.add('hidden');
  errorState.classList.add('hidden');
  loadingAnimalEl.textContent = state.selectedAnimalEmoji;
  loadingDescEl.textContent   = `${capitalize(state.selectedAnimal)} • ${capitalize(state.selectedAge)} (${state.selectedAgeRange})`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Sen deneyimli bir veteriner beslenme uzmanısın. Sokak hayvanlarının sağlıklı beslenmesi konusunda kapsamlı ve uygulanabilir öneriler veriyorsun. Yanıtların Türkçe, anlaşılır ve pratik olmalı.'
          },
          { role: 'user', content: buildPrompt() }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Hata kodu: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Yapay zekadan yanıt alınamadı.');
    showResult(text);
  } catch (err) {
    showError(err.message);
  }
}

function buildPrompt() {
  const extras = state.extras.length > 0 ? ` Ek bilgi: hayvan ${state.extras.join(', ')}.` : '';
  return `Bir sokak hayvanı için detaylı ve pratik beslenme önerisi hazırla.

Hayvan: ${capitalize(state.selectedAnimal)}
Yaş Aralığı: ${capitalize(state.selectedAge)} (${state.selectedAgeRange})${extras}

Aşağıdaki başlıkları kullanarak Türkçe beslenme önerisi hazırla:

### 📊 Günlük Besin İhtiyacı
Tahmini günlük kalori miktarını ve temel besin ihtiyaçlarını belirt.

### ✅ Önerilen Besinler
Sokakta bulunabilecek veya marketten alınabilecek uygun besinleri listele.

### ⏰ Besleme Düzeni
Günde kaç öğün, ne zaman ve ne kadar verilmeli?

### ❌ Kaçınılması Gereken Besinler
Zararlı yiyecekleri listele ve nedenini açıkla.

### 💧 Su İhtiyacı
Günlük su tüketimi hakkında bilgi ver.

### 💡 Özel Tavsiyeler
Yaşa ve duruma özel dikkat edilmesi gereken noktalar.`;
}

function showResult(text) {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  resultState.classList.remove('hidden');
  resultEmoji.textContent = state.selectedAnimalEmoji;
  resultTag.textContent   = `${capitalize(state.selectedAnimal)} • ${capitalize(state.selectedAge)}`;
  resultContent.innerHTML = markdownToHTML(text);
}

function showError(msg) {
  loadingState.classList.add('hidden');
  resultState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorMessage.textContent = msg;
}

function restart() {
  state.selectedAnimal = null; state.selectedAnimalEmoji = '';
  state.selectedAge = null;    state.selectedAgeRange = '';
  state.extras = [];
  animalCards.forEach(c => c.classList.remove('selected'));
  ageCards.forEach(c => c.classList.remove('selected'));
  customAnimal.value = '';
  document.querySelectorAll('.extra-option input[type="checkbox"]').forEach(cb => cb.checked = false);
  toStep2Btn.disabled = true;
  toStep3Btn.disabled = true;
  setStep(1);
}

// ─── YARDIMCILAR ──────────────────────────────────────────────
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function markdownToHTML(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/^\s*[-*•] (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/(⚠️[^\n]+)/g, '<div class="warning-box">$1</div>');
  html = html.replace(/(<li>.*?<\/li>)+/gs, m => `<ul>${m}</ul>`);
  if (!html.startsWith('<h3>') && !html.startsWith('<ul>')) html = '<p>' + html + '</p>';
  return html;
}

// ─── BAŞLAT ───────────────────────────────────────────────────
init();
