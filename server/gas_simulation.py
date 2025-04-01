# 模擬Google Apps Script功能的Python程式
# 這個程式模擬了與Google Sheet交互的功能，用於本地測試

import json
import os
import http.server
import socketserver
import urllib.parse
from http import HTTPStatus

# 模擬的歌曲資料 (實際使用時會從Google Sheet讀取)
SONGS_DATA = [
    {"id": "410172", "name": "天空沒有極限"},
    {"id": "42686", "name": "夢一場"},
    {"id": "40196", "name": "戀人未滿"},
    {"id": "93054", "name": "熱帶雨林"},
    {"id": "5769", "name": "一千個傷心的理由"},
    {"id": "47724", "name": "填空"},
    {"id": "44603", "name": "命運"},
    {"id": "42031", "name": "猜不透"},
    {"id": "50001", "name": "測試歌曲1"},
    {"id": "50002", "name": "測試歌曲2"},
    {"id": "50003", "name": "測試歌曲3"}
]

# 模擬的密碼
CORRECT_PASSWORD = "123"

# 模擬Google Sheet操作
class SheetOperations:
    @staticmethod
    def get_all_songs():
        """模擬從Google Sheet獲取所有歌曲"""
        return SONGS_DATA
    
    @staticmethod
    def add_song(song_id, song_name):
        """模擬向Google Sheet添加歌曲"""
        # 檢查是否已存在相同ID和名稱的歌曲
        existing_song_with_same_id_and_name = False
        existing_song_with_same_id = False
        existing_song_with_same_name = False
        
        for song in SONGS_DATA:
            if song["id"] == song_id and song["name"] == song_name:
                existing_song_with_same_id_and_name = True
                break
            
            if song["id"] == song_id and song["name"] != song_name:
                existing_song_with_same_id = True
            
            if song["id"] != song_id and song["name"] == song_name:
                existing_song_with_same_name = True
        
        # 如果已存在完全相同的歌曲，返回錯誤
        if existing_song_with_same_id_and_name:
            return {"success": False, "message": "已存在相同曲號和歌名的歌曲"}
        
        # 添加新歌曲
        SONGS_DATA.append({"id": song_id, "name": song_name})
        
        # 根據情況返回不同的成功訊息
        if existing_song_with_same_id:
            return {"success": True, "message": "新增相同曲號但不同歌名的歌曲成功"}
        elif existing_song_with_same_name:
            return {"success": True, "message": "新增相同歌名但不同曲號的歌曲成功"}
        else:
            return {"success": True, "message": "歌曲添加成功"}
    
    @staticmethod
    def verify_password(password):
        """驗證密碼"""
        return password == CORRECT_PASSWORD

# HTTP請求處理器
class SongServerHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """處理GET請求"""
        parsed_path = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_path.query)
        
        # 設置CORS頭，允許跨域請求
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        # 獲取所有歌曲
        if parsed_path.path == "/getSongs":
            self.wfile.write(json.dumps(SheetOperations.get_all_songs()).encode())
            return
        
        # 驗證密碼
        elif parsed_path.path == "/verifyPassword":
            password = query_params.get("password", [""])[0]
            result = {"success": SheetOperations.verify_password(password)}
            self.wfile.write(json.dumps(result).encode())
            return
        
        # 默認返回404
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")
    
    def do_POST(self):
        """處理POST請求"""
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length).decode("utf-8")
        post_params = urllib.parse.parse_qs(post_data)
        
        # 設置CORS頭，允許跨域請求
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        # 添加歌曲
        if self.path == "/addSong":
            password = post_params.get("password", [""])[0]
            song_id = post_params.get("songId", [""])[0]
            song_name = post_params.get("songName", [""])[0]
            
            # 驗證密碼
            if not SheetOperations.verify_password(password):
                self.wfile.write(json.dumps({"success": False, "message": "密碼錯誤"}).encode())
                return
            
            # 添加歌曲
            result = SheetOperations.add_song(song_id, song_name)
            self.wfile.write(json.dumps(result).encode())
            return
        
        # 默認返回404
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")
    
    def do_OPTIONS(self):
        """處理OPTIONS請求，用於CORS預檢"""
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

# 主函數
def main():
    port = 8080
    handler = SongServerHandler
    
    with socketserver.TCPServer(("localhost", port), handler) as httpd:
        print(f"服務器啟動在 http://localhost:{port}")
        print("按 Ctrl+C 停止服務器")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("服務器已停止")

if __name__ == "__main__":
    main()