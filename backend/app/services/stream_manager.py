import asyncio
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class StreamSubscriber:
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=100))


class StreamManager:
    """In-memory SSE pub/sub. Maps (conv_id, msg_id) → subscriber queues."""

    def __init__(self):
        self._subscribers: Dict[str, Dict[int, StreamSubscriber]] = {}
        self._lock = asyncio.Lock()

    def _key(self, conv_id: str, msg_id: str) -> str:
        return f"{conv_id}:{msg_id}"

    async def subscribe(self, conv_id: str, msg_id: str) -> asyncio.Queue:
        key = self._key(conv_id, msg_id)
        sub = StreamSubscriber()
        async with self._lock:
            if key not in self._subscribers:
                self._subscribers[key] = {}
            self._subscribers[key][id(sub)] = sub
        return sub.queue

    async def unsubscribe(self, conv_id: str, msg_id: str, sub_id: int):
        key = self._key(conv_id, msg_id)
        async with self._lock:
            if key in self._subscribers:
                self._subscribers[key].pop(sub_id, None)
                if not self._subscribers[key]:
                    del self._subscribers[key]

    async def publish(self, conv_id: str, msg_id: str, event: str, data: dict):
        key = self._key(conv_id, msg_id)
        async with self._lock:
            subs = list(self._subscribers.get(key, {}).values())
        for sub in subs:
            try:
                await asyncio.wait_for(
                    sub.queue.put({"event": event, "data": data}),
                    timeout=2.0,
                )
            except asyncio.TimeoutError:
                pass

    async def publish_done(self, conv_id: str, msg_id: str):
        key = self._key(conv_id, msg_id)
        async with self._lock:
            subs = list(self._subscribers.get(key, {}).values())
            if key in self._subscribers:
                del self._subscribers[key]
        for sub in subs:
            await sub.queue.put({"type": "done"})


stream_manager = StreamManager()
