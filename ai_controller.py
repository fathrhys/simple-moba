# ai_controller.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import math

# Inisialisasi server Flask
app = Flask(__name__)
# Izinkan komunikasi dari game JavaScript Anda (PENTING!)
CORS(app)

# Fungsi untuk menghitung jarak
def get_distance(p1, p2):
    return math.hypot(p1['x'] - p2['x'], p1['y'] - p2['y'])

# ==============================================================
# INI ADALAH "OTAK" DARI BOT ANDA
# ==============================================================
def decide_bot_action(game_state):
    bot_info = game_state['bot_info']
    player_info = game_state['player_info']
    
    # STRATEGI 1: SURVIVAL
    # Jika HP bot di bawah 30%, mundur ke markas!
    if bot_info['hp'] / bot_info['maxHp'] < 0.3:
        return {
            "action": "retreat",
            "target": game_state['enemy_base_pos'] # Mundur ke base musuh (base si bot)
        }

    # STRATEGI 2: MENYERANG HERO MUSUH
    # Jika hero pemain terlihat dan dalam jarak agresif (600 unit)
    if player_info and get_distance(bot_info, player_info) < 600:
        return {
            "action": "attack_hero",
            "target": player_info # Kejar dan serang pemain
        }
        
    # STRATEGI 3: PUSH LANE (DEFAULT)
    # Jika tidak ada ancaman, maju ke waypoint lane berikutnya
    # (Ini adalah logika paling dasar, bisa dikembangkan lagi)
    return {
        "action": "push_lane"
    }

# Ini adalah 'endpoint' API yang akan dipanggil oleh game JavaScript
@app.route('/get_bot_action', methods=['POST'])
def get_bot_action():
    # Ambil data 'snapshot' game yang dikirim dari JavaScript
    game_state = request.json
    
    # Panggil fungsi "otak" untuk mendapatkan keputusan
    decision = decide_bot_action(game_state)
    
    # Kirim keputusan kembali ke JavaScript dalam format JSON
    print(f"Keputusan AI: {decision['action']}") # Untuk debugging di terminal
    return jsonify(decision)

# Jalankan server saat skrip ini dieksekusi
if __name__ == '__main__':
    # Berjalan di http://127.0.0.1:5001
    app.run(port=5001, debug=True)