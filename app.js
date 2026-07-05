// app.js

// --- STATE MANAGEMENT ---
let appState = {
  profile: {
    name: "ゲストユーザー",
    goalType: "減量",
    age: 28,
    height: 170,
    weight: 70,
    weightTarget: 65,
    calTarget: 1800,
    pTarget: 120,
    fTarget: 50,
    cTarget: 210
  },
  meals: [],      // Today's meals: { name, calories, p, f, c }
  workouts: [],   // Today's workouts: { name, category, weight, reps, sets, calories }
  water: 0,       // Today's water (ml)
  chatHistory: [], // Chat log
  currentAnalysis: null, // Temporarily holds the active image analysis result
  templates: [
    { name: "ベンチプレス", category: "胸", weight: 40, reps: 10, sets: 3, calories: 150 },
    { name: "スクワット", category: "脚", weight: 50, reps: 10, sets: 3, calories: 180 },
    { name: "ラットプルダウン", category: "背中", weight: 35, reps: 10, sets: 3, calories: 120 },
    { name: "ショルダープレス", category: "肩", weight: 12, reps: 10, sets: 3, calories: 110 },
    { name: "ランニング", category: "有酸素", weight: 0, reps: 30, sets: 1, calories: 240 }
  ]
};

let currentUploadedImageBase64 = null;
let currentUploadedImageMime = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  switchPage('home');
  setupDragAndDrop();
  updatePfcChart(0, 0, 0);
  
  // Render initial dashboard stats
  updateDashboardUI();
  checkApiKeyStatus();
});

// Get current date string (YYYY-MM-DD)
function getTodayDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Save profile, meals, workouts to localStorage
function saveStateToLocalStorage() {
  const today = getTodayDateStr();
  localStorage.setItem('fitchef_profile', JSON.stringify(appState.profile));
  localStorage.setItem(`fitchef_meals_${today}`, JSON.stringify(appState.meals));
  localStorage.setItem(`fitchef_workouts_${today}`, JSON.stringify(appState.workouts));
  localStorage.setItem(`fitchef_water_${today}`, appState.water.toString());
  localStorage.setItem('fitchef_workout_templates', JSON.stringify(appState.templates));
}

// Load state from localStorage
function loadData() {
  const today = getTodayDateStr();
  
  // 1. Load Profile
  const savedProfile = localStorage.getItem('fitchef_profile');
  if (savedProfile) {
    appState.profile = JSON.parse(savedProfile);
  }
  
  // Populate settings form inputs
  document.getElementById('prof-name').value = appState.profile.name;
  document.getElementById('prof-goal-type').value = appState.profile.goalType;
  document.getElementById('prof-age').value = appState.profile.age;
  document.getElementById('prof-height').value = appState.profile.height;
  document.getElementById('prof-weight').value = appState.profile.weight;
  document.getElementById('prof-weight-target').value = appState.profile.weightTarget;
  document.getElementById('prof-cal-target').value = appState.profile.calTarget;
  document.getElementById('prof-p-target').value = appState.profile.pTarget;
  document.getElementById('prof-f-target').value = appState.profile.fTarget;
  document.getElementById('prof-c-target').value = appState.profile.cTarget;

  // 2. Load today's meals
  const savedMeals = localStorage.getItem(`fitchef_meals_${today}`);
  if (savedMeals) {
    appState.meals = JSON.parse(savedMeals);
  } else {
    appState.meals = [];
  }

  // 3. Load today's workouts
  const savedWorkouts = localStorage.getItem(`fitchef_workouts_${today}`);
  if (savedWorkouts) {
    appState.workouts = JSON.parse(savedWorkouts);
  } else {
    appState.workouts = [];
  }

  // 4. Load today's water
  const savedWater = localStorage.getItem(`fitchef_water_${today}`);
  appState.water = savedWater ? parseInt(savedWater, 10) : 0;

  // 5. Load Chat History
  const savedChat = localStorage.getItem('fitchef_chat_history');
  appState.chatHistory = savedChat ? JSON.parse(savedChat) : [];
  renderChatHistory();

  // 6. Load Workout Templates
  const savedTemplates = localStorage.getItem('fitchef_workout_templates');
  if (savedTemplates) {
    appState.templates = JSON.parse(savedTemplates);
  }
}

// --- SPA ROUTER ---
function switchPage(pageId) {
  // Hide all sections
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show target section
  const activeSection = document.getElementById(`page-${pageId}`);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  // Update navigation visual state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === pageId) {
      item.classList.add('active');
    }
  });

  // Re-render elements if needed
  if (pageId === 'home') {
    updateDashboardUI();
  } else if (pageId === 'workout') {
    renderWorkoutList();
    renderWorkoutTemplates();
  }
}

// --- UI UPDATES ---
function updateDashboardUI() {
  // Update Profile Widget
  document.getElementById('widget-name').textContent = appState.profile.name;
  document.getElementById('widget-goal').textContent = `${appState.profile.goalType}中 (${appState.profile.weight}kg ➔ ${appState.profile.weightTarget}kg)`;
  document.getElementById('widget-avatar').textContent = appState.profile.name.charAt(0).toUpperCase();

  // Targets
  document.getElementById('dash-cal-target').textContent = appState.profile.calTarget;
  document.getElementById('pfc-p-target').textContent = appState.profile.pTarget;
  document.getElementById('pfc-f-target').textContent = appState.profile.fTarget;
  document.getElementById('pfc-c-target').textContent = appState.profile.cTarget;

  // Calculate Totals
  let totalCalIn = 0;
  let totalP = 0;
  let totalF = 0;
  let totalC = 0;

  appState.meals.forEach(meal => {
    totalCalIn += meal.calories;
    totalP += meal.p;
    totalF += meal.f;
    totalC += meal.c;
  });

  let totalCalOut = 0;
  appState.workouts.forEach(work => {
    totalCalOut += work.calories;
  });

  // Display Totals
  document.getElementById('dash-cal-in').textContent = totalCalIn;
  document.getElementById('dash-cal-out').textContent = totalCalOut;
  document.getElementById('dash-water').textContent = appState.water;

  document.getElementById('pfc-p-val').textContent = totalP;
  document.getElementById('pfc-f-val').textContent = totalF;
  document.getElementById('pfc-c-val').textContent = totalC;

  // Targets diff
  document.getElementById('dash-weight').textContent = appState.profile.weight;
  const weightDiff = (appState.profile.weight - appState.profile.weightTarget).toFixed(1);
  document.getElementById('dash-weight-diff').textContent = weightDiff;

  // Progress Bars
  const calPercent = Math.min((totalCalIn / appState.profile.calTarget) * 100, 100);
  document.getElementById('fill-cal').style.width = `${calPercent}%`;

  const waterPercent = Math.min((appState.water / 2000) * 100, 100);
  document.getElementById('fill-water').style.width = `${waterPercent}%`;

  const workoutPercent = Math.min((totalCalOut / 500) * 100, 100); // 500kcal target for workout progress visual
  document.getElementById('fill-workout').style.width = `${workoutPercent}%`;

  // Draw PFC Chart
  updatePfcChart(totalP, totalF, totalC);
}

// Chart.js instance holder
let pfcChartInstance = null;

function updatePfcChart(p, f, c) {
  const canvas = document.getElementById('pfcChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // If all values are 0, show a placeholder balance (equal parts gray)
  const isZero = p === 0 && f === 0 && c === 0;
  const chartData = isZero ? [1, 1, 1] : [p, f, c];
  const chartColors = isZero ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'] : ['#d946ef', '#f59e0b', '#00f0ff'];

  const data = {
    labels: ['タンパク質(P)', '脂質(F)', '炭水化物(C)'],
    datasets: [{
      data: chartData,
      backgroundColor: chartColors,
      borderWidth: isZero ? 0 : 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      hoverOffset: 4
    }]
  };

  const config = {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: !isZero
        }
      },
      cutout: '75%',
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  };

  if (pfcChartInstance) {
    pfcChartInstance.data.datasets[0].data = chartData;
    pfcChartInstance.data.datasets[0].backgroundColor = chartColors;
    pfcChartInstance.data.datasets[0].borderWidth = isZero ? 0 : 1;
    pfcChartInstance.update();
  } else {
    pfcChartInstance = new Chart(ctx, config);
  }
}

// --- PROFILE SETTINGS ---
function saveProfile(event) {
  event.preventDefault();
  
  appState.profile.name = document.getElementById('prof-name').value;
  appState.profile.goalType = document.getElementById('prof-goal-type').value;
  appState.profile.age = parseInt(document.getElementById('prof-age').value, 10);
  appState.profile.height = parseInt(document.getElementById('prof-height').value, 10);
  appState.profile.weight = parseFloat(document.getElementById('prof-weight').value);
  appState.profile.weightTarget = parseFloat(document.getElementById('prof-weight-target').value);
  appState.profile.calTarget = parseInt(document.getElementById('prof-cal-target').value, 10);
  appState.profile.pTarget = parseInt(document.getElementById('prof-p-target').value, 10);
  appState.profile.fTarget = parseInt(document.getElementById('prof-f-target').value, 10);
  appState.profile.cTarget = parseInt(document.getElementById('prof-c-target').value, 10);

  saveStateToLocalStorage();
  updateDashboardUI();
  alert("プロファイルを保存しました！");
}

// --- WATER tracker ---
function addWater(amount) {
  appState.water += amount;
  saveStateToLocalStorage();
  updateDashboardUI();
}

// --- DIET PHOTO UPLOAD & AI ---
function triggerFileInput() {
  document.getElementById('file-input').click();
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--color-primary)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  });
}

function handleFileSelect(event) {
  const files = event.target.files;
  if (files.length > 0) {
    processImageFile(files[0]);
  }
}

function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('画像ファイルを選択してください。');
    return;
  }
  
  currentUploadedImageMime = file.type;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    currentUploadedImageBase64 = e.target.result;
    document.getElementById('image-preview').src = currentUploadedImageBase64;
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('preview-container').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function resetImageUpload() {
  currentUploadedImageBase64 = null;
  currentUploadedImageMime = null;
  appState.currentAnalysis = null;
  
  document.getElementById('file-input').value = '';
  document.getElementById('drop-zone').style.display = 'flex';
  document.getElementById('preview-container').style.display = 'none';
  document.getElementById('analysis-results').style.display = 'none';
  document.getElementById('analyzer-loader').style.display = 'none';
}

async function analyzeFoodImage() {
  if (!currentUploadedImageBase64) return;
  
  document.getElementById('preview-container').style.display = 'none';
  document.getElementById('analyzer-loader').style.display = 'flex';
  
  const result = await analyzeImageAI(currentUploadedImageBase64, currentUploadedImageMime);
  
  document.getElementById('analyzer-loader').style.display = 'none';
  
  if (result) {
    appState.currentAnalysis = result;
    
    // Display results
    document.getElementById('res-food-name').textContent = result.foodName;
    document.getElementById('res-calories').innerHTML = `${result.calories} <span class="stat-unit">kcal</span>`;
    document.getElementById('res-p').innerHTML = `${result.p} <span class="stat-unit">g</span>`;
    document.getElementById('res-f').innerHTML = `${result.f} <span class="stat-unit">g</span>`;
    document.getElementById('res-c').innerHTML = `${result.c} <span class="stat-unit">g</span>`;
    document.getElementById('res-trainer-advice').textContent = result.trainerAdvice;
    document.getElementById('res-chef-advice').textContent = result.chefAdvice;
    
    document.getElementById('analysis-results').style.display = 'block';
  } else {
    document.getElementById('preview-container').style.display = 'flex';
  }
}

function saveMealLog() {
  if (!appState.currentAnalysis) return;
  
  const newMeal = {
    name: appState.currentAnalysis.foodName,
    calories: parseInt(appState.currentAnalysis.calories, 10),
    p: parseInt(appState.currentAnalysis.p, 10),
    f: parseInt(appState.currentAnalysis.f, 10),
    c: parseInt(appState.currentAnalysis.c, 10),
    timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  };

  appState.meals.push(newMeal);
  saveStateToLocalStorage();
  
  // Set coach advice text on Dashboard
  document.getElementById('trainer-quick-advice').textContent = `「さっき食べた ${newMeal.name} は、${appState.currentAnalysis.trainerAdvice.slice(0, 50)}...」詳細はチャットやログで確認してくれ！`;
  document.getElementById('chef-quick-advice').textContent = `「${newMeal.name} のアレンジ案：${appState.currentAnalysis.chefAdvice.slice(0, 50)}...」`;
  
  alert(`${newMeal.name} を食事ログに登録しました！`);
  resetImageUpload();
  switchPage('home');
}

// --- WORKOUT TRACKER ---
function saveWorkout(event) {
  event.preventDefault();
  
  const newWork = {
    name: document.getElementById('work-name').value.trim(),
    category: document.getElementById('work-category').value,
    weight: parseFloat(document.getElementById('work-weight').value),
    reps: parseInt(document.getElementById('work-reps').value, 10),
    sets: parseInt(document.getElementById('work-sets').value, 10),
    calories: parseInt(document.getElementById('work-calories').value, 10),
    timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  };

  appState.workouts.push(newWork);

  // Update templates (add new or update existing values)
  const existingTemplateIdx = appState.templates.findIndex(t => t.name.toLowerCase() === newWork.name.toLowerCase());
  const templateItem = {
    name: newWork.name,
    category: newWork.category,
    weight: newWork.weight,
    reps: newWork.reps,
    sets: newWork.sets,
    calories: newWork.calories
  };
  
  if (existingTemplateIdx !== -1) {
    appState.templates[existingTemplateIdx] = templateItem;
  } else {
    appState.templates.unshift(templateItem); // add to top
    if (appState.templates.length > 12) {
      appState.templates.pop(); // keep max 12 templates
    }
  }

  saveStateToLocalStorage();
  
  // Reset form
  document.getElementById('work-name').value = '';
  document.getElementById('work-weight').value = '40';
  document.getElementById('work-reps').value = '10';
  document.getElementById('work-sets').value = '3';
  document.getElementById('work-calories').value = '150';

  renderWorkoutList();
  renderWorkoutTemplates();
  updateDashboardUI();
  
  // Motivation quote
  document.getElementById('trainer-quick-advice').textContent = `「ナイスワーク！${newWork.category}のトレーニングをしっかりやりきったな！この調子で理想の体へ突き進もう！」`;
}

function renderWorkoutList() {
  const container = document.getElementById('workout-list');
  if (appState.workouts.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem 0;">今日のトレーニング記録はありません。</p>`;
    return;
  }

  container.innerHTML = appState.workouts.map((work, idx) => `
    <div class="workout-row">
      <div class="workout-meta">
        <span class="workout-name">${work.name}</span>
        <span class="workout-detail">${work.category} | ${work.weight}kg × ${work.reps}reps | ${work.calories}kcal消費 (${work.timestamp})</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="workout-sets" style="margin-right: 8px;">${work.sets} Sets</span>
        <button class="btn btn-secondary" onclick="copyWorkoutToForm(${idx})" style="padding: 4px 8px; font-size: 0.75rem; margin: 0;">コピー</button>
        <button class="btn btn-secondary" onclick="deleteWorkout(${idx})" style="padding: 4px 8px; font-size: 0.75rem; border-color: rgba(255, 78, 78, 0.3); color: var(--color-warning); margin: 0;">削除</button>
      </div>
    </div>
  `).join('');
}

function deleteWorkout(index) {
  appState.workouts.splice(index, 1);
  saveStateToLocalStorage();
  renderWorkoutList();
  updateDashboardUI();
}

// --- RECIPE GENERATION ---
async function generateRecipe() {
  const ingredients = document.getElementById('chef-ingredients').value;
  const timeLimit = document.getElementById('chef-time').value;
  const dietType = document.getElementById('chef-diet-type').value;

  const resultContainer = document.getElementById('recipe-result-container');
  const loader = document.getElementById('recipe-loader');
  const placeholder = document.getElementById('recipe-placeholder');
  const content = document.getElementById('recipe-content');

  placeholder.style.display = 'none';
  content.style.display = 'none';
  loader.style.display = 'block';

  // Construct current profiles totals to pass to AI
  let currentCalIn = 0;
  appState.meals.forEach(m => currentCalIn += m.calories);
  
  const profileSummary = {
    age: appState.profile.age,
    goalType: appState.profile.goalType,
    calTarget: appState.profile.calTarget,
    currentCalIn: currentCalIn
  };

  const recipe = await generateRecipeAI(ingredients, timeLimit, dietType, profileSummary);
  
  loader.style.display = 'none';

  if (recipe) {
    document.getElementById('recipe-title').textContent = recipe.title;
    document.getElementById('recipe-tag-time').textContent = recipe.time;
    document.getElementById('recipe-tag-pfc').textContent = `P: ${recipe.p}g / F: ${recipe.f}g / C: ${recipe.c}g`;
    document.getElementById('recipe-tag-cal').textContent = `${recipe.calories} kcal`;
    document.getElementById('recipe-ingredients-list').textContent = recipe.ingredients;
    
    // Render steps list
    const stepsContainer = document.getElementById('recipe-steps');
    stepsContainer.innerHTML = recipe.steps.map(step => `<li>${step}</li>`).join('');
    
    document.getElementById('recipe-chef-tip').textContent = recipe.chefTip;
    
    content.style.display = 'block';
  } else {
    placeholder.style.display = 'block';
  }
}

// --- CHAT SYSTEM ---
function changeChatAdvisor() {
  // Clear messages or just add a welcome notification depending on context
  const select = document.getElementById('chat-advisor-select');
  const welcomeText = {
    both: "🏋️ <strong>レオ:</strong> 何でも相談してくれ！筋力アップや運動スケジュールなら任せろ！<br>🍳 <strong>レイ:</strong> 美味しいダイエットフードや置き換えレシピなどのご相談はお気軽にどうぞ。",
    trainer: "🏋️ <strong>レオ:</strong> よし！運動や筋トレの相談だな！今日のトレーニング計画を立てるか？",
    chef: "🍳 <strong>レイ:</strong> 美味しく健康的に食べられる料理をご提案しますね。気になる食材はありますか？"
  }[select.value];

  appendMessage('ai', welcomeText);
}

function handleChatKeyPress(event) {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-user-input');
  const text = input.value.trim();
  if (!text) return;

  // Add User Message
  appendMessage('user', text);
  input.value = '';

  appState.chatHistory.push({ role: 'user', text: text });
  // Keep last 15 history items to manage context size
  if (appState.chatHistory.length > 15) {
    appState.chatHistory.shift();
  }
  localStorage.setItem('fitchef_chat_history', JSON.stringify(appState.chatHistory));

  // Loading indicator bubble
  const loadingBubble = appendMessage('ai', '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>');

  // Load totals to feed AI
  let currentCalIn = 0;
  appState.meals.forEach(m => currentCalIn += m.calories);

  const profileSummary = {
    age: appState.profile.age,
    height: appState.profile.height,
    weight: appState.profile.weight,
    weightTarget: appState.profile.weightTarget,
    goalType: appState.profile.goalType,
    calTarget: appState.profile.calTarget,
    currentCalIn: currentCalIn
  };

  const advisorType = document.getElementById('chat-advisor-select').value;
  
  // Call AI
  const response = await chatWithCoachesAI(appState.chatHistory, text, profileSummary, advisorType);
  
  // Remove loading bubble
  loadingBubble.remove();

  // Add AI Message
  const formattedResponse = response
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // simple bold conversion
  
  appendMessage('ai', formattedResponse);
  
  appState.chatHistory.push({ role: 'ai', text: response });
  if (appState.chatHistory.length > 15) {
    appState.chatHistory.shift();
  }
  localStorage.setItem('fitchef_chat_history', JSON.stringify(appState.chatHistory));

  // Voice Readout (if enabled)
  const voiceEnabled = document.getElementById('chat-voice-enable').checked;
  if (voiceEnabled && 'speechSynthesis' in window) {
    // Read the message, strip markdown markers
    const speakText = response.replace(/🏋️|🍳|[\*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.lang = 'ja-JP';
    
    // Choose voices (Leo heat vs. Ray mild if possible, but keep simple)
    window.speechSynthesis.speak(utterance);
  }
}

function appendMessage(role, htmlContent) {
  const chatBox = document.getElementById('chat-messages-box');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = htmlContent;
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  return bubble;
}

function renderChatHistory() {
  const chatBox = document.getElementById('chat-messages-box');
  if (appState.chatHistory.length === 0) return;

  chatBox.innerHTML = '';
  appState.chatHistory.forEach(msg => {
    const formatted = msg.text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    appendMessage(msg.role, formatted);
  });
}

// --- API KEY CONFIG ---
function saveApiKey() {
  const keyInput = document.getElementById('api-key-input');
  const key = keyInput.value.trim();
  
  if (!key) {
    alert("キーを入力してください。");
    return;
  }

  localStorage.setItem('fitchef_api_key', key);
  checkApiKeyStatus();
  alert("APIキーを保存しました！AI機能が有効になります。");
  keyInput.value = '';
}

function deleteApiKey() {
  localStorage.removeItem('fitchef_api_key');
  checkApiKeyStatus();
  alert("APIキーを削除しました。デモモードに戻ります。");
}

async function checkApiKeyStatus() {
  const key = getApiKey();
  const statusMsg = document.getElementById('api-status-msg');
  
  if (key) {
    statusMsg.style.color = 'var(--color-secondary)';
    statusMsg.textContent = 'APIキー設定済み：AIモード有効';
    
    // Validate key in background
    const isValid = await validateApiKey(key);
    if (!isValid) {
      statusMsg.style.color = 'var(--color-warning)';
      statusMsg.textContent = 'APIキーが無効またはエラーが発生しています。';
    }
  } else {
    statusMsg.style.color = 'var(--text-muted)';
    statusMsg.textContent = '未設定：デモモードで動作中';
  }
}
