// Google Apps Script 程式碼
// 部署為網頁應用程式後，可以從網頁呼叫這些功能

// 設定您的Google Sheet ID
const SHEET_ID = '1XElZCoyA5z_ImsAw98UQxJprRSIUCDSYgDW4TjWkJ-I';
const SHEET_NAME = '歌單'; // 工作表名稱
const PASSWORD = '123'; // 管理密碼

/**
 * 初始化API，設定必要的CORS頭
 */
function doOptions(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

/**
 * 處理GET請求
 */
function doGet(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*'
  };
  
  var action = e.parameter.action;
  // var action = "verifyPassword";
  var result = {};
  
  if (action === 'getSongs') {
    // 獲取所有歌曲
    result = getAllSongs();
  } else if (action === 'verifyPassword') {
    // 驗證密碼
    var password = e.parameter.password || '';
    result = (password === PASSWORD) ? { success: true, message: '驗證成功' } : { success: false, message: '密碼錯誤' };
  } else {
    result = { error: '密碼錯誤' };
  }
  Logger.log("doGet result: " + JSON.stringify(result)); // 打印結果到 Apps Script 日誌

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理POST請求
 */
function doPost(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*'
  };
  
  var postData = {};
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (e) {
    // 如果不是JSON格式，嘗試解析表單數據
    if (e.parameter) {
      postData = e.parameter;
    }
  }
  
  var action = postData.action;
  var result = {};
  
  if (action === 'addSong') {
    // 驗證密碼
    var password = postData.password || '';
    if (password !== PASSWORD) {
      result = { success: false, message: '密碼錯誤' };
    } else {
      // 添加歌曲
      var songId = postData.songId || '';
      var songName = postData.songName || '';
      result = addSong(songId, songName);
    }
  } else {
    result = { error: '未知的操作' };
  }
    Logger.log("doPost result: " + JSON.stringify(result)); // 打印結果到 Apps Script 日誌

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 獲取所有歌曲
 */
function getAllSongs() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var songs = [];
    
    // 假設第一行是標題行，從第二行開始讀取
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] && row[1]) { // 確保歌號和歌名都有值
        songs.push({
          id: row[0].toString(),
          name: row[1].toString()
        });
      }
    }
    
    return songs;
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * 添加歌曲
 */
function addSong(songId, songName) {
  if (!songId || !songName) {
    return { success: false, message: '歌曲ID和名稱不能為空' };
  }
  
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    // 檢查是否已存在相同ID和名稱的歌曲
    var existingSongWithSameIdAndName = false;
    var existingSongWithSameId = false;
    var existingSongWithSameName = false;
    
    for (var i = 1; i < data.length; i++) {
      var currentId = data[i][0].toString();
      var currentName = data[i][1].toString();
      
      if (currentId === songId && currentName === songName) {
        existingSongWithSameIdAndName = true;
        break;
      }
      
      if (currentId === songId && currentName !== songName) {
        existingSongWithSameId = true;
        return { success: true, message: '已存在 相同曲號 但不同歌名的歌曲' };

      }
      
      if (currentId !== songId && currentName === songName) {
        existingSongWithSameName = true;
      }
    }
    
    // 如果已存在完全相同的歌曲，返回錯誤
    if (existingSongWithSameIdAndName) {
      return { success: false, message: '已存在相同曲號和歌名的歌曲' };
    }
    
    // 添加新歌曲
    sheet.appendRow([songId, songName]);
    
    // 根據情況返回不同的成功訊息
    if (existingSongWithSameId) {
      return { success: true, message: '新增相同曲號但不同歌名的歌曲成功' };
    } else if (existingSongWithSameName) {
      return { success: true, message: '新增相同歌名但不同曲號的歌曲成功' };
    } else {
      return { success: true, message: '新歌曲添加成功' };
    }
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}