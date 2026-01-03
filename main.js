
// 原始歌曲資料（作為備用）
const ORIGINAL_SONGS = [
    { id: '410172', name: '天空沒有極限' },
    { id: '42686', name: '夢一場' },
    { id: '40196', name: '戀人未滿' },
    { id: '93054', name: '熱帶雨林' },
    { id: '5769', name: '一千個傷心的理由' },
    { id: '47724', name: '填空' },
    { id: '44603', name: '命運' },
    { id: '42031', name: '猜不透' }
];

let availableSongs = [];
let selectedSongs = [];
let randomSongCount = 10; // 預設隨機選擇10首歌曲
let currentFontSize = 16; // 預設字體大小
let isDarkMode = false; // 預設淺色模式
let songHistory = []; // 歷史記錄
let searchToken = 0; // 用於避免多重 fetch 交錯
let isAdminLoggedIn = false; // 管理員登入狀態
const gasApiUrl = 'https://script.google.com/macros/s/AKfycbxUoUD53Sf6Ej1ywmE8PaNiRcW0yuAc7fvb6uPhUq1r2O6Eq01AmXEgWI0jxb4csMcD/exec';

// 篩選器狀態
let currentLangFilter = 'all';
let currentGenderFilter = 'all';

// 男女歌手列表 (根據 song.txt 資料整理)
const maleSingers = [
    '張學友', '周杰倫', '邰正宵', '阿杜', '張宇',
    '范逸臣', '王力宏', '李聖傑', '陳勢安', '趙傳',
    '黃品源', '胡夏', '蘇打綠', '林俊傑',
    '庾澄慶', '蕭煌奇', '譚詠麟', '周興哲', '韋禮安',
    '楊培安', '陳奕迅', '郭桂彬', '施文彬', '周傳雄',
    'MP魔幻力量', '五月天', '理想混蛋', 'Tank', '張信哲'
];
const femaleSingers = [
    '陳潔儀', '黃乙玲', '江蕙', '家家', '田馥甄',
    '那英', '梅艷芳', '丁噹', '陳嘉樺Ella', '蔡依林',
    '鄧麗君', 'A-Lin', '王菲', '張惠妹', '張韶涵',
    '陳淑樺', '楊丞琳', '朱俐靜', '王心凌', '梁靜茹',
    '黃小琥', '范瑋琪', '彭佳慧', '梁文音', '鄧紫棋',
    '郁可唯', '梁詠琪', '何耀珊', '劉若英', '彭羚',
    '辛曉琪', 'S.H.E', '徐若瑄', '黃美珍', '陳盈潔',
    '孫燕姿', '郭靜', '戴愛玲', '李千娜', '曾沛慈',
    '葉蒨文', '林憶蓮', '郭采潔', '于文文', '梁心頤',
    '袁詠琳', '徐佳瑩', 'F.I.R.', 'BY2', '南拳媽媽',
    '尤雅', '李佳薇'
];

// 載入指示器樣式
const loadingHtml = '<i class="fas fa-spinner fa-spin"></i> 處理中...';

// 從song.txt文件加載歌曲數據
function loadSongsFromFile() {
    fetch('song.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('無法讀取歌曲文件');
            }
            return response.text();
        })
        .then(data => {
            const lines = data.split('\n');
            const songs = [];

            lines.forEach(line => {
                line = line.trim();
                if (line) {
                    // 處理可能有多個ID的情況（如 "42657, 903242 我愛他"）
                    if (line.includes(',')) {
                        const parts = line.split(',');
                        const id = parts[0].trim();
                        const restParts = parts.slice(1).join(',').trim();
                        const spaceParts = restParts.split(' ');
                        const secondId = spaceParts[0].trim();
                        const name = spaceParts.slice(1).join(' ').trim();

                        if (id && name) {
                            songs.push({ id: id, name: name });
                        }
                        if (secondId && name) {
                            songs.push({ id: secondId, name: name });
                        }
                    } else {
                        // 正常情況：ID 歌名 語言 歌手
                        const parts = line.includes('\t')
                            ? line.split('\t')
                            : line.split(' ');
                        const [id, name, lang, singer] = parts.map(p => p ? p.trim() : '');

                        if (id && name) {
                            songs.push({ id: id, name: name, lang: lang || '', singer: singer || '' });
                        }
                    }
                }
            });

            if (songs.length > 0) {
                availableSongs = songs;
            } else {
                // 如果無法從文件加載歌曲，使用原始歌曲數據作為備用
                availableSongs = [...ORIGINAL_SONGS];
                console.error('無法從文件加載歌曲，使用備用數據');
            }

            // 渲染歌曲列表
            renderSongList();
        })
        .catch(error => {
            console.error('加載歌曲文件時出錯:', error);
            // 使用原始歌曲數據作為備用
            availableSongs = [...ORIGINAL_SONGS];
            renderSongList();
        });
}

function showFloatingMessage(message) {
    const messageBox = $('<div></div>')
        .text(message)
        .css({
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '5px',
            fontSize: '16px',
            zIndex: 9999,
            textAlign: 'center'
        })
        .appendTo('body');

    setTimeout(() => {
        messageBox.fadeOut(500, function () {
            $(this).remove();
        });
    }, 1500);
}

// 從localStorage讀取設定
function loadSettings() {
    // 讀取隨機歌曲數量
    const savedCount = localStorage.getItem('randomSongCount');
    if (savedCount) {
        randomSongCount = parseInt(savedCount);
    }

    // 讀取已選歌曲
    const savedSongs = localStorage.getItem('selectedSongs');
    if (savedSongs) {
        try {
            const parsedSongs = JSON.parse(savedSongs);
            selectedSongs = parsedSongs;
            renderSelectedList();
        } catch (e) {
            console.error('無法解析已儲存的歌曲', e);
        }
    }

    // 讀取歷史記錄
    const savedHistory = localStorage.getItem('songHistory');
    if (savedHistory) {
        try {
            songHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error('無法解析歷史記錄', e);
            songHistory = [];
        }
    }

    // 讀取字體大小
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        currentFontSize = parseInt(savedFontSize);
        updateFontSize();
    }

    // 讀取主題模式
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        $('#themeToggle').prop('checked', true);
    }

    // 讀取管理員登入狀態
    const savedLoginState = localStorage.getItem('adminLoggedIn');
    const password = $('#adminPassword').val().trim(); // 確保去除空白
    // 只有當 localStorage 為 'true'，且輸入框有值時，才設定 isAdminLoggedIn 為 true
    isAdminLoggedIn = savedLoginState === 'true' && password !== '';
}

// 儲存設定到localStorage
function saveSettings() {
    localStorage.setItem('randomSongCount', randomSongCount);
    localStorage.setItem('selectedSongs', JSON.stringify(selectedSongs));
    localStorage.setItem('fontSize', currentFontSize);
    localStorage.setItem('darkMode', isDarkMode);
    localStorage.setItem('songHistory', JSON.stringify(songHistory));
    localStorage.setItem('adminLoggedIn', isAdminLoggedIn);
}

// 更新字體大小
function updateFontSize() {
    document.documentElement.style.setProperty('--font-size-base', `${currentFontSize}px`);
    document.documentElement.style.setProperty('--font-size-large', `${currentFontSize + 2}px`);
}

// 渲染歌曲列表
function renderSongList(filteredSongs = null) {
    const $songList = $('#songList');
    const $remoteResults = $('#remote-divider, #remote-title, #remote-song-list').detach();
    $songList.empty();

    const songsToRender = filteredSongs || availableSongs;

    if (songsToRender.length === 0 && $('#searchInput').val().trim() !== '') {
        $songList.html('<div class="song-item">沒有符合的本地歌曲</div>');
    } else if (songsToRender.length > 0) {
        songsToRender.forEach(song => {
            const isSelected = selectedSongs.some(s => String(s.id) === String(song.id));

            // ★★★ 添加這段：判斷歌手性別 ★★★
            let gender = 'none';
            if (song.singer) {
                if (maleSingers.some(male => song.singer.includes(male))) {
                    gender = 'male';
                } else if (femaleSingers.some(female => song.singer.includes(female))) {
                    gender = 'female';
                }
            }
            // ★★★ 添加結束 ★★★

            const $songItem = $(`
                <div class="song-item" data-id="${song.id}" data-gender="${gender}">
                   <span>${song.id} - ${song.name} <span style="color:#888;font-size:12px;">${song.lang ? song.lang + ' / ' : ''}${song.singer}</span></span>
                    <button class="btn btn-add" data-id="${song.id}" data-name="${song.name}" data-lang="${song.lang || ''}" data-singer="${song.singer || ''}" ${isSelected ? 'disabled' : ''}>
                        ${isSelected ? '已選' : '+'}
                    </button>
                </div>
            `);
            $songList.append($songItem);
        });
    }
    $songList.append($remoteResults);
}

function renderSelectedList() {
    const $selectedSongs = $('#selectedSongs');
    $selectedSongs.empty();

    if (selectedSongs.length === 0) {
        $selectedSongs.html('<div class="song-item">尚未選擇歌曲</div>');
        return;
    }

    selectedSongs.forEach((song, index) => {
        // ★★★ 添加這段：判斷歌手性別 ★★★
        let gender = 'none';
        if (song.singer) {
            if (maleSingers.some(male => song.singer.includes(male))) {
                gender = 'male';
            } else if (femaleSingers.some(female => song.singer.includes(female))) {
                gender = 'female';
            }
        }
        // ★★★ 添加結束 ★★★

        const $songItem = $(`
            <div class="song-item" data-id="${song.id}" data-index="${index}" data-gender="${gender}">
                <div>
                    <span class="drag-handle">☰</span>
                    <span class="song-number">${index + 1}.</span>
                    <span>${song.id} - ${song.name}</span>
                    <span style="color:#888;font-size:12px;">${song.lang ? song.lang + ' / ' : ''}${song.singer}</span>
                </div>
                <div class="song-actions">
                    <button class="btn btn-remove" data-id="${song.id}">刪除</button>
                </div>
            </div>
        `);
        $selectedSongs.append($songItem);
    });
    $selectedSongs.sortable({
        handle: '.drag-handle',
        axis: 'y',
        update: function (event, ui) {
            const newOrder = [];
            $(this).find('.song-item').each(function () {
                const songId = $(this).attr('data-id');
                const song = selectedSongs.find(s => String(s.id) === String(songId));
                if (song) newOrder.push(song);
            });
            selectedSongs = newOrder;
            renderSelectedList();
            saveSettings();
        }
    }).disableSelection();
}

function saveToHistory() {
    if (selectedSongs.length === 0) {
        showFloatingMessage('沒有選擇歌曲，無法保存');
        return;
    }

    const timestamp = new Date().toLocaleString();
    const defaultName = timestamp;

    // 彈出輸入框讓用戶輸入名稱
    const inputName = prompt('請輸入歷史紀錄名稱（留空使用預設時間）:', defaultName);

    // 用戶按取消則不保存
    if (inputName === null) {
        return;
    }

    const $btn = $('#saveCurrentBtn');
    const originalText = $btn.text();

    // 禁用按鈕並顯示載入指示器
    $btn.prop('disabled', true).html(loadingHtml);

    // 模擬保存過程（實際上是立即的，但為了UI一致性添加短暫延遲）
    setTimeout(function () {
        // 若用戶輸入為空則使用預設時間戳
        const historyName = inputName.trim() || defaultName;

        const historyItem = {
            id: Date.now(), // 使用時間戳作為唯一ID
            name: historyName, // 用戶輸入的名稱或預設時間
            timestamp: timestamp,
            songs: [...selectedSongs]
        };

        songHistory.unshift(historyItem); // 添加到歷史記錄的開頭
        saveSettings();
        showFloatingMessage('已保存到歷史記錄');

        // 恢復按鈕狀態
        $btn.prop('disabled', false).text(originalText);
    }, 500);
}

// 即時搜尋功能（輸入事件）
$('#searchInput').on('input', function () {
    searchSongs();
});

// 當輸入框獲得焦點時，也執行搜尋
$('#searchInput').on('focus', function () {
    searchSongs();
});

let remoteSearchCache = {};
function renderRemoteResults(remoteSongs, currentToken) {
    if (currentToken !== searchToken) return;
    $('#remote-loading').remove();
    $('#songList').append('<div id="remote-divider" style="border-top:1px dashed #aaa;margin:10px 0 5px 0;"></div><div id="remote-title" style="color:#4a6da7;font-weight:bold;margin-bottom:5px;">音圓曲庫查詢結果</div>');
    const $remoteList = $('<div id="remote-song-list"></div>');
    if (!Array.isArray(remoteSongs) || remoteSongs.length === 0) {
        $remoteList.append('<div style="color:#888;">查無音圓曲庫資料</div>');
    } else {
        remoteSongs.forEach(song => {
            if (availableSongs.some(s => String(s.id) === String(song.code))) { return; }
            const isSelected = selectedSongs.some(s => String(s.id) === String(song.code));
            let gender = 'none';
            if (song.singer) {
                if (maleSingers.some(male => song.singer.includes(male))) {
                    gender = 'male';
                } else if (femaleSingers.some(female => song.singer.includes(female))) {
                    gender = 'female';
                }
            }
            const $songItem = $(`
                <div class="song-item remote" data-id="${song.code}" data-gender="${gender}">
                    <span>${song.code} - ${song.name} <span style="color:#888;font-size:12px;">${song.lang ? song.lang + ' / ' : ''}${song.singer}</span></span>
                    <button class="btn btn-add remote-add" data-id="${song.code}" data-name="${song.name}" data-lang="${song.lang || ''}" data-singer="${song.singer || ''}" ${isSelected ? 'disabled' : ''}>
                        ${isSelected ? '已選' : '+'}
                    </button>
                </div>
            `);
            $remoteList.append($songItem);
        });
    }
    $('#songList').append($remoteList);
}
function searchSongs() {
    const rawSearchTerm = $('#searchInput').val().trim();
    const searchTerm = rawSearchTerm.toLowerCase().replace(/\s+/g, '');
    const $songList = $('#songList');

    // 先根據語言和性別過濾
    let filteredSongs = applyFilters(availableSongs);

    // 再根據搜尋關鍵字過濾
    if (searchTerm !== '') {
        filteredSongs = filteredSongs.filter(song =>
            song.name.toLowerCase().includes(searchTerm) ||
            song.id.toLowerCase().includes(searchTerm) ||
            (song.singer && song.singer.toLowerCase().includes(searchTerm))
        );
    }

    $songList.empty();
    renderSongList(filteredSongs);
    const thisToken = ++searchToken;
    const keyword = encodeURIComponent(rawSearchTerm);
    if (!keyword) return;
    $('#remote-loading, #remote-divider, #remote-title, #remote-song-list').remove();
    if (remoteSearchCache[keyword]) {
        renderRemoteResults(remoteSearchCache[keyword], thisToken);
        return;
    }
    $songList.append('<div id="remote-loading" style="padding:10px;color:#888;">正在查詢音圓曲庫...</div>');
    const apiUrl = `${gasApiUrl}?action=relaySongApi&keyword=${keyword}`;
    fetch(apiUrl).then(res => res.json()).then(function (remoteSongs) {
        if (thisToken !== searchToken) return;
        remoteSearchCache[keyword] = remoteSongs;
        renderRemoteResults(remoteSongs, thisToken);
    }).catch(function () {
        if (thisToken !== searchToken) return;
        $('#remote-loading').remove();
        $songList.append('<div style="color:red;">音圓曲庫查詢失敗</div>');
    });
};

// 隨機選擇
$('#randomSelectBtn').click(function () {
    // 使用當前設定的數量直接進行隨機選擇
    const availableForRandom = availableSongs.filter(song =>
        !selectedSongs.some(s => String(s.id) === String(song.id))
    );

    const randomSongs = availableForRandom
        .sort(() => 0.5 - Math.random())
        .slice(0, randomSongCount);

    if (randomSongs.length === 0) {
        showFloatingMessage('沒有可供隨機選擇的歌曲');
        return;
    }

    randomSongs.forEach(song => {
        // 直接將歌曲加到 selectedSongs 陣列
        if (!selectedSongs.some(s => String(s.id) === String(song.id))) {
            selectedSongs.push(song);
        }
    });

    // 全部加完後，一次性更新畫面與儲存
    renderSelectedList();
    saveSettings();

    // 更新按鈕狀態
    randomSongs.forEach(song => {
        $(`.song - item[data - id="${song.id}"]`).find('.btn-add, .remote-add').text('已選').prop('disabled', true);
    });

    showFloatingMessage(`已隨機加入 ${randomSongs.length} 首歌曲`);
});

// 設定按鈕的點擊事件
$('#randomSettingBtn').click(function (e) {
    e.stopPropagation();
    $('#randomDropdown').toggleClass('show');
    $('#randomCountInput').val(randomSongCount);
});

// 確認設定新的隨機數量
$('#setRandomCountBtn').click(function () {
    const newCount = parseInt($('#randomCountInput').val());
    if (!isNaN(newCount) && newCount > 0) {
        randomSongCount = newCount;
        saveSettings();
        $('#randomDropdown').removeClass('show');
        showFloatingMessage('已更新隨機選擇數量');
    }
});

// 點擊其他地方關閉下拉選單
$(document).click(function (e) {
    if (!$(e.target).closest('.btn-group').length) {
        $('.dropdown-content').removeClass('show');
    }
});

// 渲染歷史記錄
function renderHistory() {
    const $historyList = $('#historyList');
    $historyList.empty();

    if (songHistory.length === 0) {
        $historyList.html('<div class="song-item">沒有歷史記錄</div>');
        return;
    }

    songHistory.forEach((history, index) => {
        // 優先顯示 name，若無則使用 timestamp（向後相容）
        const displayName = history.name || history.timestamp;
        // 顯示時間戳（若 name 與 timestamp 不同則顯示）
        const timeInfo = history.name && history.name !== history.timestamp
            ? ` (${history.timestamp}, ${history.songs.length}首)`
            : ` (${history.songs.length}首)`;

        const $historyItem = $(`
            <div class="song-item" data-id="${history.id}">
                <div>
                    <span class="song-number">${index + 1}.</span>
                    <span>${displayName}${timeInfo}</span>
                </div>
                <div class="song-actions">
                    <button class="btn" onclick="loadHistory(${history.id})">載入</button>
                    <button class="btn btn-remove" onclick="deleteHistory(${history.id})">刪除</button>
                </div>
            </div>
        `);
        $historyList.append($historyItem);
    });
}

// 載入歷史記錄
function loadHistory(historyId) {
    const history = songHistory.find(h => h.id === historyId);
    if (history) {
        if (confirm('這將替換當前已選歌曲，確定要載入嗎？')) {
            selectedSongs = [...history.songs];
            renderSelectedList();
            renderSongList();
            saveSettings();
            $('#historyPanel').slideUp(300);
        }
    }
}

// 刪除歷史記錄
function deleteHistory(historyId) {
    if (confirm('確定要刪除這條歷史記錄嗎？')) {
        songHistory = songHistory.filter(h => h.id !== historyId);
        renderHistory();
        saveSettings();
    }
}

// 查看歷史記錄按鈕
$('#viewHistoryBtn').click(function () {
    renderHistory();
    // 使用slideToggle來進行平滑的顯示/隱藏
    $('#historyPanel').slideToggle(300);
});

// 關閉歷史記錄面板
$('#closeHistoryBtn').click(function () {
    $('#historyPanel').slideUp(300);
});

// 管理面板
$('#openAdminPanel').click(function () {
    // 使用slideToggle來進行平滑的顯示/隱藏
    $('#adminPanel').toggle(50, function () {
        // 在面板完全展開後，使用jQuery的animate方法平滑滾動到底部
        $('html, body').animate({
            scrollTop: $(document).height() - $(window).height()
        }, 200);
        $('#adminPassword').focus();
    });

    // 如果已經登入，直接顯示管理區域
    if (isAdminLoggedIn) {
        $('#passwordSection').hide();
        $('#songManagementSection').show();
        // 顯示所有管理輸入框和按鈕
        $('#newSongId, #newSongName, #newSongLang, #newSongSinger, #addSongBtn, #loadFromSheetBtn').show();
    } else {
        $('#passwordSection').show();
        $('#songManagementSection').hide();
        $('#adminPassword').val('');
    }
});

// 驗證密碼
$('#adminPassword').on('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // 防止按 Enter 觸發其他默認行為
        $('#verifyPasswordBtn').click(); // 模擬點擊驗證密碼按鈕
    }
});
$('#verifyPasswordBtn').click(function () {
    const password = $('#adminPassword').val();
    const $btn = $(this);
    const originalText = $btn.text();

    // 禁用按鈕並顯示載入指示器
    $btn.prop('disabled', true).html(loadingHtml);

    // 使用本地測試URL
    const apiUrl = gasApiUrl;

    // 確認是否要載入新的歌單
    $.get(apiUrl, {
        action: "verifyPassword",
        password: password
    },
        function (data) {
            if (data.success) {  // 根據你的 API 結果，這裡是 success 屬性
                $('#passwordSection').hide();
                $('#songManagementSection').show();
                // 顯示所有管理輸入框和按鈕
                $('#newSongId, #newSongName, #newSongLang, #newSongSinger, #addSongBtn, #loadFromSheetBtn').show();
                // 在面板完全展開後，使用jQuery的animate方法平滑滾動到底部
                $('html, body').animate({
                    scrollTop: $(document).height() - $(window).height()
                }, 200);
                isAdminLoggedIn = true;
                saveSettings(); // 保存登入狀態
            } else {
                alert('登入失敗: ' + data.message);
            }
            // 恢復按鈕狀態
            $btn.prop('disabled', false).text(originalText);
        }
    ).fail(function (xhr, status, error) {
        alert('登入失敗: ' + error);
        console.error('API錯誤:', xhr, status, error);
        // 恢復按鈕狀態
        $btn.prop('disabled', false).text(originalText);
    });
});

// 新增歌曲
$('#addSongBtn').click(function () {
    let songId = $('#newSongId').val().trim();
    let songName = $('#newSongName').val().trim();
    let songLang = $('#newSongLang').val().trim();
    let songSinger = $('#newSongSinger').val().trim();
    const $btn = $(this);
    const originalText = "新增歌曲";

    // 禁用按鈕並顯示載入指示器
    $btn.prop('disabled', true).html(loadingHtml);

    // 如果ID或名稱為空，嘗試從另一個輸入框中解析多行文本
    // 若輸入框之一為空，嘗試從單輸入多資訊字串解析
    if ((!songId || !songName) && (songId || songName)) {
        const inputText = songId || songName;
        // 解析格式：ID 名稱 語言 / 其他 歌手
        // 先分段
        const parts = inputText.trim().split(/\s+/);
        if (parts.length >= 3) {
            songId = parts[0];
            const singer = parts[parts.length - 1];
            const lang = parts[parts.length - 2] === '/' ? '' : parts[parts.length - 2];
            // 名稱位於 ID 與 lang 之間
            songName = parts.slice(1, parts.length - 2).join(' ');
            // 將解析結果填入
            $('#newSongId').val(songId);
            $('#newSongName').val(songName);
            // 若之後有 lang 與 singer 輸入框，可一併處理
        }
    } else {
        // 如果兩個輸入框都有值，則直接使用
        songId = songId.replace(/\s+/g, '');
        songName = songName.replace(/\s+/g, '');
    }

    if (songId && songName) {
        // 檢查是否已存在相同曲號和歌名
        const existingSongWithSameIdAndName = availableSongs.find(song =>
            song.id === songId && song.name === songName
        );

        if (existingSongWithSameIdAndName) {
            // 恢復按鈕狀態
            $btn.prop('disabled', false).text(originalText);
            showFloatingMessage('已存在相同曲號和歌名的歌曲');
            return;
        }

        // 檢查是否存在相同歌名但不同曲號
        const existingSongWithSameName = availableSongs.find(song =>
            song.name === songName && song.id !== songId
        );

        // 檢查是否存在相同曲號但不同歌名
        const existingSongWithSameId = availableSongs.find(song =>
            song.id === songId && song.name !== songName
        );

        let confirmMessage = '';

        if (existingSongWithSameName) {
            confirmMessage = `已存在歌名「${songName}」但曲號不同的歌曲，確定要新增嗎？`;
        } else if (existingSongWithSameId) {
            // 恢復按鈕狀態
            $btn.prop('disabled', false).text(originalText);
            alert(`已存在曲號「${songId}」但歌名不同的歌曲`);
            return;
        } else {
            // 全新的歌曲，直接新增
            addNewSong(songId, songName, songLang, songSinger);
            setTimeout(function () {
                getSongs();
                const $songList = $('#songList');
                // 自動滾動到底部
                $songList.scrollTop($songList[0].scrollHeight);
            }, 1500);  // 延遲 1.5 秒執行 getSongs()
            return;
        }

        // 需要確認的情況
        if (confirm(confirmMessage)) {
            addNewSong(songId, songName, songLang, songSinger);
            setTimeout(function () {
                getSongs();
                const $songList = $('#songList');
                // 自動滾動到底部
                $songList.scrollTop($songList[0].scrollHeight);
            }, 1500);  // 延遲 1.5 秒執行 getSongs()
        } else {
            // 用戶取消，恢復按鈕狀態
            $btn.prop('disabled', false).text(originalText);
        }
    } else {
        // 恢復按鈕狀態
        $btn.prop('disabled', false).text(originalText);
        showFloatingMessage('請輸入歌曲編號和名稱');
    }

});

// 實際新增歌曲的函數
function addNewSong(songId, songName, songLang, songSinger) {
    addSongToSheet(songId, songName, songLang, songSinger)
}

// 從Google Sheet載入歌單
$('#loadFromSheetBtn').click(function () {
    const $btn = $(this);
    const originalText = $btn.text();

    // 禁用按鈕並顯示載入指示器
    $btn.prop('disabled', true).html(loadingHtml);

    getSongs($btn, originalText);
});

function getSongs($btn, originalText) {
    // 本地測試用URL
    const localApiUrl = 'http://localhost:8080/getSongs';
    // Google Apps Script部署後的URL (需要替換為實際部署的URL)
    // const gasApiUrl = 'https://script.google.com/macros/s/AKfycbzvR0oqjhxtcWbCo7KoyvryNNDFrw1BbzWPqatWxEr_jk1VYJf6H3-i-mLb-pVlZ4kA/exec';

    // 使用本地測試URL
    const apiUrl = gasApiUrl;

    // 確認是否要載入新的歌單
    $.get(apiUrl, {
        action: "getSongs"
    },
        function (data) {
            if (Array.isArray(data)) {
                // 更新歌曲列表
                availableSongs = data;
                renderSongList();
                // 顯示 1.5 秒的懸浮訊息
                showFloatingMessage(`成功從 API 載入 ${data.length} 首歌曲`);
            } else {
                alert('API返回格式錯誤');
            }

            // 恢復按鈕狀態
            if ($btn) {
                $btn.prop('disabled', false).text(originalText);
            }
        }
    ).fail(function (xhr, status, error) {
        alert('無法連接到API: ' + error);
        console.error('API錯誤:', xhr, status, error);

        // 恢復按鈕狀態
        if ($btn) {
            $btn.prop('disabled', false).text(originalText);
        }
    });
}
// 新增歌曲到Google Sheet
function addSongToSheet(songId, songName, songLang, songSinger) {
    const $btn = $('#addSongBtn');
    const originalText = "新增歌曲";

    // 禁用按鈕並顯示載入指示器
    $btn.prop('disabled', true).html(loadingHtml);

    // 本地測試用URL
    const localApiUrl = 'http://localhost:8080/addSong';
    // Google Apps Script部署後的URL (需要替換為實際部署的URL)
    // const gasApiUrl = 'https://script.google.com/macros/s/AKfycbzvR0oqjhxtcWbCo7KoyvryNNDFrw1BbzWPqatWxEr_jk1VYJf6H3-i-mLb-pVlZ4kA/exec';

    // 使用本地測試URL
    const apiUrl = gasApiUrl;
    $.post(apiUrl, JSON.stringify({
        action: "addSong",
        password: $('#adminPassword').val(),
        songId: songId,
        songName: songName,
        songLang: songLang,
        songSinger: songSinger
    }),
        function (data) {
            console.log('API 回應: ' + JSON.stringify(data, null, 2)); // 格式化輸出
            if (data.success) {
                showFloatingMessage(`歌曲 "${songName}" 新增成功`);
                // 清空輸入框
                $('#newSongId').val('');
                $('#newSongName').val('');
            } else {
                alert(`!!~歌曲新增失敗: ${data.message || '未知錯誤'} `);
            }
            // 恢復按鈕狀態
            $btn.prop('disabled', false).text(originalText);
        }
    ).fail(function (xhr, status, error) {
        alert(`!!~無法連接到API: ${error} `);
        // 恢復按鈕狀態
        $btn.prop('disabled', false).text(originalText);
    });

}

// 字體大小控制
$('#increaseFontBtn').click(function () {
    if (currentFontSize < 24) {
        currentFontSize += 2;
        updateFontSize();
        saveSettings();
    }
});

$('#decreaseFontBtn').click(function () {
    if (currentFontSize > 12) {
        currentFontSize -= 2;
        updateFontSize();
        saveSettings();
    }
});

// 主題切換
$('#themeToggle').change(function () {
    isDarkMode = $(this).is(':checked');
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    saveSettings();
});

// 初始化
loadSettings();
renderSongList();
renderSelectedList(); // Corrected function name

// Centralized event handler for adding/removing songs
$(document).on('click', '.btn-add, .remote-add', function () {
    const $btn = $(this);
    const songId = String($btn.data('id'));

    if ($btn.prop('disabled')) return;

    const songName = $btn.data('name');
    const songLang = $btn.data('lang');
    const songSinger = $btn.data('singer');

    selectedSongs.push({ id: songId, name: songName, lang: songLang, singer: songSinger });

    renderSelectedList();
    saveSettings();

    // Update button states in both local and remote lists without full refresh
    $(`.song-item[data-id="${songId}"]`).find('.btn-add, .remote-add').text('已選').prop('disabled', true);

    // Restore auto-fill feature for remote songs
    if ($btn.hasClass('remote-add')) {
        if (!$('#adminPanel').is(':visible')) $('#openAdminPanel').click();
        $('#newSongId').val(songId);
        $('#newSongName').val(songName);
        $('#newSongLang').val(songLang || '');
        $('#newSongSinger').val(songSinger || '');
    }
});

$(document).on('click', '.btn-remove', function () {
    const songId = String($(this).data('id'));
    const songObj = selectedSongs.find(s => s.id === songId);
    if (!songObj) return;

    const isLocal = availableSongs.some(s => s.id === songId);
    let saveInfo = false;

    if (!isLocal) {
        saveInfo = confirm(`此歌曲尚未存入您的歌庫，是否要儲存它的資訊？\n\n(按「確定」來填入資料，歌曲將會被移除。按「取消」則直接移除。`);
    }

    // Step 1: Immediately remove the song from the data model and update the UI.
    selectedSongs = selectedSongs.filter(s => s.id !== songId);
    renderSelectedList();
    saveSettings();
    $(`.song - item[data - id="${songId}"]`).find('.btn-add, .remote-add').text('+').prop('disabled', false);

    // Step 2: After the removal is complete, fill the form if the user requested it.
    if (saveInfo) {
        if (!$('#adminPanel').is(':visible')) $('#openAdminPanel').click();
        $('#newSongId').val(songObj.id);
        $('#newSongName').val(songObj.name);
        $('#newSongLang').val(songObj.lang || '');
        $('#newSongSinger').val(songObj.singer || '');
    }
});



// 篩選函數
function applyFilters(songs) {
    let filtered = songs;

    // 語言篩選
    if (currentLangFilter !== 'all') {
        filtered = filtered.filter(song => song.lang === currentLangFilter);
    }

    // 性別篩選
    if (currentGenderFilter !== 'all') {
        if (currentGenderFilter === 'male') {
            filtered = filtered.filter(song => {
                if (!song.singer) return false;
                // 檢查歌手是否在男歌手列表中，或者包含男歌手名字
                return maleSingers.some(male => song.singer.includes(male));
            });
        } else if (currentGenderFilter === 'female') {
            filtered = filtered.filter(song => {
                if (!song.singer) return false;
                // 檢查歌手是否在女歌手列表中，或者包含女歌手名字
                return femaleSingers.some(female => song.singer.includes(female));
            });
        }
    }

    return filtered;
}

// 篩選器切換按鈕
$('#filterToggleBtn').click(function () {
    const $filterSection = $('#filterSection');
    const $chevron = $('#filterChevron');

    if ($filterSection.hasClass('show')) {
        $filterSection.removeClass('show');
        $chevron.removeClass('rotated');
    } else {
        $filterSection.addClass('show');
        $chevron.addClass('rotated');
    }
});

// Custom Dropdown Logic
$('.select-trigger').click(function (e) {
    e.stopPropagation();
    const $parent = $(this).parent();
    $('.custom-select').not($parent).removeClass('open'); // Close others
    $parent.toggleClass('open');
});

$(document).click(function () {
    $('.custom-select').removeClass('open');
});

$('.option').click(function () {
    const $option = $(this);
    const $wrapper = $option.closest('.custom-select');
    const value = $option.data('value');
    const text = $option.text();

    // Update trigger text
    $wrapper.find('.select-trigger span').text(text);

    // Update active state
    $wrapper.find('.option').removeClass('selected');
    $option.addClass('selected');

    // Handle logic based on which dropdown it is
    if ($wrapper.attr('id') === 'langSelectWrapper') {
        currentLangFilter = value;
        searchSongs();
    } else if ($wrapper.attr('id') === 'genderSelectWrapper') {
        currentGenderFilter = value;
        searchSongs();
    }

    // Close dropdown
    $wrapper.removeClass('open');
});

// 頁面加載時初始化
$(document).ready(function () {
    // 從song.txt加載歌曲數據
    loadSongsFromFile();
});

// 將函數暴露到全局作用域，以便在HTML中調用
window.loadHistory = loadHistory;
window.deleteHistory = deleteHistory;
window.saveToHistory = saveToHistory;
