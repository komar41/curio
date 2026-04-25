from utk_curio.sandbox.app import app
import os
import multiprocessing

@app.route('/health', methods=['GET'])
def health():
    return 'OK', 200

if __name__ == '__main__':
    multiprocessing.freeze_support()  # required on Windows with spawn start method
    app.run(
        host=os.getenv('FLASK_SANDBOX_HOST', 'localhost'),
        port=int(os.getenv('FLASK_SANDBOX_PORT', 2000)),
        threaded=True,
        debug=True,
    )

