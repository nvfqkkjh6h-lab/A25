// ==========================================
// アプリケーション状態管理
// ==========================================
let appData = {
  questions: [],
  folders: ['数学', '英語', '理科', '社会'],
  goals: {
    main: '志望校合格！',
    mini: '今週は50問復習する'
  }
};

let currentImages = []; // 追加/編集中の画像 Base64 アレイ
let currentChart = null; // Chart.js インスタンス保持用

// ==========================================
// 初期化とデータ読み込み・保存
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderFolders();
  renderQuestions();
  updateDashboard();
  initEventListeners();
});

function saveData() {
  localStorage.setItem('mistakeNoteData', JSON.stringify(appData));
}

function loadData() {
  const data = localStorage.getItem('mistakeNoteData');
  if (data) {
    appData = JSON.parse(data);
    if (!appData.folders) appData.folders = ['数学', '英語', '理科', '社会'];
    if (!appData.goals) appData.goals = { main: '', mini: '' };
  }
}

// ==========================================
// ユーティリティ関数
// ==========================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`${tabName}-tab`);
  const targetBtn = document.getElementById(`btn-${tabName}`);
  
  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  // タブ切り替え時の更新処理
  if (tabName === 'dashboard') updateDashboard();
  if (tabName === 'list') renderQuestions();
  if (tabName === 'add') resetForm(); // 新規追加タブ表示時はフォームリセット
}

// ==========================================
// フォルダ管理機能
// ==========================================
function renderFolders() {
  // フォーム用マルチセレクト
  const folderSelect = document.getElementById('q-folders');
  if (folderSelect) {
    folderSelect.innerHTML = appData.folders
      .map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`)
      .join('');
  }

  // フィルター用セレクト
  const filterSelect = document.getElementById('filter-folder');
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">すべてのフォルダ</option>' + 
      appData.folders.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
  }

  // フォルダ管理用リスト表示（UIが存在する場合）
  const folderListContainer = document.getElementById('folder-list-container');
  if (folderListContainer) {
    folderListContainer.innerHTML = appData.folders.map(f => `
      <div class="folder-item">
        <span>${escapeHtml(f)}</span>
        <button type="button" onclick="deleteFolder('${escapeHtml(f)}')">削除</button>
      </div>
    `).join('');
  }
}

function addFolder(folderName) {
  const name = folderName ? folderName.trim() : prompt('新しいフォルダ名を入力してください:');
  if (!name) return;

  if (!appData.folders.includes(name)) {
    appData.folders.push(name);
    saveData();
    renderFolders();
    showToast(`フォルダ「${name}」を追加しました`);
  } else {
    showToast('同名のフォルダが既に存在します');
  }
}

function deleteFolder(folderName) {
  if (!confirm(`フォルダ「${folderName}」を削除しますか？`)) return;

  appData.folders = appData.folders.filter(f => f !== folderName);
  // 登録済み問題から該当フォルダの参照を削除
  appData.questions.forEach(q => {
    if (q.folders) {
      q.folders = q.folders.filter(f => f !== folderName);
    }
  });

  saveData();
  renderFolders();
  renderQuestions();
  showToast('フォルダを削除しました');
}

// ==========================================
// 目標管理機能
// ==========================================
function toggleGoalEdit(type) {
  const form = document.getElementById(`${type}-goal-edit`);
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

function saveGoal(type) {
  const input = document.getElementById(`${type}-goal-input`);
  if (!input) return;

  appData.goals[type] = input.value.trim();
  saveData();

  const displayEl = document.getElementById(`${type}-goal-text`);
  if (displayEl) displayEl.textContent = appData.goals[type] || '未設定';

  toggleGoalEdit(type);
  showToast('目標を更新しました');
}

// ==========================================
// 画像の読み込みと圧縮・プレビュー
// ==========================================
function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      compressImage(e.target.result, (compressedDataUrl) => {
        currentImages.push(compressedDataUrl);
        renderImagePreviews();
      });
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(base64Str, callback) {
  const img = new Image();
  img.src = base64Str;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 1000;
    const MAX_HEIGHT = 1000;
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    callback(canvas.toDataURL('image/jpeg', 0.7)); // 70%の品質圧縮
  };
}

function renderImagePreviews() {
  const container = document.getElementById('image-previews');
  if (!container) return;

  container.innerHTML = currentImages.map((img, idx) => `
    <div class="image-preview-item">
      <img src="${img}" alt="プレビュー">
      <button type="button" class="remove-img-btn" onclick="removeImage(${idx})">&times;</button>
    </div>
  `).join('');
}

function removeImage(index) {
  currentImages.splice(index, 1);
  renderImagePreviews();
}

// ==========================================
// 問題の登録・編集・削除
// ==========================================
function initEventListeners() {
  const form = document.getElementById('question-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const imageInput = document.getElementById('q-images');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageUpload);
  }
}

function handleFormSubmit(event) {
  event.preventDefault();

  const editId = document.getElementById('edit-id').value;
  const title = document.getElementById('q-title').value.trim();
  const memo = document.getElementById('q-memo').value.trim();
  const folderSelect = document.getElementById('q-folders');
  const selectedFolders = Array.from(folderSelect.selectedOptions).map(opt => opt.value);

  if (!title) {
    alert('タイトルを入力してください');
    return;
  }

  const now = new Date().toISOString();

  if (editId) {
    // 既存データの更新
    const index = appData.questions.findIndex(q => q.id === editId);
    if (index !== -1) {
      appData.questions[index] = {
        ...appData.questions[index],
        title,
        memo,
        folders: selectedFolders,
        images: [...currentImages],
        updatedAt: now
      };
      showToast('問題情報を更新しました');
    }
  } else {
    // 新規追加
    const newQuestion = {
      id: 'q_' + Date.now(),
      title,
      memo,
      folders: selectedFolders,
      images: [...currentImages],
      createdAt: now,
      updatedAt: now,
      nextReviewDate: now, // 登録直後はすぐに復習対象とする
      consecutiveCorrect: 0, // 連続正解数
      history: [] // 復習履歴 [{ date: ISOString, result: 'bad'|'good'|'perfect' }]
    };
    appData.questions.push(newQuestion);
    showToast('新しい問題を登録しました');
  }

  saveData();
  resetForm();
  switchTab('list');
}

function resetForm() {
  const form = document.getElementById('question-form');
  if (form) form.reset();

  const editIdEl = document.getElementById('edit-id');
  if (editIdEl) editIdEl.value = '';

  const folderSelect = document.getElementById('q-folders');
  if (folderSelect) {
    Array.from(folderSelect.options).forEach(opt => opt.selected = false);
  }

  currentImages = [];
  renderImagePreviews();
}

function editQuestion(id) {
  const q = appData.questions.find(item => item.id === id);
  if (!q) return;

  switchTab('add');

  document.getElementById('edit-id').value = q.id;
  document.getElementById('q-title').value = q.title;
  document.getElementById('q-memo').value = q.memo || '';

  const folderSelect = document.getElementById('q-folders');
  if (folderSelect && q.folders) {
    Array.from(folderSelect.options).forEach(opt => {
      opt.selected = q.folders.includes(opt.value);
    });
  }

  currentImages = [...(q.images || [])];
  renderImagePreviews();
}

function deleteQuestion(id) {
  if (!confirm('この問題を削除してもよろしいですか？')) return;

  appData.questions = appData.questions.filter(q => q.id !== id);
  saveData();
  renderQuestions();
  updateDashboard();
  showToast('問題を削除しました');
}

// ==========================================
// 一覧表示とフィルタリング
// ==========================================
function renderQuestions() {
  const container = document.getElementById('question-list');
  if (!container) return;

  const filterFolder = document.getElementById('filter-folder')?.value || 'all';
  const filterStatus = document.getElementById('filter-status')?.value || 'all';
  const searchText = document.getElementById('search-input')?.value.toLowerCase() || '';

  const today = new Date().toISOString().split('T')[0];

  const filtered = appData.questions.filter(q => {
    // フォルダフィルター
    if (filterFolder !== 'all' && (!q.folders || !q.folders.includes(filterFolder))) {
      return false;
    }

    // ステータスフィルター
    const isDue = q.nextReviewDate && q.nextReviewDate.split('T')[0] <= today;
    if (filterStatus === 'due' && !isDue) return false;
    if (filterStatus === 'done' && isDue) return false;

    // 検索ワードフィルター
    if (searchText) {
      const matchTitle = q.title.toLowerCase().includes(searchText);
      const matchMemo = q.memo && q.memo.toLowerCase().includes(searchText);
      if (!matchTitle && !matchMemo) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-message">該当する問題が見つかりません</div>';
    return;
  }

  container.innerHTML = filtered.map(q => {
    const isDue = q.nextReviewDate && q.nextReviewDate.split('T')[0] <= today;
    const foldersHtml = (q.folders || []).map(f => `<span class="badge-folder">${escapeHtml(f)}</span>`).join('');
    
    return `
      <div class="question-card ${isDue ? 'is-due' : ''}">
        <div class="card-header">
          <div class="folder-list">${foldersHtml}</div>
          <span class="status-badge ${isDue ? 'badge-due' : 'badge-ok'}">
            ${isDue ? '要復習' : '完了'}
          </span>
        </div>
        <h3 class="card-title">${escapeHtml(q.title)}</h3>
        <p class="card-memo">${escapeHtml(q.memo || '')}</p>
        <div class="card-meta">
          <span>連続正解: ${q.consecutiveCorrect || 0}回</span>
          <span>次回: ${q.nextReviewDate ? q.nextReviewDate.split('T')[0] : '未定'}</span>
        </div>
        <div class="card-actions">
          <button type="button" onclick="openReviewModal('${q.id}')" class="btn-review">復習する</button>
          <button type="button" onclick="editQuestion('${q.id}')" class="btn-edit">編集</button>
          <button type="button" onclick="deleteQuestion('${q.id}')" class="btn-delete">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 復習モーダル & エビングハウス適応型判定ロジック
// ==========================================
function openReviewModal(id) {
  const q = appData.questions.find(item => item.id === id);
  if (!q) return;

  const modal = document.getElementById('review-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  const imagesHtml = (q.images || []).map(img => `
    <div class="modal-img-wrap">
      <img src="${img}" alt="問題画像" onclick="window.open(this.src)">
    </div>
  `).join('');

  content.innerHTML = `
    <h2>${escapeHtml(q.title)}</h2>
    <div class="modal-folders">
      ${(q.folders || []).map(f => `<span class="badge-folder">${escapeHtml(f)}</span>`).join('')}
    </div>
    <div class="modal-images">${imagesHtml}</div>
    <div class="modal-memo">
      <h4>メモ・解説</h4>
      <p>${escapeHtml(q.memo || 'メモはありません')}</p>
    </div>
    <div class="review-buttons">
      <button type="button" class="btn-eval bad" onclick="recordAssessment('${q.id}', 'bad')">× 不正解 (明日)</button>
      <button type="button" class="btn-eval good" onclick="recordAssessment('${q.id}', 'good')">△ 微妙 (短期間)</button>
      <button type="button" class="btn-eval perfect" onclick="recordAssessment('${q.id}', 'perfect')">◯ 完ぺき (段階拡大)</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeReviewModal() {
  const modal = document.getElementById('review-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * 段階的復習間隔（エビングハウスの忘却曲線ベース）に基づく評価更新
 */
function recordAssessment(id, assessment) {
  const q = appData.questions.find(item => item.id === id);
  if (!q) return;

  const now = new Date();
  let daysToAdd = 1;

  if (!q.consecutiveCorrect) q.consecutiveCorrect = 0;

  if (assessment === 'bad') {
    // 不正解：連続正解カウントをリセットし、翌日復習
    q.consecutiveCorrect = 0;
    daysToAdd = 1;
  } else if (assessment === 'good') {
    // 微妙：連続カウントは増やさず、固定で2日後に復習
    daysToAdd = 2;
  } else if (assessment === 'perfect') {
    // 完ぺき：連続正解カウントを増やし、正解数に応じた段階的間隔を設定
    q.consecutiveCorrect += 1;
    
    // エビングハウス忘却曲線に応じた推奨間隔ステップ（1日 -> 3日 -> 7日 -> 14日 -> 30日 -> 60日）
    const intervalSteps = [1, 3, 7, 14, 30, 60];
    const stepIndex = Math.min(q.consecutiveCorrect, intervalSteps.length - 1);
    daysToAdd = intervalSteps[stepIndex];
  }

  // 次回復習日の計算
  const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  q.nextReviewDate = nextDate.toISOString();

  // 履歴の追加
  if (!q.history) q.history = [];
  q.history.push({
    date: now.toISOString(),
    result: assessment
  });

  saveData();
  closeReviewModal();
  renderQuestions();
  updateDashboard();
  showToast(`復習記録を保存しました（次回: ${daysToAdd}日後）`);
}

// ==========================================
// ダッシュボード & Chart.js 連携
// ==========================================
function updateDashboard() {
  // 目標の描画
  const mainGoalText = document.getElementById('main-goal-text');
  const miniGoalText = document.getElementById('mini-goal-text');
  if (mainGoalText) mainGoalText.textContent = appData.goals.main || '未設定';
  if (miniGoalText) miniGoalText.textContent = appData.goals.mini || '未設定';

  // 統計値の計算
  const today = new Date().toISOString().split('T')[0];
  const totalQuestions = appData.questions.length;
  const dueQuestions = appData.questions.filter(q => q.nextReviewDate && q.nextReviewDate.split('T')[0] <= today).length;
  
  const completedToday = appData.questions.filter(q => {
    if (!q.history || q.history.length === 0) return false;
    const lastHistory = q.history[q.history.length - 1];
    return lastHistory.date.split('T')[0] === today;
  }).length;

  // UI表示更新
  const totalEl = document.getElementById('stat-total');
  const dueEl = document.getElementById('stat-due');
  const doneEl = document.getElementById('stat-done');

  if (totalEl) totalEl.textContent = totalQuestions;
  if (dueEl) dueEl.textContent = dueQuestions;
  if (doneEl) doneEl.textContent = completedToday;

  renderChart();
}

function renderChart() {
  const canvas = document.getElementById('review-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  // 過去7日間の日付ラベルと復習数のカウントを生成
  const labels = [];
  const counts = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

    // その日に復習された回数を集計
    let dayCount = 0;
    appData.questions.forEach(q => {
      if (q.history) {
        dayCount += q.history.filter(h => h.date.split('T')[0] === dateStr).length;
      }
    });
    counts.push(dayCount);
  }

  // 既存チャートの破棄
  if (currentChart) {
    currentChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '復習実行数',
        data: counts,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}
