import pytest
import src.error_handler as eh
"""
Tool: pytest 

Focus: tests for error_handler.py, focusing on retry_with_backoff and CircuitBreaker.

Use: From project root, "python3 -m pytest -q tests/test_error_handler.py"
"""

@pytest.fixture
def no_sleep(monkeypatch):
    sleeps = []
    monkeypatch.setattr(eh.time, "sleep", lambda s: sleeps.append(s))
    return sleeps


@pytest.fixture
def breaker_disabled(monkeypatch):
    # Prevent CircuitOpenError from ever interfering with backoff tests
    cfg = eh.CircuitBreakerConfig(enabled=False)
    br = eh.CircuitBreaker(cfg)
    monkeypatch.setattr(eh, "_CIRCUIT_BREAKER", br)
    return br

@pytest.fixture
def fresh_breaker(monkeypatch):
    cfg = eh.CircuitBreakerConfig(
        enabled=True,
        failure_threshold=3,
        cooldown_seconds=10.0,
        half_open_max_calls=1,
    )
    br = eh.CircuitBreaker(cfg)
    monkeypatch.setattr(eh, "_CIRCUIT_BREAKER", br)
    return br

#---
#Test 1
#---
def test_backoff_increases_delays(no_sleep, breaker_disabled):
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] <= 3:
            raise eh.RetryableError("try again")
        return "ok"

    out = eh.retry_with_backoff(
        flaky,
        max_retries=5,
        base_delay=1.0,
        backoff_factor=2.0, 
        max_delay=30.0,
        jitter=0.0,  # 0 for predictable delays 
    )

    assert out == "ok"
    assert calls["n"] == 4
    assert no_sleep == [1.0, 2.0, 4.0] # Exponential backoff delays

#---
#Test 2
#---
def test_backoff_is_capped_by_max_delay(no_sleep, breaker_disabled):
    def always_fail():
        raise eh.RetryableError("nope")

    with pytest.raises(eh.RetryableError):
        eh.retry_with_backoff(
            always_fail,
            max_retries=4,
            base_delay=10.0,
            backoff_factor=3.0,  # 10, 30, 90, 270 -> cap at 100
            max_delay=100.0,
            jitter=0.0,
        )

    assert no_sleep == [10.0, 30.0, 90.0, 100.0]

#---
#Test 3
#---
def test_forced_wait_seconds_overrides_backoff(no_sleep, breaker_disabled):
    calls = {"n": 0}

    def forced_wait():
        calls["n"] += 1
        if calls["n"] == 1:
            # Force a 60s wait but caps it by max_delay
            raise eh.RetryableError("rate limited", wait_seconds=60)
        return "ok"

    out = eh.retry_with_backoff(
        forced_wait,
        max_retries=3,
        base_delay=1.0,
        backoff_factor=2.0,
        max_delay=30.0,  # cap applies even for forced waits
        jitter=0.0,
    )

    assert out == "ok"
    assert no_sleep == [30.0]

#---
#Test 4
#---
def test_circuit_opens_after_threshold_and_blocks_calls(no_sleep, fresh_breaker):
    def always_fail():
        raise eh.RetryableError("retryable failure")

    # Once the breaker opens, the NEXT loop iteration raises CircuitOpenError from before_call().
    with pytest.raises(eh.CircuitOpenError):
        eh.retry_with_backoff(
            always_fail,
            max_retries=10,
            base_delay=0.0,
            backoff_factor=1.0,
            max_delay=0.0,
            jitter=0.0,
        )

    assert fresh_breaker.state() == eh.CircuitState.OPEN

    ran = {"called": False}

    def should_not_run():
        ran["called"] = True
        return "nope"

    # Still OPEN --> blocked immediately
    with pytest.raises(eh.CircuitOpenError):
        eh.retry_with_backoff(
            should_not_run,
            max_retries=0,
            base_delay=0.0,
            backoff_factor=1.0,
            max_delay=0.0,
            jitter=0.0,
        )

    assert ran["called"] is False

#---
#Test 5
#---
def test_half_open_allows_trial_call_then_closes_on_success(monkeypatch, no_sleep, fresh_breaker):
    # 1) Opens the circuit
    with pytest.raises(eh.CircuitOpenError):
        eh.retry_with_backoff(
            lambda: (_ for _ in ()).throw(eh.RetryableError("fail")),
            max_retries=10,
            base_delay=0.0,
            backoff_factor=1.0,
            max_delay=0.0,
            jitter=0.0,
        )

    assert fresh_breaker.state() == eh.CircuitState.OPEN

    # 2) Move time beyond open_until so before_call() transitions OPEN -> HALF_OPEN
    monkeypatch.setattr(eh.time, "time", lambda: fresh_breaker._open_until + 0.001)

    # 3) One trial call succeeds -> circuit should close
    out = eh.retry_with_backoff(
        lambda: "ok",
        max_retries=0,
        base_delay=0.0,
        backoff_factor=1.0,
        max_delay=0.0,
        jitter=0.0,
    )

    assert out == "ok"
    assert fresh_breaker.state() == eh.CircuitState.CLOSED

#---
#Test 6
#---
def test_half_open_trial_limit_blocks_second_trial(monkeypatch, no_sleep, fresh_breaker):
    # 1) Opens circuit
    with pytest.raises(eh.CircuitOpenError):
        eh.retry_with_backoff(
            lambda: (_ for _ in ()).throw(eh.RetryableError("fail")),
            max_retries=10,
            base_delay=0.0,
            backoff_factor=1.0,
            max_delay=0.0,
            jitter=0.0,
        )

    # Stores time to tell when circuit is allowed to move from open to half open
    first_open_until = fresh_breaker._open_until

    # 2.) Fake clock: (manipulates the time)
    # Return just AFTER first_open_until (enter HALF_OPEN)
    t_after_first = first_open_until + 0.001
    fake_now = {"n": 0}

    def fake_time():
        fake_now["n"] += 1
        if fake_now["n"] == 1:
            return t_after_first
        return t_after_first

    monkeypatch.setattr(eh.time, "time", fake_time)

    # 3) First HALF_OPEN trial call fails and re-opens circuit with a new open_until
    with pytest.raises((eh.RetryableError, eh.CircuitOpenError)):
        eh.retry_with_backoff(
            lambda: (_ for _ in ()).throw(eh.RetryableError("fail again")),
            max_retries=0,
            base_delay=0.0,
            backoff_factor=1.0,
            max_delay=0.0,
            jitter=0.0,
        )

    # Circuit should be OPEN again with a new open_until in the future 
    assert fresh_breaker.state() == eh.CircuitState.OPEN
    assert fresh_breaker._open_until > t_after_first

    # 4) Should now be blocked because fake time is not past the new open_until
    with pytest.raises(eh.CircuitOpenError):
        eh.retry_with_backoff(
            lambda: "should not run",
            max_retries=0,
            base_delay=0.0,
            backoff_factor=1.0,
            max_delay=0.0,
            jitter=0.0,
        )
