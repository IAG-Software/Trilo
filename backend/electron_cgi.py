import sys
import json

class Connection:
    def __init__(self):
        self._handlers = {}
        self._buffer = ""

    def on(self, request_type):
        def decorator(handler):
            self._handlers[request_type] = handler
            return handler
        return decorator

    def listen(self):
        print("[PY_BACKEND] Connection listening...", file=sys.stderr)
        
        while True:
            char = sys.stdin.read(1)
            if not char:
                break
            
            if char == "\t":
                try:
                    data = json.loads(self._buffer)
                    if data.get("type") == "REQUEST":
                        request = data.get("request")
                        request_id = request.get("id")
                        request_type = request.get("type")
                        args_raw = request.get("args")
                        
                        # electron-cgi encodes args as a JSON string
                        args = {}
                        if args_raw:
                            try:
                                args = json.loads(args_raw)
                            except:
                                args = args_raw
                        
                        if request_type in self._handlers:
                            try:
                                result = self._handlers[request_type](args)
                                self._send_response(request_id, result)
                            except Exception as e:
                                print(f"[PY_BACKEND] Handler error: {e}", file=sys.stderr)
                                self._send_error(request_id, str(e))
                        else:
                            self._send_error(request_id, f"No handler for {request_type}")
                    
                    self._buffer = ""
                except Exception as e:
                    print(f"[PY_BACKEND] Error processing request: {e}", file=sys.stderr)
                    self._buffer = ""
            else:
                self._buffer += char

    def _send_response(self, request_id, result):
        response = {
            "type": "RESPONSE",
            "response": {
                "id": request_id,
                "result": json.dumps(result)
            }
        }
        sys.stdout.write(json.dumps(response) + "\t")
        sys.stdout.flush()

    def _send_error(self, request_id, error_message):
        response = {
            "type": "ERROR",
            "requestId": request_id,
            "error": json.dumps(error_message)
        }
        sys.stdout.write(json.dumps(response) + "\t")
        sys.stdout.flush()
