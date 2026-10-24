import time
from typing import Any, Optional, Dict
from collections import OrderedDict
import threading


class BoundedTTLCache:
    """
    A thread-safe, bounded In-Memory LRU Cache with Time-To-Live (TTL) expiration.
    Used for storing raw API responses (such as full WINDFOR vintage streams and FUELHH actuals)
    so that cutoff changes re-evaluate vintage selection dynamically over the cached vintages.
    """
    def __init__(self, max_items: int = 100, ttl_seconds: int = 300):
        self.max_items = max_items
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            item = self._cache[key]
            if time.time() > item["expires_at"]:
                del self._cache[key]
                return None
            self._cache.move_to_end(key)
            return item["data"]

    def set(self, key: str, data: Any) -> None:
        with self._lock:
            now = time.time()
            if key in self._cache:
                del self._cache[key]
            elif len(self._cache) >= self.max_items:
                # Evict oldest entry (LRU)
                self._cache.popitem(last=False)
            
            self._cache[key] = {
                "data": data,
                "expires_at": now + self.ttl_seconds,
                "cached_at": now
            }

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# Global cache instances for raw source responses
raw_fuelhh_cache = BoundedTTLCache(max_items=50, ttl_seconds=300)
raw_windfor_cache = BoundedTTLCache(max_items=50, ttl_seconds=300)
