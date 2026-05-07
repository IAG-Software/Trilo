import sys
import json
import asyncio
import websockets
import argparse
import traceback

class NeutralinoConnection:
    def __init__(self):
        self.handlers = {}
        self.websocket = None
        self.extension_id = None
        self.token = None
        self.port = None
        
        # Parse Neutralino args
        parser = argparse.ArgumentParser()
        parser.add_argument('--nl-port', type=int)
        parser.add_argument('--nl-token', type=str)
        parser.add_argument('--nl-extension-id', type=str)
        args, unknown = parser.parse_known_args()
        
        self.port = args.nl_port
        self.token = args.nl_token
        self.extension_id = args.nl_extension_id

    def on(self, event):
        def decorator(f):
            self.handlers[event] = f
            return f
        return decorator

    async def _handle_message(self, message):
        try:
            payload = json.loads(message)
            event = payload.get('event')
            data = payload.get('data')
            
            # Neutralino dispatch sends (extensionId, event, data)
            # data can contain our requestId
            request_id = None
            actual_data = data
            if isinstance(data, dict) and '_requestId' in data:
                request_id = data['_requestId']
                actual_data = data.get('payload')

            if event in self.handlers:
                # Check if it's async
                if asyncio.iscoroutinefunction(self.handlers[event]):
                    result = await self.handlers[event](actual_data)
                else:
                    result = self.handlers[event](actual_data)
                
                if result is not None:
                    response_data = {
                        "payload": result
                    }
                    if request_id:
                        response_data["_requestId"] = request_id
                    
                    await self.send(f"{event}-response", response_data)
        except Exception as e:
            print(f"Error handling message: {e}")
            traceback.print_exc()

    async def send(self, event, data):
        if self.websocket:
            payload = {
                "event": event,
                "data": data
            }
            # Neutralino expects messages for the app to be wrapped 
            # if we are using the dispatch mechanism or just raw for extensions.
            # Actually, to send to the app, we use 'windowMessage' or similar if we want to trigger NL API
            # But the most common way for extensions is to use:
            # { "event": "appListenEvent", "data": "...", "method": "app.broadcast" } 
            # Wait, Neutralino extensions send messages to the server, and the server broadcasts to the app.
            
            # Official way:
            msg = {
                "id": "123", # Random ID
                "method": "app.broadcast",
                "accessToken": self.token,
                "params": {
                    "event": event,
                    "data": data
                }
            }
            await self.websocket.send(json.dumps(msg))

    async def run_async(self):
        uri = f"ws://localhost:{self.port}?extensionId={self.extension_id}&accessToken={self.token}"
        async with websockets.connect(uri) as websocket:
            self.websocket = websocket
            print(f"Connected to Neutralino at {uri}")
            async for message in websocket:
                await self._handle_message(message)

    def listen(self):
        asyncio.run(self.run_async())
