# src/error_handler.py
"""
retry + Google Maps error classification utilities
WITH a circuit breaker

Primary caller: src/google_maps_client.py

Notes: 
- uses handle_google_maps_error to find if error is retryable
- If retryable, raise RetryableError in your file to trigger retry_with_backoff function

Callables outside of file:
- RetryableError
- retry_with_backoff (full function)
- with_retry (decorator to retry_with_backoff)
- handle_google_maps_error
"""

from __future__ import annotations

import logging
import random
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Tuple, Type

logger = logging.getLogger(__name__)

# ----------------------------
# Exceptions
# ----------------------------

class RetryableError(Exception):
    """
    Raise this inside a function wrapped by retry_with_backoff (or @with_retry)
    to trigger a retry.
    """
    def __init__(self, message: str = "retryable error", *, wait_seconds: Optional[float] = None) -> None:
        super().__init__(message)
        self.wait_seconds = wait_seconds  # optional "force wait" override


class CircuitOpenError(Exception):
    """Raised when the circuit breaker is open and calls are blocked."""
    pass


# ----------------------------
# Circuit Breaker
# ----------------------------

class CircuitState:
    CLOSED = "closed"        # Allows calls
    OPEN = "open"            # Blocks calls
    HALF_OPEN = "half_open"  # Cooldown and limited trial calls


@dataclass(frozen=True)
class CircuitBreakerConfig:
    enabled: bool = True             # Circuit breaker on/off
    failure_threshold: int = 5       # Open circuit after this many consecutive retryable failures
    cooldown_seconds: float = 60.0   # How long to stop calls after opening
    half_open_max_calls: int = 1     # How many calls allowed in HALF_OPEN state


class CircuitBreaker:
    """
    Circuit breaker:
    - CLOSED: allow calls and counts consecutive retryable failures
    - OPEN: blocks calls until cooldown expires
    - HALF_OPEN: allow limited calls -- success => CLOSED, failure => OPEN
    """
    def __init__(self, config: CircuitBreakerConfig) -> None:
        self.config = config
        self._state = CircuitState.CLOSED # Starts in closed state
        self._consecutive_failures = 0    # Tracks consecutive retryable failures
        self._open_until = 0.0            
        self._half_open_calls = 0         # Number of calls made in HALF_OPEN state
        self._lock = threading.Lock()

    def state(self) -> str:
        with self._lock:
            return self._state   # returns current state

    def before_call(self) -> None:
        """ 
        Call this before each attempt. It can block the call if circuit is OPEN.
        """
        if not self.config.enabled:    # If breaker disabled, don't block
            return

        now = time.time()
        with self._lock:
            if self._state == CircuitState.OPEN:
                if now >= self._open_until: # cooldown ended -> allow trial calls / move state to HALF_OPEN
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
                    logger.warning("circuit_half_open_sending_trial_call")
                else: # still in OPEN state -> block call
                    raise CircuitOpenError(
                        f"Circuit OPEN until {self._open_until:.0f} (unix time). Blocking call."
                    )

            if self._state == CircuitState.HALF_OPEN: 
                if self._half_open_calls >= self.config.half_open_max_calls: # If exceed number of calls allowed in HALF_OPEN, then block / state = OPEN
                    raise CircuitOpenError("Circuit HALF_OPEN trial limit reached. Blocking call.")
                self._half_open_calls += 1

    def record_success(self) -> None:
        """
        Logs info and resets circuit on success.
        """
        if not self.config.enabled:
            return

        with self._lock:
            self._consecutive_failures = 0
            self._state = CircuitState.CLOSED
            self._open_until = 0.0
            self._half_open_calls = 0
            logger.info("circuit_closed_on_success")

    def record_failure(self) -> None:
        """
        Record a retryable failure. If max attemps, open the circuit for cooldown.
        """
        if not self.config.enabled:  # If breaker disabled, do nothing
            return

        now = time.time()
        with self._lock:
            self._consecutive_failures += 1 

            logger.warning(
                "circuit_failure_recorded",
                extra={
                    "consecutive_failures": self._consecutive_failures,
                    "threshold": self.config.failure_threshold,
                    "state": self._state,
                },
            )

            if self._consecutive_failures >= self.config.failure_threshold:
                self._state = CircuitState.OPEN
                self._open_until = now + self.config.cooldown_seconds
                self._half_open_calls = 0
                logger.error(
                    "circuit_opened",
                    extra={
                        "cooldown_seconds": self.config.cooldown_seconds,
                        "open_until": self._open_until,
                    },
                )

CIRCUIT_CONFIG = CircuitBreakerConfig( # Hardcoded circuit breaker config
    enabled=True,             # set False to disable globally
    failure_threshold=5,      # open after 5 consecutive retryable failures
    cooldown_seconds=60.0,    # block for 60 seconds
    half_open_max_calls= 1,   # allow 1 trial call after cooldown
)

# One shared circuit breaker instance (remembers failures)
_CIRCUIT_BREAKER = CircuitBreaker(CIRCUIT_CONFIG)


# ----------------------------
# Google Maps error classification
# ----------------------------

# (should_retry, wait_seconds)
ERROR_ACTIONS: Dict[str, Tuple[bool, int]] = {
    "OVER_QUERY_LIMIT": (True, 60),
    "UNKNOWN_ERROR": (True, 5),
    "RESOURCE_EXHAUSTED": (True, 60),

    "INVALID_REQUEST": (False, 0),
    "REQUEST_DENIED": (False, 0),
    "NOT_FOUND": (False, 0),

    "ZERO_RESULTS": (False, 0),
}


def _extract_google_status_and_message(error_response: Any) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """
    Groups into: (google_status, error_message, http_status_code)

    Accepts:
    - Google response (googlemaps) or HTTP requests
    - OR HTTP requests with .status_code and .json() 
    """
    status = None
    error_message = None
    http_status = None

    # If already a dict, directly read status fields
    if isinstance(error_response, dict):
        status = error_response.get("status")
        error_message = error_response.get("error_message") or error_response.get("message")
        return status, error_message, None

    # If HTTP response, attemps to get HTTP status
    http_status = getattr(error_response, "status_code", None)

    body = None
    json_method = getattr(error_response, "json", None)
    if callable(json_method):
        try:
            body = json_method()
        except Exception:
            body = None

    if isinstance(body, dict):
        status = body.get("status") or body.get("error", {}).get("status")
        error_message = (
            body.get("error_message")
            or body.get("message")
            or body.get("error", {}).get("message")
        )

    return status, error_message, http_status


def handle_google_maps_error(error_response: Any) -> Tuple[bool, int]:
    """
    Classify Google Maps error response into retryable / non-retryable.

    Returns: (should_retry, wait_seconds)

    Uses Google 'status' if present; otherwise falls back to HTTP status codes (retry on 429 or common 5xx).
    """
    status, error_message, http_status = _extract_google_status_and_message(error_response)

    if status:
        # Actions not stated above default to retryable with 2s delay
        should_retry, wait_s = ERROR_ACTIONS.get(status, (True, 2))

        logger.warning(
            "google_maps_error_classified",
            extra={
                "gmaps_status": status,
                "should_retry": should_retry,
                "wait_seconds": wait_s,
                "error_message": error_message,
                "http_status": http_status,
            },
        )
        return should_retry, wait_s

    # No Google status; fall back to HTTP status codes
    if http_status is not None:
        if http_status in (429, 500, 502, 503, 504):
            logger.warning(
                "google_maps_http_error_retryable",
                extra={"http_status": http_status, "error_message": error_message},
            )
            return True, 5

        if 400 <= http_status < 500:
            logger.error(
                "google_maps_http_error_non_retryable",
                extra={"http_status": http_status, "error_message": error_message},
            )
            return False, 0

    logger.warning(
        "google_maps_error_unknown_shape",
        extra={"error_message": error_message, "http_status": http_status},
    )
    return True, 2


# ----------------------------
# Retry with exponential backoff (+ jitter)
# ----------------------------

@dataclass(frozen=True)
class RetryConfig:
    max_retries: int = 3         # Max retry attempts
    backoff_factor: float = 2.0  # Exponential backoff factor
    base_delay: float = 1.0      # Start delay in seconds
    max_delay: float = 30.0      # Max delay cap in seconds
    jitter: float = 0.25         # Creates +/- jitter in seconds / Random delay modifeier
    retry_on: Tuple[Type[BaseException], ...] = (TimeoutError, ConnectionError)


def _compute_delay(attempt_index: int, cfg: RetryConfig, forced_wait: Optional[float] = None) -> float:
    """
    attempt_index: 1 for first retry, 2 for second retry, ...
    forced_wait: if provided (e.g., OVER_QUERY_LIMIT says wait 60s), use that.
    """
    if forced_wait is not None and forced_wait > 0:
        delay = float(forced_wait)    # Use forced wait time from error above
    else:
        delay = cfg.base_delay * (cfg.backoff_factor ** (attempt_index - 1))

    delay = min(delay, cfg.max_delay) # cap delay to max_delay
    delay = max(0.0, delay + random.uniform(-cfg.jitter, cfg.jitter)) # Adds jitter to delay 
    return delay


def retry_with_backoff(
    func: Callable[[], Any],
    *,
    max_retries: int = 3,
    backoff_factor: float = 2.0,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    jitter: float = 0.25,
    retry_on: Tuple[Type[BaseException], ...] = (TimeoutError, ConnectionError),
    on_retry: Optional[Callable[[int, BaseException, float], None]] = None,
) -> Any:
    """
    Retry a function with exponential backoff.

    Retries when:
    - func raises RetryableError
    - func raises exceptions in retry_on (timeouts / connection issues)

    Circuit breaker:
    - before each attempt, circuit may block (CircuitOpenError)
    - retryable failures count toward opening the circuit
    """
    cfg = RetryConfig(
        max_retries=max_retries,
        backoff_factor=backoff_factor,
        base_delay=base_delay,
        max_delay=max_delay,
        jitter=jitter,
        retry_on=retry_on,
    ) # Creates config object

    attempt = 0 # Number of retry attempts

    while True:
        _CIRCUIT_BREAKER.before_call() # May raise CircuitOpenError to block call

        start = time.time()
        try:
            result = func() # Executes the given function once
            elapsed_ms = int((time.time() - start) * 1000)
            logger.info("retry_with_backoff_success", extra={"elapsed_ms": elapsed_ms, "attempt": attempt})

            _CIRCUIT_BREAKER.record_success() # On success, resets circuit breaker
            return result # Returns successful result to caller

        except BaseException as e: # Catches all exceptions from func
            elapsed_ms = int((time.time() - start) * 1000)

            # Determine if error is retryable
            retryable = isinstance(e, RetryableError) or isinstance(e, cfg.retry_on)

            # If not retryable, log and raise
            if not retryable:
                logger.error(
                    "retry_with_backoff_non_retryable",
                    extra={"elapsed_ms": elapsed_ms, "error_type": type(e).__name__, "error": str(e)},
                )
                raise

            _CIRCUIT_BREAKER.record_failure() # Records retryable failure in circuit breaker

            if attempt >= cfg.max_retries: # If exceed max retries, log and raise
                logger.error(
                    "retry_with_backoff_exhausted",
                    extra={
                        "elapsed_ms": elapsed_ms,
                        "retries": cfg.max_retries,
                        "last_error_type": type(e).__name__,
                        "last_error": str(e),
                        "circuit_state": _CIRCUIT_BREAKER.state(),
                    },
                )
                raise

            attempt += 1 # Add retry attempt

            forced_wait = getattr(e, "wait_seconds", None) # Pull wait_seconds if this is RetryableError
            wait_s = _compute_delay(attempt, cfg, forced_wait=forced_wait) # Calculates delay before next retry

            logger.warning(
                "retry_with_backoff_retrying",
                extra={
                    "elapsed_ms": elapsed_ms,
                    "attempt": attempt,
                    "max_retries": cfg.max_retries,
                    "wait_seconds": round(wait_s, 3),
                    "error_type": type(e).__name__,
                    "error": str(e),
                    "circuit_state": _CIRCUIT_BREAKER.state(),
                },
            )

            if on_retry: # Optional callback hook
                try:
                    on_retry(attempt, e, wait_s)
                except Exception:
                    logger.exception("on_retry_callback_failed")

            time.sleep(wait_s)


def with_retry(
    *,
    max_retries: int = 3,
    backoff_factor: float = 2.0,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    jitter: float = 0.25,
    retry_on: Tuple[Type[BaseException], ...] = (TimeoutError, ConnectionError),
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Decorator form for retry_with_backoff.

    Example:
        @with_retry(max_retries=3, backoff_factor=2.0)
        def do_call(): ...
    """
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            return retry_with_backoff(
                lambda: fn(*args, **kwargs), # Runs retry_with_backoff with given function
                max_retries=max_retries,
                backoff_factor=backoff_factor,
                base_delay=base_delay,
                max_delay=max_delay,
                jitter=jitter,
                retry_on=retry_on,
            )
        return wrapped
    return decorator
