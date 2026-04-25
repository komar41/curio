"""
Persistent execution worker for the Curio sandbox.

Each worker process calls _worker_init() once to pre-load all heavy libraries,
then reuses those imports on every execute_code() call — eliminating the
~500-2000 ms cold-import cost that the old subprocess.Popen approach paid on
every single node execution.
"""

_globals_cache: dict = {}


def _worker_init():
    """Called once per worker by ProcessPoolExecutor(initializer=_worker_init)."""
    global _globals_cache

    import warnings
    warnings.filterwarnings('ignore')

    import rasterio
    import geopandas as gpd
    import pandas as pd
    import json
    import mmap
    import zlib
    import os
    import time
    import hashlib
    import ast
    import io

    from utk_curio.sandbox.util.parsers import (
        load_from_duckdb,
        save_to_duckdb,
        detect_kind,
        checkIOType,
    )

    _globals_cache = {
        '__builtins__': __builtins__,
        'warnings': warnings,
        'rasterio': rasterio,
        'gpd': gpd,
        'pd': pd,
        'json': json,
        'mmap': mmap,
        'zlib': zlib,
        'os': os,
        'time': time,
        'hashlib': hashlib,
        'ast': ast,
        'io': io,
        'load_from_duckdb': load_from_duckdb,
        'save_to_duckdb': save_to_duckdb,
        'detect_kind': detect_kind,
        'checkIOType': checkIOType,
    }


def execute_code(code, file_path, node_type, data_type, launch_dir):
    """
    Execute user code inside the pre-warmed worker process.

    Returns a dict: {'stdout': [str, ...], 'stderr': str, 'output': {'path': str, 'dataType': str}}
    """
    import io as _io
    import os
    import contextlib
    import traceback

    load_from_duckdb = _globals_cache['load_from_duckdb']
    save_to_duckdb = _globals_cache['save_to_duckdb']
    detect_kind = _globals_cache['detect_kind']
    checkIOType = _globals_cache['checkIOType']

    original_dir = os.getcwd()
    try:
        os.chdir(launch_dir)

        captured_stdout = _io.StringIO()
        captured_stderr = _io.StringIO()
        result = {'path': '', 'dataType': 'str'}

        try:
            with contextlib.redirect_stdout(captured_stdout), \
                 contextlib.redirect_stderr(captured_stderr):

                # Build a fresh namespace from pre-loaded globals so user-defined
                # names don't leak between executions in the same worker.
                ns = dict(_globals_cache)

                # Define the user's function in the fresh namespace.
                exec(f"def userCode(arg):\n{code}", ns)

                # Load input from DuckDB.
                input_data = ''
                if data_type == 'outputs':
                    file_path_list = eval(file_path, {'__builtins__': {}})  # safe: only literals
                    input_data = [load_from_duckdb(elem['path']) for elem in file_path_list]
                elif file_path:
                    input_data = load_from_duckdb(file_path)

                # Validate input and build incomingInput.
                incomingInput = None
                if input_data is not None and not (isinstance(input_data, str) and input_data == ''):
                    if data_type == 'outputs':
                        synthetic = {
                            'dataType': 'outputs',
                            'data': [{'dataType': detect_kind(v), 'data': None} for v in input_data],
                        }
                        checkIOType(synthetic, node_type)
                        incomingInput = input_data
                    else:
                        synthetic = {'dataType': detect_kind(input_data), 'data': None}
                        checkIOType(synthetic, node_type)
                        incomingInput = input_data

                # Run user code.
                output = ns['userCode'](incomingInput)

                # Validate output.
                out_kind = detect_kind(output)
                if out_kind == 'outputs':
                    synthetic_out = {
                        'dataType': 'outputs',
                        'data': [{'dataType': detect_kind(v), 'data': None} for v in output],
                    }
                else:
                    synthetic_out = {'dataType': out_kind, 'data': None}
                checkIOType(synthetic_out, node_type, False)

                # Save output to DuckDB.
                result_path = save_to_duckdb(output, node_id=node_type)
                result = {'path': result_path, 'dataType': out_kind}

        except Exception:
            captured_stderr.write(traceback.format_exc())

        stdout_lines = [l for l in captured_stdout.getvalue().split('\n') if l]
        return {
            'stdout': stdout_lines,
            'stderr': captured_stderr.getvalue(),
            'output': result,
        }

    finally:
        os.chdir(original_dir)
