(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const ORIGINAL_SONGS = [
  { id: "410172", name: "天空沒有極限" },
  { id: "42686", name: "夢一場" },
  { id: "40196", name: "戀人未滿" },
  { id: "93054", name: "熱帶雨林" },
  { id: "5769", name: "一千個傷心的理由" },
  { id: "47724", name: "填空" },
  { id: "44603", name: "命運" },
  { id: "42031", name: "猜不透" }
];
let availableSongs = [];
let selectedSongs = [];
let randomSongCount = 10;
let currentFontSize = 16;
let isDarkMode = false;
let songHistory = [];
let searchToken = 0;
let isAdminLoggedIn = false;
const gasApiUrl = "https://script.google.com/macros/s/AKfycbxUoUD53Sf6Ej1ywmE8PaNiRcW0yuAc7fvb6uPhUq1r2O6Eq01AmXEgWI0jxb4csMcD/exec";
let currentLangFilter = "all";
let currentGenderFilter = "all";
const maleSingers = [
  "張學友",
  "周杰倫",
  "邰正宵",
  "阿杜",
  "張宇",
  "范逸臣",
  "王力宏",
  "李聖傑",
  "陳勢安",
  "趙傳",
  "黃品源",
  "胡夏",
  "蘇打綠",
  "林俊傑",
  "庾澄慶",
  "蕭煌奇",
  "譚詠麟",
  "周興哲",
  "韋禮安",
  "楊培安",
  "陳奕迅",
  "郭桂彬",
  "施文彬",
  "周傳雄",
  "MP魔幻力量",
  "五月天",
  "理想混蛋",
  "Tank",
  "張信哲"
];
const femaleSingers = [
  "陳潔儀",
  "黃乙玲",
  "江蕙",
  "家家",
  "田馥甄",
  "那英",
  "梅艷芳",
  "丁噹",
  "陳嘉樺Ella",
  "蔡依林",
  "鄧麗君",
  "A-Lin",
  "王菲",
  "張惠妹",
  "張韶涵",
  "陳淑樺",
  "楊丞琳",
  "朱俐靜",
  "王心凌",
  "梁靜茹",
  "黃小琥",
  "范瑋琪",
  "彭佳慧",
  "梁文音",
  "鄧紫棋",
  "郁可唯",
  "梁詠琪",
  "何耀珊",
  "劉若英",
  "彭羚",
  "辛曉琪",
  "S.H.E",
  "徐若瑄",
  "黃美珍",
  "陳盈潔",
  "孫燕姿",
  "郭靜",
  "戴愛玲",
  "李千娜",
  "曾沛慈",
  "葉蒨文",
  "林憶蓮",
  "郭采潔",
  "于文文",
  "梁心頤",
  "袁詠琳",
  "徐佳瑩",
  "F.I.R.",
  "BY2",
  "南拳媽媽",
  "尤雅",
  "李佳薇"
];
const loadingHtml = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
function loadSongsFromFile() {
  fetch("song.txt").then((response) => {
    if (!response.ok) {
      throw new Error("無法讀取歌曲文件");
    }
    return response.text();
  }).then((data) => {
    const lines = data.split("\n");
    const songs = [];
    lines.forEach((line) => {
      line = line.trim();
      if (line) {
        if (line.includes(",")) {
          const parts = line.split(",");
          const id = parts[0].trim();
          const restParts = parts.slice(1).join(",").trim();
          const spaceParts = restParts.split(" ");
          const secondId = spaceParts[0].trim();
          const name = spaceParts.slice(1).join(" ").trim();
          if (id && name) {
            songs.push({ id, name });
          }
          if (secondId && name) {
            songs.push({ id: secondId, name });
          }
        } else {
          const parts = line.includes("	") ? line.split("	") : line.split(" ");
          const [id, name, lang, singer] = parts.map((p) => p ? p.trim() : "");
          if (id && name) {
            songs.push({ id, name, lang: lang || "", singer: singer || "" });
          }
        }
      }
    });
    if (songs.length > 0) {
      availableSongs = songs;
    } else {
      availableSongs = [...ORIGINAL_SONGS];
      console.error("無法從文件加載歌曲，使用備用數據");
    }
    renderSongList();
  }).catch((error) => {
    console.error("加載歌曲文件時出錯:", error);
    availableSongs = [...ORIGINAL_SONGS];
    renderSongList();
  });
}
function showFloatingMessage(message) {
  const messageBox = $("<div></div>").text(message).css({
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "5px",
    fontSize: "16px",
    zIndex: 9999,
    textAlign: "center"
  }).appendTo("body");
  setTimeout(() => {
    messageBox.fadeOut(500, function() {
      $(this).remove();
    });
  }, 1500);
}
function loadSettings() {
  const savedCount = localStorage.getItem("randomSongCount");
  if (savedCount) {
    randomSongCount = parseInt(savedCount);
  }
  const savedSongs = localStorage.getItem("selectedSongs");
  if (savedSongs) {
    try {
      const parsedSongs = JSON.parse(savedSongs);
      selectedSongs = parsedSongs;
      renderSelectedList();
    } catch (e) {
      console.error("無法解析已儲存的歌曲", e);
    }
  }
  const savedHistory = localStorage.getItem("songHistory");
  if (savedHistory) {
    try {
      songHistory = JSON.parse(savedHistory);
    } catch (e) {
      console.error("無法解析歷史記錄", e);
      songHistory = [];
    }
  }
  const savedFontSize = localStorage.getItem("fontSize");
  if (savedFontSize) {
    currentFontSize = parseInt(savedFontSize);
    updateFontSize();
  }
  const savedTheme = localStorage.getItem("darkMode");
  if (savedTheme === "true") {
    isDarkMode = true;
    document.body.classList.add("dark-mode");
    $("#themeToggle").prop("checked", true);
  }
  const savedLoginState = localStorage.getItem("adminLoggedIn");
  const password = $("#adminPassword").val().trim();
  isAdminLoggedIn = savedLoginState === "true" && password !== "";
}
function saveSettings() {
  localStorage.setItem("randomSongCount", randomSongCount);
  localStorage.setItem("selectedSongs", JSON.stringify(selectedSongs));
  localStorage.setItem("fontSize", currentFontSize);
  localStorage.setItem("darkMode", isDarkMode);
  localStorage.setItem("songHistory", JSON.stringify(songHistory));
  localStorage.setItem("adminLoggedIn", isAdminLoggedIn);
}
function updateFontSize() {
  document.documentElement.style.setProperty("--font-size-base", `${currentFontSize}px`);
  document.documentElement.style.setProperty("--font-size-large", `${currentFontSize + 2}px`);
}
function renderSongList(filteredSongs = null) {
  const $songList = $("#songList");
  const $remoteResults = $("#remote-divider, #remote-title, #remote-song-list").detach();
  $songList.empty();
  const songsToRender = filteredSongs || availableSongs;
  if (songsToRender.length === 0 && $("#searchInput").val().trim() !== "") {
    $songList.html('<div class="song-item">沒有符合的本地歌曲</div>');
  } else if (songsToRender.length > 0) {
    songsToRender.forEach((song) => {
      const isSelected = selectedSongs.some((s) => String(s.id) === String(song.id));
      let gender = "none";
      if (song.singer) {
        if (maleSingers.some((male) => song.singer.includes(male))) {
          gender = "male";
        } else if (femaleSingers.some((female) => song.singer.includes(female))) {
          gender = "female";
        }
      }
      const $songItem = $(`
                <div class="song-item" data-id="${song.id}" data-gender="${gender}">
                   <span>${song.id} - ${song.name} <span style="color:#888;font-size:12px;">${song.lang ? song.lang + " / " : ""}${song.singer}</span></span>
                    <button class="btn btn-add" data-id="${song.id}" data-name="${song.name}" data-lang="${song.lang || ""}" data-singer="${song.singer || ""}" ${isSelected ? "disabled" : ""}>
                        ${isSelected ? "已選" : "+"}
                    </button>
                </div>
            `);
      $songList.append($songItem);
    });
  }
  $songList.append($remoteResults);
}
function renderSelectedList() {
  const $selectedSongs = $("#selectedSongs");
  $selectedSongs.empty();
  if (selectedSongs.length === 0) {
    $selectedSongs.html('<div class="song-item">尚未選擇歌曲</div>');
    return;
  }
  selectedSongs.forEach((song, index) => {
    let gender = "none";
    if (song.singer) {
      if (maleSingers.some((male) => song.singer.includes(male))) {
        gender = "male";
      } else if (femaleSingers.some((female) => song.singer.includes(female))) {
        gender = "female";
      }
    }
    const $songItem = $(`
            <div class="song-item" data-id="${song.id}" data-index="${index}" data-gender="${gender}">
                <div>
                    <span class="drag-handle">☰</span>
                    <span class="song-number">${index + 1}.</span>
                    <span>${song.id} - ${song.name}</span>
                    <span style="color:#888;font-size:12px;">${song.lang ? song.lang + " / " : ""}${song.singer}</span>
                </div>
                <div class="song-actions">
                    <button class="btn btn-remove" data-id="${song.id}">刪除</button>
                </div>
            </div>
        `);
    $selectedSongs.append($songItem);
  });
  $selectedSongs.sortable({
    handle: ".drag-handle",
    axis: "y",
    update: function(event, ui) {
      const newOrder = [];
      $(this).find(".song-item").each(function() {
        const songId = $(this).attr("data-id");
        const song = selectedSongs.find((s) => String(s.id) === String(songId));
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
    showFloatingMessage("沒有選擇歌曲，無法保存");
    return;
  }
  const $btn = $("#saveCurrentBtn");
  const originalText = $btn.text();
  $btn.prop("disabled", true).html(loadingHtml);
  setTimeout(function() {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleString();
    const historyItem = {
      id: Date.now(),
      // 使用時間戳作為唯一ID
      timestamp,
      songs: [...selectedSongs]
    };
    songHistory.unshift(historyItem);
    saveSettings();
    showFloatingMessage("已保存到歷史記錄");
    $btn.prop("disabled", false).text(originalText);
  }, 500);
}
$("#searchInput").on("input", function() {
  searchSongs();
});
$("#searchInput").on("focus", function() {
  searchSongs();
});
let remoteSearchCache = {};
function renderRemoteResults(remoteSongs, currentToken) {
  if (currentToken !== searchToken) return;
  $("#remote-loading").remove();
  $("#songList").append('<div id="remote-divider" style="border-top:1px dashed #aaa;margin:10px 0 5px 0;"></div><div id="remote-title" style="color:#4a6da7;font-weight:bold;margin-bottom:5px;">音圓曲庫查詢結果</div>');
  const $remoteList = $('<div id="remote-song-list"></div>');
  if (!Array.isArray(remoteSongs) || remoteSongs.length === 0) {
    $remoteList.append('<div style="color:#888;">查無音圓曲庫資料</div>');
  } else {
    remoteSongs.forEach((song) => {
      if (availableSongs.some((s) => String(s.id) === String(song.code))) {
        return;
      }
      const isSelected = selectedSongs.some((s) => String(s.id) === String(song.code));
      let gender = "none";
      if (song.singer) {
        if (maleSingers.some((male) => song.singer.includes(male))) {
          gender = "male";
        } else if (femaleSingers.some((female) => song.singer.includes(female))) {
          gender = "female";
        }
      }
      const $songItem = $(`
                <div class="song-item remote" data-id="${song.code}" data-gender="${gender}">
                    <span>${song.code} - ${song.name} <span style="color:#888;font-size:12px;">${song.lang ? song.lang + " / " : ""}${song.singer}</span></span>
                    <button class="btn btn-add remote-add" data-id="${song.code}" data-name="${song.name}" data-lang="${song.lang || ""}" data-singer="${song.singer || ""}" ${isSelected ? "disabled" : ""}>
                        ${isSelected ? "已選" : "+"}
                    </button>
                </div>
            `);
      $remoteList.append($songItem);
    });
  }
  $("#songList").append($remoteList);
}
function searchSongs() {
  const rawSearchTerm = $("#searchInput").val().trim();
  const searchTerm = rawSearchTerm.toLowerCase().replace(/\s+/g, "");
  const $songList = $("#songList");
  let filteredSongs = applyFilters(availableSongs);
  if (searchTerm !== "") {
    filteredSongs = filteredSongs.filter(
      (song) => song.name.toLowerCase().includes(searchTerm) || song.id.toLowerCase().includes(searchTerm) || song.singer && song.singer.toLowerCase().includes(searchTerm)
    );
  }
  $songList.empty();
  renderSongList(filteredSongs);
  const thisToken = ++searchToken;
  const keyword = encodeURIComponent(rawSearchTerm);
  if (!keyword) return;
  $("#remote-loading, #remote-divider, #remote-title, #remote-song-list").remove();
  if (remoteSearchCache[keyword]) {
    renderRemoteResults(remoteSearchCache[keyword], thisToken);
    return;
  }
  $songList.append('<div id="remote-loading" style="padding:10px;color:#888;">正在查詢音圓曲庫...</div>');
  const apiUrl = `${gasApiUrl}?action=relaySongApi&keyword=${keyword}`;
  fetch(apiUrl).then((res) => res.json()).then(function(remoteSongs) {
    if (thisToken !== searchToken) return;
    remoteSearchCache[keyword] = remoteSongs;
    renderRemoteResults(remoteSongs, thisToken);
  }).catch(function() {
    if (thisToken !== searchToken) return;
    $("#remote-loading").remove();
    $songList.append('<div style="color:red;">音圓曲庫查詢失敗</div>');
  });
}
$("#randomSelectBtn").click(function() {
  const availableForRandom = availableSongs.filter(
    (song) => !selectedSongs.some((s) => String(s.id) === String(song.id))
  );
  const randomSongs = availableForRandom.sort(() => 0.5 - Math.random()).slice(0, randomSongCount);
  if (randomSongs.length === 0) {
    showFloatingMessage("沒有可供隨機選擇的歌曲");
    return;
  }
  randomSongs.forEach((song) => {
    if (!selectedSongs.some((s) => String(s.id) === String(song.id))) {
      selectedSongs.push(song);
    }
  });
  renderSelectedList();
  saveSettings();
  randomSongs.forEach((song) => {
    $(`.song - item[data - id="${song.id}"]`).find(".btn-add, .remote-add").text("已選").prop("disabled", true);
  });
  showFloatingMessage(`已隨機加入 ${randomSongs.length} 首歌曲`);
});
$("#randomSettingBtn").click(function(e) {
  e.stopPropagation();
  $("#randomDropdown").toggleClass("show");
  $("#randomCountInput").val(randomSongCount);
});
$("#setRandomCountBtn").click(function() {
  const newCount = parseInt($("#randomCountInput").val());
  if (!isNaN(newCount) && newCount > 0) {
    randomSongCount = newCount;
    saveSettings();
    $("#randomDropdown").removeClass("show");
    showFloatingMessage("已更新隨機選擇數量");
  }
});
$(document).click(function(e) {
  if (!$(e.target).closest(".btn-group").length) {
    $(".dropdown-content").removeClass("show");
  }
});
function renderHistory() {
  const $historyList = $("#historyList");
  $historyList.empty();
  if (songHistory.length === 0) {
    $historyList.html('<div class="song-item">沒有歷史記錄</div>');
    return;
  }
  songHistory.forEach((history, index) => {
    const $historyItem = $(`
    < div class="song-item" data - id="${history.id}" >
                <div>
                    <span class="song-number">${index + 1}.</span>
                    <span>${history.timestamp} (${history.songs.length}首)</span>
                </div>
                <div class="song-actions">
                    <button class="btn" onclick="loadHistory(${history.id})">載入</button>
                    <button class="btn btn-remove" onclick="deleteHistory(${history.id})">刪除</button>
                </div>
            </div >
    `);
    $historyList.append($historyItem);
  });
}
function loadHistory(historyId) {
  const history = songHistory.find((h) => h.id === historyId);
  if (history) {
    if (confirm("這將替換當前已選歌曲，確定要載入嗎？")) {
      selectedSongs = [...history.songs];
      renderSelectedList();
      renderSongList();
      saveSettings();
      $("#historyPanel").slideUp(300);
    }
  }
}
function deleteHistory(historyId) {
  if (confirm("確定要刪除這條歷史記錄嗎？")) {
    songHistory = songHistory.filter((h) => h.id !== historyId);
    renderHistory();
    saveSettings();
  }
}
$("#viewHistoryBtn").click(function() {
  renderHistory();
  $("#historyPanel").slideToggle(300);
});
$("#closeHistoryBtn").click(function() {
  $("#historyPanel").slideUp(300);
});
$("#openAdminPanel").click(function() {
  $("#adminPanel").toggle(50, function() {
    $("html, body").animate({
      scrollTop: $(document).height() - $(window).height()
    }, 200);
    $("#adminPassword").focus();
  });
  if (isAdminLoggedIn) {
    $("#passwordSection").hide();
    $("#songManagementSection").show();
    $("#newSongId, #newSongName, #newSongLang, #newSongSinger, #addSongBtn, #loadFromSheetBtn").show();
  } else {
    $("#passwordSection").show();
    $("#songManagementSection").hide();
    $("#adminPassword").val("");
  }
});
$("#adminPassword").on("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    $("#verifyPasswordBtn").click();
  }
});
$("#verifyPasswordBtn").click(function() {
  const password = $("#adminPassword").val();
  const $btn = $(this);
  const originalText = $btn.text();
  $btn.prop("disabled", true).html(loadingHtml);
  const apiUrl = gasApiUrl;
  $.get(
    apiUrl,
    {
      action: "verifyPassword",
      password
    },
    function(data) {
      if (data.success) {
        $("#passwordSection").hide();
        $("#songManagementSection").show();
        $("#newSongId, #newSongName, #newSongLang, #newSongSinger, #addSongBtn, #loadFromSheetBtn").show();
        $("html, body").animate({
          scrollTop: $(document).height() - $(window).height()
        }, 200);
        isAdminLoggedIn = true;
        saveSettings();
      } else {
        alert("登入失敗: " + data.message);
      }
      $btn.prop("disabled", false).text(originalText);
    }
  ).fail(function(xhr, status, error) {
    alert("登入失敗: " + error);
    console.error("API錯誤:", xhr, status, error);
    $btn.prop("disabled", false).text(originalText);
  });
});
$("#addSongBtn").click(function() {
  let songId = $("#newSongId").val().trim();
  let songName = $("#newSongName").val().trim();
  let songLang = $("#newSongLang").val().trim();
  let songSinger = $("#newSongSinger").val().trim();
  const $btn = $(this);
  const originalText = "新增歌曲";
  $btn.prop("disabled", true).html(loadingHtml);
  if ((!songId || !songName) && (songId || songName)) {
    const inputText = songId || songName;
    const parts = inputText.trim().split(/\s+/);
    if (parts.length >= 3) {
      songId = parts[0];
      parts[parts.length - 1];
      parts[parts.length - 2] === "/" ? "" : parts[parts.length - 2];
      songName = parts.slice(1, parts.length - 2).join(" ");
      $("#newSongId").val(songId);
      $("#newSongName").val(songName);
    }
  } else {
    songId = songId.replace(/\s+/g, "");
    songName = songName.replace(/\s+/g, "");
  }
  if (songId && songName) {
    const existingSongWithSameIdAndName = availableSongs.find(
      (song) => song.id === songId && song.name === songName
    );
    if (existingSongWithSameIdAndName) {
      $btn.prop("disabled", false).text(originalText);
      showFloatingMessage("已存在相同曲號和歌名的歌曲");
      return;
    }
    const existingSongWithSameName = availableSongs.find(
      (song) => song.name === songName && song.id !== songId
    );
    const existingSongWithSameId = availableSongs.find(
      (song) => song.id === songId && song.name !== songName
    );
    let confirmMessage = "";
    if (existingSongWithSameName) {
      confirmMessage = `已存在歌名「${songName}」但曲號不同的歌曲，確定要新增嗎？`;
    } else if (existingSongWithSameId) {
      $btn.prop("disabled", false).text(originalText);
      alert(`已存在曲號「${songId}」但歌名不同的歌曲`);
      return;
    } else {
      addNewSong(songId, songName, songLang, songSinger);
      setTimeout(function() {
        getSongs();
        const $songList = $("#songList");
        $songList.scrollTop($songList[0].scrollHeight);
      }, 1500);
      return;
    }
    if (confirm(confirmMessage)) {
      addNewSong(songId, songName, songLang, songSinger);
      setTimeout(function() {
        getSongs();
        const $songList = $("#songList");
        $songList.scrollTop($songList[0].scrollHeight);
      }, 1500);
    } else {
      $btn.prop("disabled", false).text(originalText);
    }
  } else {
    $btn.prop("disabled", false).text(originalText);
    showFloatingMessage("請輸入歌曲編號和名稱");
  }
});
function addNewSong(songId, songName, songLang, songSinger) {
  addSongToSheet(songId, songName, songLang, songSinger);
}
$("#loadFromSheetBtn").click(function() {
  const $btn = $(this);
  const originalText = $btn.text();
  $btn.prop("disabled", true).html(loadingHtml);
  getSongs($btn, originalText);
});
function getSongs($btn, originalText) {
  const apiUrl = gasApiUrl;
  $.get(
    apiUrl,
    {
      action: "getSongs"
    },
    function(data) {
      if (Array.isArray(data)) {
        availableSongs = data;
        renderSongList();
        showFloatingMessage(`成功從 API 載入 ${data.length} 首歌曲`);
      } else {
        alert("API返回格式錯誤");
      }
      if ($btn) {
        $btn.prop("disabled", false).text(originalText);
      }
    }
  ).fail(function(xhr, status, error) {
    alert("無法連接到API: " + error);
    console.error("API錯誤:", xhr, status, error);
    if ($btn) {
      $btn.prop("disabled", false).text(originalText);
    }
  });
}
function addSongToSheet(songId, songName, songLang, songSinger) {
  const $btn = $("#addSongBtn");
  const originalText = "新增歌曲";
  $btn.prop("disabled", true).html(loadingHtml);
  const apiUrl = gasApiUrl;
  $.post(
    apiUrl,
    JSON.stringify({
      action: "addSong",
      password: $("#adminPassword").val(),
      songId,
      songName,
      songLang,
      songSinger
    }),
    function(data) {
      console.log("API 回應: " + JSON.stringify(data, null, 2));
      if (data.success) {
        showFloatingMessage(`歌曲 "${songName}" 新增成功`);
        $("#newSongId").val("");
        $("#newSongName").val("");
      } else {
        alert(`!!~歌曲新增失敗: ${data.message || "未知錯誤"} `);
      }
      $btn.prop("disabled", false).text(originalText);
    }
  ).fail(function(xhr, status, error) {
    alert(`!!~無法連接到API: ${error} `);
    $btn.prop("disabled", false).text(originalText);
  });
}
$("#increaseFontBtn").click(function() {
  if (currentFontSize < 24) {
    currentFontSize += 2;
    updateFontSize();
    saveSettings();
  }
});
$("#decreaseFontBtn").click(function() {
  if (currentFontSize > 12) {
    currentFontSize -= 2;
    updateFontSize();
    saveSettings();
  }
});
$("#themeToggle").change(function() {
  isDarkMode = $(this).is(":checked");
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
  saveSettings();
});
loadSettings();
renderSongList();
renderSelectedList();
$(document).on("click", ".btn-add, .remote-add", function() {
  const $btn = $(this);
  const songId = String($btn.data("id"));
  if ($btn.prop("disabled")) return;
  const songName = $btn.data("name");
  const songLang = $btn.data("lang");
  const songSinger = $btn.data("singer");
  selectedSongs.push({ id: songId, name: songName, lang: songLang, singer: songSinger });
  renderSelectedList();
  saveSettings();
  $(`.song-item[data-id="${songId}"]`).find(".btn-add, .remote-add").text("已選").prop("disabled", true);
  if ($btn.hasClass("remote-add")) {
    if (!$("#adminPanel").is(":visible")) $("#openAdminPanel").click();
    $("#newSongId").val(songId);
    $("#newSongName").val(songName);
    $("#newSongLang").val(songLang || "");
    $("#newSongSinger").val(songSinger || "");
  }
});
$(document).on("click", ".btn-remove", function() {
  const songId = String($(this).data("id"));
  const songObj = selectedSongs.find((s) => s.id === songId);
  if (!songObj) return;
  const isLocal = availableSongs.some((s) => s.id === songId);
  let saveInfo = false;
  if (!isLocal) {
    saveInfo = confirm(`此歌曲尚未存入您的歌庫，是否要儲存它的資訊？

(按「確定」來填入資料，歌曲將會被移除。按「取消」則直接移除。`);
  }
  selectedSongs = selectedSongs.filter((s) => s.id !== songId);
  renderSelectedList();
  saveSettings();
  $(`.song - item[data - id="${songId}"]`).find(".btn-add, .remote-add").text("+").prop("disabled", false);
  if (saveInfo) {
    if (!$("#adminPanel").is(":visible")) $("#openAdminPanel").click();
    $("#newSongId").val(songObj.id);
    $("#newSongName").val(songObj.name);
    $("#newSongLang").val(songObj.lang || "");
    $("#newSongSinger").val(songObj.singer || "");
  }
});
function applyFilters(songs) {
  let filtered = songs;
  if (currentLangFilter !== "all") {
    filtered = filtered.filter((song) => song.lang === currentLangFilter);
  }
  if (currentGenderFilter !== "all") {
    if (currentGenderFilter === "male") {
      filtered = filtered.filter((song) => {
        if (!song.singer) return false;
        return maleSingers.some((male) => song.singer.includes(male));
      });
    } else if (currentGenderFilter === "female") {
      filtered = filtered.filter((song) => {
        if (!song.singer) return false;
        return femaleSingers.some((female) => song.singer.includes(female));
      });
    }
  }
  return filtered;
}
$("#filterToggleBtn").click(function() {
  const $filterSection = $("#filterSection");
  const $chevron = $("#filterChevron");
  if ($filterSection.hasClass("show")) {
    $filterSection.removeClass("show");
    $chevron.removeClass("rotated");
  } else {
    $filterSection.addClass("show");
    $chevron.addClass("rotated");
  }
});
$(".select-trigger").click(function(e) {
  e.stopPropagation();
  const $parent = $(this).parent();
  $(".custom-select").not($parent).removeClass("open");
  $parent.toggleClass("open");
});
$(document).click(function() {
  $(".custom-select").removeClass("open");
});
$(".option").click(function() {
  const $option = $(this);
  const $wrapper = $option.closest(".custom-select");
  const value = $option.data("value");
  const text = $option.text();
  $wrapper.find(".select-trigger span").text(text);
  $wrapper.find(".option").removeClass("selected");
  $option.addClass("selected");
  if ($wrapper.attr("id") === "langSelectWrapper") {
    currentLangFilter = value;
    searchSongs();
  } else if ($wrapper.attr("id") === "genderSelectWrapper") {
    currentGenderFilter = value;
    searchSongs();
  }
  $wrapper.removeClass("open");
});
$(document).ready(function() {
  loadSongsFromFile();
});
window.loadHistory = loadHistory;
window.deleteHistory = deleteHistory;
window.saveToHistory = saveToHistory;
