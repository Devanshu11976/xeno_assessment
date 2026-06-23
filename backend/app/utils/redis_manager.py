"""Centralized Redis connection manager with pooling and health monitoring."""

import logging
import time
from typing import Optional
from redis import Redis, ConnectionPool
from redis.exceptions import ConnectionError, TimeoutError as RedisTimeoutError
from app.config.settings import settings

# TCP keepalive constants
TCP_KEEPIDLE = 0x4  # Seconds before sending first keepalive
TCP_KEEPINTVL = 0x5  # Seconds between keepalive probes
TCP_KEEPCNT = 0x6    # Number of failed probes before dropping

logger = logging.getLogger("xeno.redis")


class RedisConnectionManager:
    """Manages Redis connections with pooling and automatic reconnection."""
    
    _instance: Optional['RedisConnectionManager'] = None
    _pool: Optional[ConnectionPool] = None
    _connection: Optional[Redis] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._pool is None:
            self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize Redis connection pool with optimized settings."""
        try:
            self._pool = ConnectionPool.from_url(
                settings.REDIS_URL,
                socket_keepalive=True,
                socket_keepalive_options={
                    TCP_KEEPIDLE: 10,    # Start keepalive after 10s idle
                    TCP_KEEPINTVL: 5,    # Send probes every 5s
                    TCP_KEEPCNT: 3       # Drop after 3 failed probes
                },
                socket_timeout=60,           # 60s timeout for operations
                socket_connect_timeout=30,   # 30s timeout for initial connection
                health_check_interval=10,    # Health check every 10s (reduced from 15)
                retry_on_timeout=True,       # Retry on timeout
                max_connections=10,          # Connection pool size
                decode_responses=False,
            )
            logger.info("Redis connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection pool: {e}")
            raise
    
    def get_connection(self) -> Redis:
        """Get a Redis connection from the pool."""
        if self._pool is None:
            self._initialize_pool()
        
        try:
            connection = Redis(connection_pool=self._pool)
            # Test connection
            connection.ping()
            return connection
        except (ConnectionError, RedisTimeoutError) as e:
            logger.warning(f"Redis connection failed, reinitializing pool: {e}")
            self._initialize_pool()
            connection = Redis(connection_pool=self._pool)
            connection.ping()
            return connection
        except Exception as e:
            logger.error(f"Unexpected error getting Redis connection: {e}")
            raise
    
    def health_check(self) -> bool:
        """Check if Redis connection is healthy."""
        try:
            connection = self.get_connection()
            connection.ping()
            return True
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            return False
    
    def close(self):
        """Close the connection pool."""
        if self._pool:
            self._pool.disconnect()
            self._pool = None
            logger.info("Redis connection pool closed")


# Global instance
redis_manager = RedisConnectionManager()


def get_redis_connection() -> Redis:
    """Convenience function to get a Redis connection."""
    return redis_manager.get_connection()


def redis_health_check() -> bool:
    """Convenience function to check Redis health."""
    return redis_manager.health_check()
