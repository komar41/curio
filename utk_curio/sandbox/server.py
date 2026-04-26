from utk_curio.sandbox.app import app
import os

@app.route('/health', methods=['GET'])
def health():
    return 'OK', 200

if __name__ == '__main__':
    app.run(
        host=os.getenv('FLASK_SANDBOX_HOST', '127.0.0.1'),
        port=int(os.getenv('FLASK_SANDBOX_PORT', 2000)),
        threaded=True,
        debug=False,       # reloader was restarting the process on every DuckDB write (~2 s penalty)
        use_reloader=False,
    )

